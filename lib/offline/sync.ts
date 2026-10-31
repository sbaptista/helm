'use client';

import { unwrapItem, unwrapList, type Collection, type OfflineRecord } from '@/lib/offline/collections';
import { confirmOnline, isOnline, setOnline } from '@/lib/offline/status';
import {
  addConflict, announceOfflineData, getOutbox, removeOp, setSnapshot, setSyncing,
  snapshotRemove, snapshotUpsert, updateOp, type OutboxOp,
} from '@/lib/offline/store';

// Sends the outbox, oldest first, one change at a time
// (docs/offline-editing-plan.md §3, §5). Runs when Helm comes back online,
// when it is opened or shown, and after a change is queued while online.

let running: Promise<boolean> | null = null;

// Resolves true when the outbox is empty afterwards.
export function flushOutbox(): Promise<boolean> {
  if (!running) running = run().finally(() => { running = null; });
  return running;
}

// ─── Comparing values ────────────────────────────────────────────────────────

function blank(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

// Loose: the form and the server can write the same value differently
// (null vs '', 10:00 vs 10:00:00, numbers as strings).
function same(a: unknown, b: unknown): boolean {
  if (blank(a) && blank(b)) return true;
  if (typeof a === 'string' && typeof b === 'string') {
    if (a === b) return true;
    const da = Date.parse(a), db = Date.parse(b);
    if (!Number.isNaN(da) && !Number.isNaN(db) && /\d{4}-\d{2}-\d{2}/.test(a) && /\d{4}-\d{2}-\d{2}/.test(b)) {
      return da === db;
    }
    return a.replace(/:00$/, '') === b.replace(/:00$/, '');
  }
  if ((typeof a === 'number' || typeof b === 'number') && !blank(a) && !blank(b)) return Number(a) === Number(b);
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── Server copies, read once per sync ───────────────────────────────────────

type ServerLists = Map<string, OfflineRecord[]>;

async function serverList(lists: ServerLists, collection: Collection, tripId: string): Promise<OfflineRecord[] | undefined> {
  const key = `${collection}|${tripId}`;
  const cached = lists.get(key);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/trips/${tripId}/${collection}`, { cache: 'no-store' });
    if (!res.ok) return undefined;
    const records = unwrapList(collection, await res.json());
    if (!records) return undefined;
    lists.set(key, records);
    return records;
  } catch {
    setOnline(false);
    return undefined;
  }
}

// Field by field: changes only one side made are both kept; a field both
// changed goes to the later edit, and the other value is recorded as a
// sync conflict, restorable from Logs.
function resolve(op: OutboxOp, current: OfflineRecord): Record<string, unknown> {
  const body = { ...(op.body ?? {}) };
  const base: Record<string, unknown> = op.base ?? {};
  const theirsAt = Date.parse(String(current.updated_at ?? ''));
  const theirsLater = !Number.isNaN(theirsAt) && theirsAt > op.at;

  for (const field of Object.keys(body)) {
    if (!(field in base) || !(field in current)) continue;
    const mine = body[field], before = base[field], theirs = current[field];
    if (same(theirs, before) || same(mine, theirs)) continue; // only I changed it, or we agree
    if (same(mine, before)) { body[field] = theirs; continue; } // only they changed it
    // Both changed it.
    const conflict = { id: crypto.randomUUID(), collection: op.collection, tripId: op.tripId, recordId: op.recordId, label: op.label, field, at: Date.now() };
    if (theirsLater) {
      body[field] = theirs;
      addConflict({ ...conflict, replaced: mine, kept: theirs });
    } else {
      addConflict({ ...conflict, replaced: theirs, kept: mine });
    }
  }
  return body;
}

// ─── The run ─────────────────────────────────────────────────────────────────

async function run(): Promise<boolean> {
  if (getOutbox().every((o) => o.status !== 'pending')) return getOutbox().length === 0;
  setSyncing(true);
  const lists: ServerLists = new Map();
  const touched = new Set<string>();
  try {
    for (const op of getOutbox()) {
      if (op.status !== 'pending') continue;
      if (!isOnline()) break;
      const outcome = await send(op, lists);
      if (outcome === 'offline') break;
      touched.add(`${op.collection}|${op.tripId}`);
    }

    // Refresh the device copies the sync changed, then let the lists redraw.
    for (const key of touched) {
      const [collection, tripId] = key.split('|') as [Collection, string];
      lists.delete(key);
      const records = await serverList(lists, collection, tripId);
      if (records) setSnapshot(collection, tripId, records);
    }
    if (touched.size) announceOfflineData();
  } finally {
    setSyncing(false);
  }
  return getOutbox().length === 0;
}

async function send(op: OutboxOp, lists: ServerLists): Promise<'sent' | 'failed' | 'offline'> {
  let body = op.body;

  if (op.method === 'PATCH' && op.base) {
    const records = await serverList(lists, op.collection, op.tripId);
    if (!records) return (await confirmOnline()) ? fail(op, 'Could not read the current version.') : 'offline';
    const current = records.find((r) => r.id === op.recordId);
    if (!current) {
      // Deleted on another device: the delete wins; keep the edit restorable.
      addConflict({
        id: crypto.randomUUID(), collection: op.collection, tripId: op.tripId, recordId: op.recordId,
        label: op.label, field: null, replaced: op.body, kept: null, at: Date.now(),
      });
      removeOp(op.id);
      return 'sent';
    }
    body = resolve(op, current);
  }

  let res: Response;
  try {
    res = await fetch(op.url, {
      method: op.method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    setOnline(false);
    return 'offline';
  }

  if (res.ok) {
    removeOp(op.id);
    const key = `${op.collection}|${op.tripId}`;
    if (op.method === 'DELETE') {
      snapshotRemove(op.collection, op.tripId, op.recordId);
      lists.set(key, (lists.get(key) ?? []).filter((r) => r.id !== op.recordId));
    } else {
      try {
        const record = unwrapItem(op.collection, await res.json());
        if (record) {
          snapshotUpsert(op.collection, op.tripId, record);
          const list = lists.get(key);
          if (list) lists.set(key, [...list.filter((r) => r.id !== record.id), record]);
        }
      } catch {}
    }
    return 'sent';
  }

  let message = `Error ${res.status}`;
  try {
    const data = await res.json();
    if (typeof data?.error === 'string') message = data.error;
  } catch {}

  // Already done: the create arrived earlier but its reply was lost, or the
  // record was already deleted.
  if ((op.method === 'POST' && /duplicate key/i.test(message)) || (op.method === 'DELETE' && res.status === 404)) {
    removeOp(op.id);
    return 'sent';
  }
  if (res.status >= 500 && !(await confirmOnline())) return 'offline';
  if (res.status === 401) return 'offline'; // signed out: wait, never discard
  return fail(op, message);
}

function fail(op: OutboxOp, error: string): 'failed' {
  updateOp(op.id, { status: 'failed', error });
  return 'failed';
}
