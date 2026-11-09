// Import from a web page (docs/import-from-web-page-plan.md): opens a link
// the person typed, safely, and turns the page into plain text for the
// import parser. Server only (node:http, node:https, node:dns, node:zlib).
//
// The server must never be pointed at itself, the local network or a cloud
// metadata address. Every address a host name resolves to must be public, and
// the check runs inside the connection's own DNS lookup, so a host can't pass
// the check and then resolve somewhere else. IP literals skip DNS, so they are
// checked before connecting. Redirects are followed by hand and re-checked.
//
// No TypeScript-only syntax (enums, parameter properties): the address checks
// are run directly with Node's type stripping in tests.

import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';

export const PAGE_TIMEOUT_MS = 15_000;
export const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
// A page with less readable text than this is a login wall, a script-built
// page or an empty shell, not a trip document.
export const PAGE_MIN_TEXT_CHARS = 200;

export type PageErrorCode =
  | 'bad_url' | 'blocked' | 'unreachable' | 'needs_signin'
  | 'http_error' | 'too_large' | 'unsupported' | 'no_text';

export const PAGE_ERROR_STATUS: Record<PageErrorCode, number> = {
  bad_url: 400,
  blocked: 400,
  unreachable: 422,
  needs_signin: 422,
  http_error: 422,
  too_large: 422,
  unsupported: 422,
  no_text: 422,
};

export class PageFetchError extends Error {
  code: PageErrorCode;
  constructor(code: PageErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const MESSAGES: Record<Exclude<PageErrorCode, 'http_error'>, string> = {
  bad_url: 'Enter a full web address starting with https://',
  blocked: 'Helm can\'t open this address.',
  unreachable: 'Helm couldn\'t open this page. Check the address and try again.',
  needs_signin: 'This page needs you to sign in. Save it as PDF and import the file.',
  too_large: 'This page is too large to import.',
  unsupported: 'Helm can\'t import this kind of page.',
  no_text: 'No readable trip details found on this page. If it needs you to sign in, or only shows its content in a browser, save it as PDF and import the file.',
};

function fail(code: Exclude<PageErrorCode, 'http_error'>): never {
  throw new PageFetchError(code, MESSAGES[code]);
}

// ─── Address checks ───────────────────────────────────────────────────────────

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

function inV4(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],        // "this network"
  ['10.0.0.0', 8],       // private
  ['100.64.0.0', 10],    // carrier-grade NAT
  ['127.0.0.0', 8],      // loopback
  ['169.254.0.0', 16],   // link-local, incl. cloud metadata 169.254.169.254
  ['172.16.0.0', 12],    // private
  ['192.0.0.0', 24],     // IETF protocol assignments
  ['192.0.2.0', 24],     // documentation
  ['192.168.0.0', 16],   // private
  ['198.18.0.0', 15],    // benchmarking
  ['198.51.100.0', 24],  // documentation
  ['203.0.113.0', 24],   // documentation
  ['224.0.0.0', 4],      // multicast
  ['240.0.0.0', 4],      // reserved, incl. broadcast
];

/** Expands an IPv6 address to eight 16-bit groups, or null. */
function ipv6Groups(ip: string): number[] | null {
  let text = ip.toLowerCase();
  const zone = text.indexOf('%');
  if (zone !== -1) text = text.slice(0, zone);
  // A trailing dotted IPv4 part (::ffff:1.2.3.4) becomes two groups.
  const v4 = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    text = text.slice(0, -v4[1].length) + ((n >>> 16).toString(16)) + ':' + ((n & 0xffff).toString(16));
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

/** True only for an address on the public internet. */
export function isPublicAddress(address: string): boolean {
  const kind = net.isIP(address);
  if (kind === 4) return !BLOCKED_V4.some(([base, bits]) => inV4(address, base, bits));
  if (kind !== 6) return false;
  const g = ipv6Groups(address);
  if (!g) return false;
  // IPv4 inside IPv6: ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible).
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
    if (g[5] === 0 && g[6] === 0 && g[7] <= 1) return false; // :: and ::1
    return isPublicAddress(`${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`);
  }
  if (g[0] === 0x64 && g[1] === 0xff9b) { // NAT64 64:ff9b::/96 carries IPv4
    return isPublicAddress(`${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`);
  }
  if ((g[0] & 0xfe00) === 0xfc00) return false;   // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return false;   // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return false;   // fec0::/10 site-local (old)
  if ((g[0] & 0xff00) === 0xff00) return false;   // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  if (g[0] === 0x2002) return false;              // 6to4 can carry private IPv4
  if (g[0] === 0x0100 && g.slice(1, 4).every((x) => x === 0)) return false; // discard-only
  return true;
}

/** Checks a typed link before anything is fetched. */
export function checkPageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    fail('bad_url');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('bad_url');
  if (!url.hostname || url.username || url.password) fail('bad_url');
  if (url.port && url.port !== '80' && url.port !== '443') fail('blocked');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (!isPublicAddress(host)) fail('blocked');
  } else {
    // A host name needs a dot (no "localhost", no bare intranet names).
    const lower = host.toLowerCase().replace(/\.$/, '');
    if (!lower.includes('.') || lower.endsWith('.localhost') || lower.endsWith('.local') || lower.endsWith('.internal')) {
      fail('blocked');
    }
  }
  return url;
}

