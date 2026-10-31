// The record types that can be edited offline, and how their API URLs look:
//   list and create: /api/trips/{tripId}/{collection}
//   update and delete: /api/{collection}/{id}

export const COLLECTIONS = [
  'checklist', 'checklist-groups', 'flights', 'hotels',
  'itinerary/days', 'itinerary/rows', 'key-info', 'key-info-groups',
  'packing', 'packing-groups', 'packing-subgroups', 'restaurants',
  'transportation',
] as const;

export type Collection = typeof COLLECTIONS[number];

// Flights wrap their data: GET { flights: [...] }, POST/PATCH { flight }.
const ENVELOPES: Partial<Record<Collection, { list: string; item: string }>> = {
  flights: { list: 'flights', item: 'flight' },
};

export const COLLECTION_LABELS: Record<Collection, string> = {
  'checklist': 'Checklist item',
  'checklist-groups': 'Checklist group',
  'flights': 'Flight',
  'hotels': 'Hotel',
  'itinerary/days': 'Itinerary day',
  'itinerary/rows': 'Itinerary item',
  'key-info': 'Key Info item',
  'key-info-groups': 'Key Info group',
  'packing': 'Packing item',
  'packing-groups': 'Packing group',
  'packing-subgroups': 'Packing subgroup',
  'restaurants': 'Restaurant',
  'transportation': 'Transfer',
};

// Fields that name a record in the sync lists, first one present wins.
const NAME_FIELDS = ['title', 'name', 'task', 'label', 'item', 'flight_number', 'display_label', 'day_date'];

export type ApiTarget =
  | { kind: 'list'; collection: Collection; tripId: string }
  | { kind: 'item'; collection: Collection; id: string };

const alternatives = [...COLLECTIONS]
  .sort((a, b) => b.length - a.length)
  .map((c) => c.replace('/', '\\/'))
  .join('|');
const LIST_RE = new RegExp(`^/api/trips/([^/]+)/(${alternatives})$`);
const ITEM_RE = new RegExp(`^/api/(${alternatives})/([^/]+)$`);

export function parseApiUrl(url: string): ApiTarget | null {
  let path: string;
  try { path = new URL(url, 'http://helm.invalid').pathname; } catch { return null; }
  const list = LIST_RE.exec(path);
  if (list) return { kind: 'list', tripId: list[1], collection: list[2] as Collection };
  const item = ITEM_RE.exec(path);
  if (item) return { kind: 'item', collection: item[1] as Collection, id: item[2] };
  return null;
}

export type OfflineRecord = Record<string, unknown> & { id: string };

export function unwrapList(collection: Collection, json: unknown): OfflineRecord[] | null {
  const key = ENVELOPES[collection]?.list;
  const value = key ? (json as Record<string, unknown> | null)?.[key] : json;
  return Array.isArray(value) ? (value as OfflineRecord[]) : null;
}

export function unwrapItem(collection: Collection, json: unknown): OfflineRecord | null {
  const key = ENVELOPES[collection]?.item;
  const value = key ? (json as Record<string, unknown> | null)?.[key] : json;
  return value && typeof value === 'object' && typeof (value as OfflineRecord).id === 'string'
    ? (value as OfflineRecord)
    : null;
}

export function wrapList(collection: Collection, records: OfflineRecord[]): unknown {
  const key = ENVELOPES[collection]?.list;
  return key ? { [key]: records } : records;
}

export function wrapItem(collection: Collection, record: OfflineRecord): unknown {
  const key = ENVELOPES[collection]?.item;
  return key ? { [key]: record } : record;
}

export function recordName(record: Record<string, unknown> | null | undefined): string {
  for (const field of NAME_FIELDS) {
    const value = record?.[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
