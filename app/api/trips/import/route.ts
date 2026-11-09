import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { requireTripMember } from '@/lib/auth/trip-access';
import {
  DEV_IMPORT_ERROR_CODES,
  IMPORT_ERROR_MESSAGES,
  IMPORT_STREAM_ERROR_MARKER,
  type ImportErrorCode,
} from '@/lib/import/errors';
import { fetchPage, PAGE_ERROR_STATUS, PageFetchError } from '@/lib/import/fetch-page';

// Node, not Edge: pdf-parse and mammoth need Node APIs. The response streams,
// so a long document isn't cut off by a request timeout.
export const runtime = 'nodejs';
export const maxDuration = 300;

const MODEL = 'claude-sonnet-5-5';
const MAX_INPUT_CHARS = 200000;

const SYSTEM_PROMPT = `You are a travel itinerary parser for Helm, a travel advisor platform.

You will receive the text of a travel document and the trip's departure and return dates. The text may come from a web page: ignore site navigation, menus, cookie notices, advertising and footers, and use only the trip's details. Your task is to map its contents to the Helm schema and return ONLY a valid JSON object — no explanation, no markdown, no code fences.

The JSON object must have these top-level keys, each containing an array:

- itinerary_days: { day_number, date, title, location, description } — day_number only links rows to their day
- itinerary_rows: { day_number, time, end_time, title, description, location, type } — type is one of: activity, meal, transport, accommodation, other
  Do NOT put flights, hotel check-ins or check-outs, restaurant reservations or transfers in itinerary_rows. Put them only in flights, hotels, restaurants and transportation; Helm lists those in the itinerary itself.
- flights: { flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, confirmation_code, notes }
- hotels: { name, location, address, city, check_in_date, check_out_date, confirmation_code, phone, website_url, notes }
- transportation: { type, description, departure_location, arrival_location, departure_time, arrival_time, confirmation_code, website_url, notes }
- restaurants: { name, location, address, city, date, time, confirmation_code, type, website_url, notes } — type is one of: included, independent
  website_url (hotels, transportation, restaurants): the place's or operator's own website, a full https:// address, only when the document shows it. Never invent or guess one, and never use a map link. Put a record's website here, not in notes.
- checklist_items: { task, group, due_date, notes } — task is the thing to do; group is a short heading such as "Documents" or "Before departure" (optional); due_date only when the document gives one
- packing_items: { item, category, sub_group } — item is what to pack; category is a heading such as "Clothing" or "Documents"; sub_group is optional
- key_info: { category, label, value, url, is_urgent }
- unmapped: array of strings — any data found that does not fit the sections above
- flags: array of flag objects — items that need advisor review

Flag rules:
- Every flag MUST include: field (dot-notation path, e.g. "transportation[0].departure_time") and issue (plain English description of the problem).
- Include proposed ONLY when you have a specific replacement value. proposed must be the corrected value itself — not advice, not a suggestion, not a question.
- Omit proposed entirely when you do not have a concrete correction. Never include proposed with explanatory text.

Example flag with proposed value:
{ "field": "transportation[0].departure_time", "issue": "Time extracted as September but trip departs October 3", "proposed": "2026-10-03T08:00:00" }

Example flag without proposed value:
{ "field": "flights[0].confirmation_code", "issue": "Confirmation code not found in document" }

Date and time rules:
- Use the trip departure and return dates provided in the user message to anchor any ambiguous or missing dates. Do not guess months or years.
- Dates must be ISO 8601 (YYYY-MM-DD). Times must be HH:MM (24h).
- Return ONLY the JSON object. No other text.`;

// ─── AI errors ────────────────────────────────────────────────────────────────

function errorType(err: unknown): string | undefined {
  const e = err as { type?: unknown; error?: { type?: unknown; error?: { type?: unknown } } };
  const t = e?.type ?? e?.error?.error?.type ?? e?.error?.type;
  return typeof t === 'string' ? t : undefined;
}

// Classify a Claude API failure (before or during the stream).
function classifyAiError(err: unknown): ImportErrorCode {
  if (err instanceof Anthropic.APIConnectionError) return 'ai_busy';
  const type = errorType(err);
  const status = err instanceof Anthropic.APIError ? err.status : undefined;
  const message = err instanceof Error ? err.message : String(err);
  // Out of credit arrives as 402 billing_error or as a 400 whose message names
  // the credit balance (as Orb handles it, ORB-228).
  if (status === 402 || type === 'billing_error' || /credit balance|billing/i.test(message)) return 'ai_credits';
  if (status === 401 || status === 403 || type === 'authentication_error' || type === 'permission_error') {
    return 'ai_not_configured';
  }
  if (status === 429 || status === 503 || status === 529 || type === 'rate_limit_error' || type === 'overloaded_error') {
    return 'ai_busy';
  }
  return 'ai_error';
}

function errorResponse(code: ImportErrorCode, status: number): Response {
  return Response.json({ error: IMPORT_ERROR_MESSAGES[code], code }, { status });
}

const STATUS_FOR_CODE: Record<ImportErrorCode, number> = {
  ai_credits: 402,
  ai_busy: 503,
  ai_not_configured: 503,
  ai_too_long: 422,
  ai_error: 502,
  connection: 503,
};

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractText(file: File): Promise<string | Response> {
  return extractFromBuffer(Buffer.from(await file.arrayBuffer()), file.name);
}