class BlockedAddressError extends Error {}

type LookupAddress = { address: string; family: number };

// Used as the connection's DNS lookup, so the address that is checked is the
// address that is connected to.
function safeLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  dns.lookup(hostname, { all: true, family: options?.family ?? 0 }, (err, addresses) => {
    if (err) return callback(err, '');
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => !isPublicAddress(a.address))) {
      return callback(new BlockedAddressError(`${hostname} resolves to a non-public address`), '');
    }
    if (options?.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function requestOnce(url: URL, deadline: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new PageFetchError('unreachable', MESSAGES.unreachable));
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, {
      method: 'GET',
      lookup: safeLookup as unknown as net.LookupFunction,
      headers: {
        'User-Agent': 'Helm trip import (+https://helm-gilt.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.9,*/*;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en',
      },
    });
    const timer = setTimeout(() => req.destroy(new PageFetchError('unreachable', MESSAGES.unreachable)), remaining);
    req.on('response', (res) => {
      const status = res.statusCode ?? 0;
      // Redirects: the body isn't needed.
      if (status >= 300 && status < 400) {
        res.resume();
        clearTimeout(timer);
        return resolve({ status, headers: res.headers, body: Buffer.alloc(0) });
      }
      const declared = Number(res.headers['content-length']);
      if (Number.isFinite(declared) && declared > PAGE_MAX_BYTES) {
        clearTimeout(timer);
        req.destroy();
        return reject(new PageFetchError('too_large', MESSAGES.too_large));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > PAGE_MAX_BYTES) {
          clearTimeout(timer);
          req.destroy(new PageFetchError('too_large', MESSAGES.too_large));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        clearTimeout(timer);
        resolve({ status, headers: res.headers, body: Buffer.concat(chunks) });
      });
      res.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      if (err instanceof PageFetchError) return reject(err);
      if (err instanceof BlockedAddressError) return reject(new PageFetchError('blocked', MESSAGES.blocked));
      reject(new PageFetchError('unreachable', MESSAGES.unreachable));
    });
    req.end();
  });
}

function decompress(body: Buffer, encoding: string | undefined): Buffer {
  const enc = (encoding ?? '').toLowerCase().trim();
  const opts = { maxOutputLength: PAGE_MAX_BYTES * 4 };
  try {
    if (enc === 'gzip' || enc === 'x-gzip') return zlib.gunzipSync(body, opts);
    if (enc === 'deflate') return zlib.inflateSync(body, opts);
    if (enc === 'br') return zlib.brotliDecompressSync(body, opts);
  } catch (err) {
    if (err instanceof RangeError) fail('too_large');
    fail('unreachable');
  }
  return body;
}

