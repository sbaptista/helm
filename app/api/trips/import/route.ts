import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'edge';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a travel itinerary parser for Helm, a travel advisor platform.

You will receive the text of a travel document and the trip's departure and return dates. Your task is to map its contents to the Helm schema and return ONLY a valid JSON object — no explanation, no markdown, no code fences.

The JSON object must have these top-level keys, each containing an array:

- itinerary_days: { day_number, date, title, location, description }
- itinerary_rows: { day_number, time, end_time, title, description, location, type } — type is one of: activity, meal, transport, accommodation, other
- flights: { flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, confirmation_code, notes }
- hotels: { name, location, address, city, check_in_date, check_out_date, confirmation_code, phone, notes }
- transportation: { type, description, departure_location, arrival_location, departure_time, arrival_time, confirmation_code, notes }
- restaurants: { name, location, address, city, date, time, confirmation_code, type, notes } — type is one of: included, independent
- checklist_items: { title, category, time_horizon } — time_horizon is one of: before_trip, during_trip, after_trip
- packing_items: { name, category, quantity }
- key_info: { category, label, value, url, is_urgent }
- unmapped: array of strings — any data found that does not fit the sections above
- flags: array of flag objects — items that need advisor review

Flag rules:
- Every flag MUST include: field (dot-notation path, e.g. "transportation.departure_time") and issue (plain English description of the problem).
- Include proposed ONLY when you have a specific replacement value. proposed must be the corrected value itself — not advice, not a suggestion, not a question.
- Omit proposed entirely when you do not have a concrete correction. Never include proposed with explanatory text.

Example flag with proposed value:
{ "field": "transportation.departure_time", "issue": "Time extracted as September but trip departs October 3", "proposed": "2026-10-03T08:00:00" }

Example flag without proposed value:
{ "field": "flights.confirmation_code", "issue": "Confirmation code not found in document" }

Date and time rules:
- Use the trip departure and return dates provided in the user message to anchor any ambiguous or missing dates. Do not guess months or years.
- Dates must be ISO 8601 (YYYY-MM-DD). Times must be HH:MM (24h).
- Return ONLY the JSON object. No other text.`;

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('file');
  const tripId = formData.get('tripId');

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (typeof tripId !== 'string' || !tripId) {
    return Response.json({ error: 'tripId is required.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  let extractedText: string;

  try {
    if (name.endsWith('.pdf')) {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      extractedText = textResult.text;
    } else if (
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.json')
    ) {
      extractedText = buffer.toString('utf-8');
    } else if (name.endsWith('.docx')) {
      // Basic extraction: scan for printable ASCII sequences (strings-command approach).
      // TODO: replace with mammoth for proper DOCX support.
      const chunks: string[] = [];
      let current = '';
      for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if (byte >= 32 && byte < 127) {
          current += String.fromCharCode(byte);
        } else {
          if (current.length > 5) chunks.push(current);
          current = '';
        }
      }
      if (current.length > 5) chunks.push(current);
      extractedText = chunks.join(' ');
    } else {
      return Response.json(
        { error: 'Unsupported file type. Please upload a PDF, Word (.docx), or text file.' },
        { status: 400 },
      );
    }
  } catch {
    return Response.json({ error: 'Failed to extract text from file.' }, { status: 422 });
  }

  if (!extractedText.trim()) {
    return Response.json({ error: 'No readable text found in the file.' }, { status: 422 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not set.' }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });

  const responseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 32000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Parse this travel document:\n\n${extractedText.slice(0, 80000)}`,
            },
          ],
        });

        stream.on('text', (text) => {
          controller.enqueue(encoder.encode(text));
        });

        const message = await stream.finalMessage();
        console.log('[import] Claude stop_reason:', message.stop_reason, 'content types:', message.content.map((b) => b.type).join(', '));

        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[import] Claude API error:', err);
        controller.error(new Error(msg));
      }
    },
  });

  return new Response(responseStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
