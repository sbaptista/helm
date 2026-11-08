// Well-formed web links (docs/links-and-map-tiles-plan.md §1).

// http or https, with a host name that has a dot (or is localhost).
export function isWellFormedUrl(value: string | null | undefined): value is string {
  if (!value) return false
  const text = value.trim()
  if (!/^https?:\/\//i.test(text)) return false
  try {
    const url = new URL(text)
    return url.hostname.includes('.') || url.hostname === 'localhost'
  } catch {
    return false
  }
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi
// Punctuation that usually ends a sentence rather than a link.
const TRAILING = /[.,;:!?)\]]+$/

// Splits text into plain parts and links.
export function splitLinks(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = []
  let last = 0
  for (const match of text.matchAll(URL_IN_TEXT)) {
    let found = match[0]
    const trail = found.match(TRAILING)?.[0] ?? ''
    if (trail) found = found.slice(0, -trail.length)
    const start = match.index ?? 0
    if (!isWellFormedUrl(found)) continue
    if (start > last) parts.push({ text: text.slice(last, start) })
    parts.push({ text: found, href: found })
    last = start + found.length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