function decodeText(body: Buffer, contentType: string): string {
  const charset = contentType.match(/charset=["']?([\w-]+)/i)?.[1]
    ?? body.subarray(0, 2048).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
    ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder('utf-8').decode(body);
  }
}

export type FetchedPage =
  | { kind: 'text'; text: string; finalUrl: string }
  | { kind: 'pdf'; data: Buffer; finalUrl: string };

/** Opens a typed link and returns its text (HTML or plain) or PDF bytes. */
export async function fetchPage(raw: string): Promise<FetchedPage> {
  let url = checkPageUrl(raw);
  const deadline = Date.now() + PAGE_TIMEOUT_MS;

  for (let hop = 0; ; hop++) {
    const res = await requestOnce(url, deadline);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.location;
      if (!location || hop >= MAX_REDIRECTS) fail('unreachable');
      url = checkPageUrl(new URL(location, url).href);
      continue;
    }
    if (res.status === 401 || res.status === 403) fail('needs_signin');
    if (res.status < 200 || res.status >= 300) {
      throw new PageFetchError('http_error', `The page returned an error (HTTP ${res.status}).`);
    }

    const body = decompress(res.body, res.headers['content-encoding'] as string | undefined);
    const contentType = String(res.headers['content-type'] ?? '').toLowerCase();
    const finalUrl = url.href;
    const isPdf = contentType.includes('application/pdf') || (!contentType && body.subarray(0, 5).toString('latin1') === '%PDF-');
    if (isPdf) return { kind: 'pdf', data: body, finalUrl };

    const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml')
      || (!contentType && /<html[\s>]/i.test(body.subarray(0, 4096).toString('latin1')));
    if (isHtml) {
      const text = htmlToText(decodeText(body, contentType));
      if (text.length < PAGE_MIN_TEXT_CHARS) fail('no_text');
      return { kind: 'text', text, finalUrl };
    }
    if (contentType.startsWith('text/plain')) {
      const text = decodeText(body, contentType).trim();
      if (text.length < PAGE_MIN_TEXT_CHARS) fail('no_text');
      return { kind: 'text', text, finalUrl };
    }
    fail('unsupported');
  }
}

// ─── HTML to text ─────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  bull: '•', middot: '·', deg: '°', copy: '©', reg: '®', trade: '™', times: '×',
  euro: '€', pound: '£', yen: '¥', cent: '¢', frac12: '½', frac14: '¼', frac34: '¾',
  eacute: 'é', egrave: 'è', ecirc: 'ê', aacute: 'á', agrave: 'à', acirc: 'â', ccedil: 'ç',
  iacute: 'í', oacute: 'ó', ocirc: 'ô', uacute: 'ú', uuml: 'ü', ouml: 'ö', auml: 'ä',
  ntilde: 'ñ', szlig: 'ß', Eacute: 'É', rarr: '→', larr: '←', minus: '−', shy: '',
  zwj: '', zwnj: '', thinsp: ' ', ensp: ' ', emsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body] ?? ENTITIES[body.toLowerCase()] ?? match;
  });
}

const BLOCK_TAGS = 'p|div|section|article|header|footer|main|aside|nav|ul|ol|dl|dt|dd|table|thead|tbody|tfoot|tr|blockquote|pre|address|figure|figcaption|form|fieldset|h[1-6]|hr';

/** Turns a page's HTML into readable plain text, keeping link addresses. */
export function htmlToText(html: string): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head|object|canvas)\b[\s\S]*?<\/\1\s*>/gi, ' ');

  // Links keep their address when it says something the text doesn't.
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (_m, attrs: string, inner: string) => {
    const href = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const link = decodeEntities((href?.[1] ?? href?.[2] ?? href?.[3] ?? '').trim());
    const text = inner.replace(/<[^>]+>/g, ' ');
    if (!/^https?:\/\//i.test(link)) return text;
    const plain = decodeEntities(text).replace(/\s+/g, ' ').trim();
    if (!plain) return ` ${link} `;
    return plain.includes(link) ? text : `${text} (${link})`;
  });

  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/t[dh]\s*>/gi, ' | ')
    .replace(new RegExp(`<\\/?(?:${BLOCK_TAGS}|li)\\b[^>]*>`, 'gi'), '\n')
    .replace(/<[^>]+>/g, ' ');

  s = decodeEntities(s).replace(/ /g, ' ');

  return s
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim().replace(/(?:\s*\|\s*)+$/, '').replace(/^\|\s*/, ''))
    .filter((line, i, lines) => line !== '' || (i > 0 && lines[i - 1] !== ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
