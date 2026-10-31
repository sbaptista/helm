'use client';

import {
  COLLECTION_LABELS, parseApiUrl, recordName, unwrapItem, unwrapList, wrapItem, wrapList,
  type Collection, type OfflineRecord,
} from '@/lib/offline/collections';
import { confirmOnline, isOnline, setOnline } from '@/lib/offline/status';
import {
  enqueue, findTripId, getOutbox, opsFor, readList, readRecord, setSnapshot,
  snapshotRemove, snapshotUpsert, type OutboxOp,
} from '@/lib/offline/store';
import { flushOutbox } from '@/lib/offline/sync';
import { normalizeZonedDateTime } from '@/lib/zoned-time';

// Drop-in replacement for fetch() in the sections (docs/offline-editing-plan.md
// §3). Online, it sends the request as before and keeps the device copy of
// the records current. Offline, or while earlier changes are still waiting,
// it saves the change on the device, queues it, and answers the way the
// server would, so the section behaves as if the save succeeded.

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function needsConnection(): Response {
  return json({ error: "This needs a connection. You're offline." }, 503);
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function parseBody(init?: RequestInit): Record<string, unknown> | null {
  if (typeof init?.body !== 'string') return null;
  try {
    const value = JSON.parse(init.body);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function newId(): string {
  return crypto.randomUUID();
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = urlOf(input);
  const method = (init?.method ?? 'GET').toUpperCase();
  const target = parseApiUrl(url);

  // Not an offline-capable record type (import, Calendar, trip settings…).
  if (!target) {
    if (method !== 'GET' && !isOnline()) return needsConnection();
    return fetch(input, init);
  }

  if (method === 'GET') {
    if (target.kind !== 'list') return fetch(input, init);
    return getList(target.collection, target.tripId, input, init);
  }

  if (method !== 'POST' && method !== 'PATCH' && method !== 'DELETE') return fetch(input, init);
  if (method === 'POST' && target.kind !== 'list') return fetch(input, init);
  if (method !== 'POST' && target.kind !== 'item') return fetch(input, init);

  // A create always carries its own id, so sending it again after a lost
  // reply can never make a second record.
  let body = parseBody(init);
  if (method === 'POST') {
    body = { ...(body ?? {}) };
    if (typeof body.id !== 'string') body.id = newId();
    init = { ...init, body: JSON.stringify(body) };
  }

  const collection = target.collection;
  const tripId = target.kind === 'list' ? target.tripId : findTripId(collection, target.id);
  const recordId = target.kind === 'list' ? (body?.id as string) : target.id;

  // Online with nothing waiting: send it now. (Changes that failed don't
  // hold up new ones; they wait in the failed list.)
  if (isOnline() && getOutbox().every((o) => o.status !== 'pending')) {
    try {
      const res = await fetch(input, init);
      if (res.ok) {
        if (tripId) await keepCopy(collection, tripId, method, recordId, res);
        return res;
      }
      if (res.status < 500 || (await confirmOnline())) return res;
    } catch {
      setOnline(false);
    }
  }

  if (!tripId) return needsConnection(); // a record this device has never seen
  return queue({ collection, tripId, recordId, method, url, body });
}

async function getList(collection: Collection, tripId: string, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isOnline()) {
    try {
      const res = await fetch(input, init);
      if (!res.ok) return res;
      const records = unwrapList(collection, await res.clone().json());
      if (records) setSnapshot(collection, tripId, records);
      // Changes still waiting to be sent are shown on top of the server's list.
      if (records && opsFor(collection, tripId).length > 0) {
        return json(wrapList(collection, readList(collection, tripId) ?? records));
      }
      return res;
    } catch {
      setOnline(false);
    }
  }
  const list = readList(collection, tripId);
  return list ? json(wrapList(collection, list)) : needsConnection();
}

async function keepCopy(collection: Collection, tripId: string, method: string, recordId: string, res: Response): Promise<void> {
  if (method === 'DELETE') {
    snapshotRemove(collection, tripId, recordId);
    return;
  }
  try {
    const record = unwrapItem(collection, await res.clone().json());
    if (record) snapshotUpsert(collection, tripId, record);
  } catch {}
}

function queue(args: {
  collection: Collection;
  tripId: string;
  recordId: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body: Record<string, unknown> | null;
}): Response {
  const { collection, tripId, recordId, method, url, body } = args;
  const current = readRecord(collection, tripId, recordId);
  const now = new Date().toISOString();

  let record: OfflineRecord | null = null;
  let sendBody = body ? { ...body } : null;
  // Flight times are stored as instants, as the server does on save, so the
  // list shows them correctly before the change is sent.
  if (collection === 'flights' && sendBody) {
    for (const [time, zone] of [['departure_time', 'departure_timezone'], ['arrival_time', 'arrival_timezone']]) {
      if (time in sendBody) sendBody[time] = normalizeZonedDateTime(sendBody[time], sendBody[zone] ?? current?.[zone]);
    }
  }
  if (method === 'POST') {
    sendBody = { ...sendBody };
    // Groups get their place at the end, as the server does.
    if (collection.endsWith('groups') && sendBody.sort_order === undefined) {
      const orders = (readList(collection, tripId) ?? []).map((r) => Number(r.sort_order) || 0);
      sendBody.sort_order = orders.length ? Math.max(...orders) + 1 : 0;
    }
    record = { created_at: now, deleted_at: null, ...sendBody, id: recordId, trip_id: tripId, updated_at: now };
  } else if (method === 'PATCH') {
    record = { ...(current ?? { id: recordId }), ...sendBody, id: recordId, updated_at: now };
  }

  const op: OutboxOp = {
    id: newId(),
    collection,
    tripId,
    recordId,
    method,
    url,
    body: method === 'DELETE' ? null : sendBody,
    base: method === 'PATCH' ? current : null,
    label: `${COLLECTION_LABELS[collection]}${recordName(record ?? current) ? ` "${recordName(record ?? current)}"` : ''}`,
    at: Date.now(),
    status: 'pending',
  };
  enqueue(op);
  // Online but behind earlier changes: send them all, in order.
  if (isOnline()) void flushOutbox();

  if (method === 'DELETE') return json({ success: true });
  return json(wrapItem(collection, record!), method === 'POST' ? 201 : 200);
}