async function extractFromBuffer(buffer: Buffer, fileName: string): Promise<string | Response> {
  const name = fileName.toLowerCase();
  try {
    if (name.endsWith('.pdf')) {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      return textResult.text;
    }
    if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json')) {
      return buffer.toString('utf-8');
    }
    return Response.json(
      { error: 'Unsupported file type. Please upload a PDF, Word (.docx), or text file.' },
      { status: 400 },
    );
  } catch (error) {
    await logger.error('api/import', 'Failed to extract text from file', {
      error: error instanceof Error ? error.message : String(error), fileName,
    });
    return Response.json({ error: 'Failed to read text from this file.' }, { status: 422 });
  }
}

// ─── Web page ─────────────────────────────────────────────────────────────────

// Import from a web page (docs/import-from-web-page-plan.md). Expected
// refusals (bad or private address, 404, sign-in, too large) are answered
// with their message and not logged; anything else is logged with the host
// only, since a full link can carry tokens.
async function extractFromUrl(link: string, tripId: string): Promise<{ text: string } | Response> {
  try {
    const page = await fetchPage(link);
    if (page.kind === 'pdf') {
      const text = await extractFromBuffer(page.data, 'page.pdf');
      return text instanceof Response ? text : { text };
    }
    return { text: `Source: web page ${page.finalUrl}\n\n${page.text}` };
  } catch (error) {
    if (error instanceof PageFetchError) {
      return Response.json({ error: error.message, pageError: error.code }, { status: PAGE_ERROR_STATUS[error.code] });
    }
    let host: string | null = null;
    try { host = new URL(link).hostname; } catch {}
    await logger.error('api/import', 'Failed to read web page', {
      error: error instanceof Error ? error.message : String(error), host,
    }, tripId);
    return Response.json({ error: 'Helm couldn\'t open this page. Check the address and try again.' }, { status: 422 });
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  const pageUrl = formData.get('url');
  const tripId = formData.get('tripId');
  const departureDate = formData.get('departureDate');
  const returnDate = formData.get('returnDate');

  const hasFile = file instanceof File;
  const hasUrl = typeof pageUrl === 'string' && pageUrl.trim() !== '';
  if (hasFile === hasUrl) {
    return Response.json({ error: 'Choose a file or enter a web page address.' }, { status: 400 });
  }
  if (typeof tripId !== 'string' || !tripId) {
    return Response.json({ error: 'tripId is required.' }, { status: 400 });
  }

  const access = await requireTripMember(tripId, { role: 'advisor' });
  if ('response' in access) return access.response;

  // DEV panel: fail as the AI service would, without calling Claude.
  const devError = formData.get('devAiError');
  if (
    process.env.NODE_ENV === 'development'
    && typeof devError === 'string'
    && (DEV_IMPORT_ERROR_CODES as readonly string[]).includes(devError)
  ) {
    const code = devError as ImportErrorCode;
    await logger.error('api/import', `Simulated AI error (${code})`, { code, simulated: true }, tripId);
    return errorResponse(code, STATUS_FOR_CODE[code]);
  }

  let extracted: string;
  if (hasUrl) {
    const page = await extractFromUrl(pageUrl as string, tripId);
    if (page instanceof Response) return page;
    extracted = page.text;
  } else {
    const text = await extractText(file as File);
    if (text instanceof Response) return text;
    extracted = text;
  }
  if (!extracted.trim()) {
    return Response.json({ error: hasUrl ? 'No readable text found on this page.' : 'No readable text found in the file.' }, { status: 422 });
  }
  // Too long to send whole: say so rather than import part of it.
  if (extracted.length > MAX_INPUT_CHARS) {
    return errorResponse('ai_too_long', STATUS_FOR_CODE.ai_too_long);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await logger.error('api/import', 'ANTHROPIC_API_KEY is not set', { code: 'ai_not_configured' }, tripId);
    return errorResponse('ai_not_configured', STATUS_FOR_CODE.ai_not_configured);
  }

  const anthropic = new Anthropic({ apiKey });

  // Wait for Claude to accept the request before answering, so a refusal
  // (credits, key, busy) comes back as JSON with a status and a code.
  let stream: AsyncIterable<Anthropic.MessageStreamEvent>;
  try {
    stream = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 64000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Trip dates: departure ${departureDate || 'unknown'}, return ${returnDate || 'unknown'}.\n\nParse this travel document:\n\n${extracted}`,
        },
      ],
    });
  } catch (error) {
    const code = classifyAiError(error);
    await logger.error('api/import', `Claude request failed (${code})`, {
      code,
      status: error instanceof Anthropic.APIError ? error.status ?? null : null,
      type: errorType(error) ?? null,
      error: error instanceof Error ? error.message : String(error),
    }, tripId);
    return errorResponse(code, STATUS_FOR_CODE[code]);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const fail = async (code: ImportErrorCode, detail: Record<string, unknown>) => {
        await logger.error('api/import', `Claude stream ended with an error (${code})`, { code, ...detail }, tripId);
        controller.enqueue(encoder.encode(`\n${IMPORT_STREAM_ERROR_MARKER}${JSON.stringify({ code })}`));
        controller.close();
      };
      try {
        let stopReason: string | null = null;
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === 'message_delta') {
            stopReason = event.delta.stop_reason ?? stopReason;
          }
        }
        if (stopReason === 'max_tokens') {
          await fail('ai_too_long', { stopReason, inputChars: extracted.length });
          return;
        }
        if (stopReason === 'refusal') {
          await fail('ai_error', { stopReason });
          return;
        }
        controller.close();
      } catch (error) {
        await fail(classifyAiError(error), {
          status: error instanceof Anthropic.APIError ? error.status ?? null : null,
          type: errorType(error) ?? null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // The text sent to Claude: a web page has no size the browser knows, so
      // its progress bar uses this.
      'X-Import-Input-Chars': String(extracted.length),
    },
  });
}
