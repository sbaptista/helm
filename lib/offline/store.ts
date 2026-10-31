'use client';

import type { Collection, OfflineRecord } from '@/lib/offline/collections';

// The device's copy of trip records, the outbox of changes waiting to be
// sent, and the list of sync conflicts (docs/offline-editing-plan.md §1, §3,
// §5). Kept in localStorage: synchronous, so lists can be read while
// rendering an event handler's result, and a trip is far below its limit.
// Every read and write is wrapped, so Helm works (online only) without it.

const KEY = 'helm-offline-v1';

export interface OutboxOp {
  id: string;
  collection: Collection;
  tripId: string;
  recordId: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body: Record<string, unknown> | null;
  // The record as it was when the change was made (PATCH only); used to
  // tell which fields someone else changed meanwhile.
  base: OfflineRecord | null;
  label: string;
  at: number;
  status: 'pending' | 'failed';
  error?: string;
}

export interface SyncConflict {
  id: string;
  collection: Collection;
  tripId: string;
  recordId: string;
  label: string;
  field: string | null; // null: the whole record (deleted elsewhere)
  replaced: unknown;
  kept: unknown;
  at: number;
}

interface Snapshot {
  records: OfflineRecord[];
  at: number;
}

interface OfflineState {
  snapshots: Record<string, Snapshot>; // `${collection}|${tripId}`
  outbox: OutboxOp[];
  conflicts: SyncConflict[];
  unseenConflicts: number;
}

const EMPTY: OfflineState = { snapshots: {}, outbox: [], conflicts: [], unseenConflicts: 0 };

let state: OfflineState | null = null;
let syncing = false;
let version = 0;
const listeners = new Set<() => void>();

function load(): OfflineState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...EMPTY, ...(JSON.parse(raw) as OfflineState) } : { ...EMPTY };
  } catch {
    state = { ...EMPTY };
  }
  return state;
}

function save(next: OfflineState): void {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  version++;
  listeners.forEach((l) => l());
}

// ─── Subscriptions (pill, failed-changes sheet, Logs) ───────────────────────

export function subscribeOffline(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getOfflineVersion(): number {
  return version;
}

export function isSyncing(): boolean {
  return syncing;
}

export function setSyncing(value: boolean): void {
  if (syncing === value) return;
  syncing = value;
  version++;
  listeners.forEach((l) => l());
}

// Tells section lists to re-read from the device copy (useOfflineList).
export function announceOfflineData(): void {
  window.dispatchEvent(new CustomEvent('helm:offline-data'));
}

// ─── Snapshots ──────────────────────────────────────────────────────────────

const snapKey = (collection: Collection, tripId: string) => `${collection}|${tripId}`;

export function hasSnapshot(collection: Collection, tripId: string): boolean {
  return !!load().snapshots[snapKey(collection, tripId)];
}

export function setSnapshot(collection: Collection, tripId: string, records: OfflineRecord[]): void {
  const s = load();
  save({ ...s, snapshots: { ...s.snapshots, [snapKey(collection, tripId)]: { records, at: Date.now() } } });
}

function updateSnapshot(collection: Collection, tripId: string, change: (records: OfflineRecord[]) => OfflineRecord[]): void {
  const s = load();
  const key = snapKey(collection, tripId);
  const snap = s.snapshots[key];
  if (!snap) return;
  save({ ...s, snapshots: { ...s.snapshots, [key]: { records: change(snap.records), at: snap.at } } });
}

export function snapshotUpsert(collection: Collection, tripId: string, record: OfflineRecord): void {
  updateSnapshot(collection, tripId, (records) =>
    records.some((r) => r.id === record.id)
      ? records.map((r) => (r.id === record.id ? { ...r, ...record } : r))
      : [...records, record]);
}

export function snapshotRemove(collection: Collection, tripId: string, id: string): void {
  updateSnapshot(collection, tripId, (records) => records.filter((r) => r.id !== id));
}

// Which trip a record belongs to: update and delete URLs don't say.
export function findTripId(collection: Collection, recordId: string): string | null {
  const s = load();
  for (const [key, snap] of Object.entries(s.snapshots)) {
    if (!key.startsWith(`${collection}|`)) continue;
    if (snap.records.some((r) => r.id === recordId)) return key.slice(collection.length + 1);
  }
  const op = s.outbox.find((o) => o.collection === collection && o.recordId === recordId);
  return op?.tripId ?? null;
}

// ─── Reading: the snapshot with waiting changes applied ─────────────────────

function applyOps(records: OfflineRecord[], ops: OutboxOp[]): OfflineRecord[] {
  let out = records;
  for (const op of ops) {
    if (op.method === 'POST' && op.body) {
      if (!out.some((r) => r.id === op.recordId)) {
        out = [...out, { trip_id: op.tripId, created_at: new Date(op.at).toISOString(), ...op.body, id: op.recordId }];
      }
    } else if (op.method === 'PATCH' && op.body) {
      out = out.map((r) => (r.id === op.recordId ? { ...r, ...op.body } : r));
    } else if (op.method === 'DELETE') {
      out = out.filter((r) => r.id !== op.recordId);
    }
  }
  return out;
}

export function opsFor(collection: Collection, tripId: string): OutboxOp[] {
  return load().outbox.filter((o) => o.collection === collection && o.tripId === tripId);
}

export function readList(collection: Collection, tripId: string): OfflineRecord[] | null {
  const snap = load().snapshots[snapKey(collection, tripId)];
  const ops = opsFor(collection, tripId);
  if (!snap && ops.length === 0) return null;
  return applyOps(snap?.records ?? [], ops);
}

export function readRecord(collection: Collection, tripId: string, id: string): OfflineRecord | null {
  return readList(collection, tripId)?.find((r) => r.id === id) ?? null;
}

// ─── Outbox ─────────────────────────────────────────────────────────────────

export function getOutbox(): OutboxOp[] {
  return load().outbox;
}

export function enqueue(op: OutboxOp): void {
  const s = load();
  // Deleting a record that was created offline and never sent: drop both.
  if (op.method === 'DELETE') {
    const created = s.outbox.some((o) => o.recordId === op.recordId && o.method === 'POST' && o.status === 'pending');
    if (created) {
      save({ ...s, outbox: s.outbox.filter((o) => o.recordId !== op.recordId) });
      return;
    }
  }
  save({ ...s, outbox: [...s.outbox, op] });
}

export function removeOp(opId: string): void {
  const s = load();
  save({ ...s, outbox: s.outbox.filter((o) => o.id !== opId) });
}

export function updateOp(opId: string, change: Partial<OutboxOp>): void {
  const s = load();
  save({ ...s, outbox: s.outbox.map((o) => (o.id === opId ? { ...o, ...change } : o)) });
}

export function retryFailed(): void {
  const s = load();
  save({ ...s, outbox: s.outbox.map((o) => (o.status === 'failed' ? { ...o, status: 'pending', error: undefined } : o)) });
}

// ─── Conflicts ──────────────────────────────────────────────────────────────

export function addConflict(conflict: SyncConflict): void {
  const s = load();
  save({ ...s, conflicts: [conflict, ...s.conflicts].slice(0, 100), unseenConflicts: s.unseenConflicts + 1 });
}

export function getConflicts(): SyncConflict[] {
  return load().conflicts;
}

export function getUnseenConflicts(): number {
  return load().unseenConflicts;
}

export function markConflictsSeen(): void {
  const s = load();
  if (s.unseenConflicts) save({ ...s, unseenConflicts: 0 });
}

export function dismissConflict(id: string): void {
  const s = load();
  save({ ...s, conflicts: s.conflicts.filter((c) => c.id !== id) });
}
