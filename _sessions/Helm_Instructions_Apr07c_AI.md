# Helm Instructions — Apr07c — AI

## Overview
Build the Packing section from scratch. Three new database tables, a seed script for Stan's 81 items, 7 API route files, and 2 UI component files. Follow the Gold Standard pattern (TransportationClient.tsx) throughout.

**Version bump:** `00.01.0052` → `00.01.0053` in `lib/version.ts`

---

## Step 1: SQL — Run in Supabase SQL Editor

Run this entire block in the Supabase SQL Editor.

```sql
-- packing_groups: per-person top-level categories
create table if not exists public.packing_groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  person text not null check (person in ('stan', 'cathy')),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.packing_groups enable row level security;

create policy "Users can view packing_groups for their trips"
  on public.packing_groups for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can insert packing_groups for their trips"
  on public.packing_groups for insert
  with check (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can update packing_groups for their trips"
  on public.packing_groups for update
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can delete packing_groups for their trips"
  on public.packing_groups for delete
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

-- packing_subgroups: per-person, per-group sub-categories
create table if not exists public.packing_subgroups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  group_id uuid not null references public.packing_groups(id) on delete cascade,
  person text not null check (person in ('stan', 'cathy')),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.packing_subgroups enable row level security;

create policy "Users can view packing_subgroups for their trips"
  on public.packing_subgroups for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_subgroups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can insert packing_subgroups for their trips"
  on public.packing_subgroups for insert
  with check (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_subgroups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can update packing_subgroups for their trips"
  on public.packing_subgroups for update
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_subgroups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can delete packing_subgroups for their trips"
  on public.packing_subgroups for delete
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing_subgroups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

-- packing: items
create table if not exists public.packing (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  person text not null check (person in ('stan', 'cathy')),
  group_id uuid not null references public.packing_groups(id) on delete restrict,
  subgroup_id uuid references public.packing_subgroups(id) on delete set null,
  text text not null,
  owned boolean not null default false,
  packed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.packing enable row level security;

create policy "Users can view packing for their trips"
  on public.packing for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can insert packing for their trips"
  on public.packing for insert
  with check (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can update packing for their trips"
  on public.packing for update
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can delete packing for their trips"
  on public.packing for delete
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = packing.trip_id
      and trip_members.user_id = auth.uid()
    )
  );
```

After running the SQL, verify column names with:
```sql
select column_name, data_type
from information_schema.columns
where table_name in ('packing', 'packing_groups', 'packing_subgroups')
order by table_name, ordinal_position;
```

Use the actual column names from this output in all insert/update code below. Do not assume column names from memory.

---

## Step 2: Seed Script

Create `seed-packing.js` at the project root. Reference `seed-from-can26.js` for:
- How to import and configure the Supabase service client
- How to resolve `tripId` (replicate that pattern exactly)

The script inserts Stan's groups, subgroups, and items. Cathy starts empty.

```javascript
// seed-packing.js
// Run: node seed-packing.js
// Seeds Stan's packing data from CAN26 into Helm

// [Copy the Supabase client setup and tripId resolution from seed-from-can26.js]

// ── DATA ──────────────────────────────────────────────────────────────────────

// Category order from CAN26 stanCatOrder
const STAN_GROUPS = [
  { name: 'Clothes',           sort_order: 1 },
  { name: 'Bags',              sort_order: 2 },
  { name: 'Toiletries & Tech', sort_order: 3 },
  { name: 'Meds',              sort_order: 4 },
  { name: 'Support',           sort_order: 5 },
]

// Subgroup order from CAN26 stanSubOrder
// Only groups that have subgroups are listed here
const STAN_SUBGROUPS = {
  'Clothes': [
    { name: 'Flights',    sort_order: 1 },
    { name: 'Outer',      sort_order: 2 },
    { name: 'Tops',       sort_order: 3 },
    { name: 'Bottoms',    sort_order: 4 },
    { name: 'Underwear',  sort_order: 5 },
    { name: 'Socks',      sort_order: 6 },
  ],
  'Toiletries & Tech': [
    { name: 'Backpack',          sort_order: 1 },
    { name: 'Personal Carryon',  sort_order: 2 },
    { name: 'Always Available',  sort_order: 3 },
  ],
}

// Items: [group_name, subgroup_name | null, text, owned, packed]
// sort_order is assigned by position within each group+subgroup
const STAN_ITEMS = [
  // ── Bags (no subgroups) ──────────────────────────────────────────────────
  ['Bags', null, 'Patagonia Black Hole 30L',  true,  false],
  ['Bags', null, 'Peak Design backpack?',     false, false],

  // ── Clothes / Flights ────────────────────────────────────────────────────
  ['Clothes', 'Flights', 'Short sleeve merino',                  true, false],
  ['Clothes', 'Flights', 'Black tech pants',                     true, false],
  ['Clothes', 'Flights', 'Merino hoodie \u2014 lashed to Patagonia', true, false],
  ['Clothes', 'Flights', 'Black belt',                           true, false],
  ['Clothes', 'Flights', 'Compression socks',                    true, false],
  ['Clothes', 'Flights', 'Skechers',                             true, false],

  // ── Clothes / Outer ──────────────────────────────────────────────────────
  ['Clothes', 'Outer', 'Green belt (packed)',                    false, false],
  ['Clothes', 'Outer', 'Winter cap \u2014 Alpaca',              true,  false],
  ['Clothes', 'Outer', 'Scarf \u2014 Alpaca',                   true,  false],
  ['Clothes', 'Outer', 'Packable winter jacket \u2014 Uniqlo',  true,  false],
  ['Clothes', 'Outer', 'Raincoat',                              true,  false],
  ['Clothes', 'Outer', 'Packable travel cap',                   true,  false],
  ['Clothes', 'Outer', 'House slippers',                        true,  false],

  // ── Clothes / Tops ───────────────────────────────────────────────────────
  ['Clothes', 'Tops', 'Merino wool T-shirts (2)',                         false, false],
  ['Clothes', 'Tops', 'Merino wool long sleeve (2)',                      true,  false],
  ['Clothes', 'Tops', 'T-shirts for hotel room (1 or 2)',                 true,  false],
  ['Clothes', 'Tops', 'Long sleeve shirt \u2014 suitable for dining (white)', true, false],
  ['Clothes', 'Tops', 'Grey sweater',                                     true,  false],

  // ── Clothes / Bottoms ────────────────────────────────────────────────────
  ['Clothes', 'Bottoms', 'Green pants',   true,  false],
  ['Clothes', 'Bottoms', 'Sweat pants',   false, false],

  // ── Clothes / Underwear ──────────────────────────────────────────────────
  ['Clothes', 'Underwear', 'Underwear (9 pair)', true, false],

  // ── Clothes / Socks ──────────────────────────────────────────────────────
  ['Clothes', 'Socks', 'Darn Tough socks', true, false],
  ['Clothes', 'Socks', 'Alpaca socks',     true, false],
  ['Clothes', 'Socks', 'Black socks',      true, false],
  ['Clothes', 'Socks', 'Red socks',        true, false],
  ['Clothes', 'Socks', 'Purple socks',     true, false],

  // ── Meds (no subgroups) ──────────────────────────────────────────────────
  ['Meds', null, 'Check w/ Cathy', true, false],

  // ── Toiletries & Tech / Backpack ─────────────────────────────────────────
  ['Toiletries & Tech', 'Backpack', 'Nail clippers',               true, false],
  ['Toiletries & Tech', 'Backpack', 'Deodorant (Nature, unscented)', true, false],
  ['Toiletries & Tech', 'Backpack', '1-Drop',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Comb',                         true, false],
  ['Toiletries & Tech', 'Backpack', 'Q-tips',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Hand sanitizer',               true, false],
  ['Toiletries & Tech', 'Backpack', 'Toothbrush',                   true, false],
  ['Toiletries & Tech', 'Backpack', 'Toothpaste',                   true, false],
  ['Toiletries & Tech', 'Backpack', 'Mouthwash',                    true, false],
  ['Toiletries & Tech', 'Backpack', 'Mouth guard',                  true, false],
  ['Toiletries & Tech', 'Backpack', 'Mask',                         true, false],
  ['Toiletries & Tech', 'Backpack', 'Small tissue packet',          true, false],
  ['Toiletries & Tech', 'Backpack', 'Band-aids',                    true, false],
  ['Toiletries & Tech', 'Backpack', 'Shaver',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Blades',                       true, false],
  ['Toiletries & Tech', 'Backpack', 'Shaving soap',                 true, false],
  ['Toiletries & Tech', 'Backpack', 'Wet Ones',                     true, false],
  ['Toiletries & Tech', 'Backpack', 'Floss',                        true, false],
  ['Toiletries & Tech', 'Backpack', 'Blistex',                      true, false],
  ['Toiletries & Tech', 'Backpack', 'Device wipes',                 true, false],

  // ── Toiletries & Tech / Personal Carryon ────────────────────────────────
  ['Toiletries & Tech', 'Personal Carryon', '1-Drop',         true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Hand sanitizer', true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Masks (2)?',     true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Blistex',        true, false],
  ['Toiletries & Tech', 'Personal Carryon', 'Mouthwash',      true, false],

  // ── Toiletries & Tech / Always Available ─────────────────────────────────
  ['Toiletries & Tech', 'Always Available', 'Magsafe iPhone battery',          false, false],
  ['Toiletries & Tech', 'Always Available', '3 ft C-to-C cable',               false, false],
  ['Toiletries & Tech', 'Always Available', 'USB-C outlet plug (iPhone)',       false, false],
  ['Toiletries & Tech', 'Always Available', 'Watch Magsafe charger',           false, false],
  ['Toiletries & Tech', 'Always Available', 'USB-A outlet plug (Watch)',        false, false],
  ['Toiletries & Tech', 'Always Available', 'Microfiber glasses-cleaning cloth', false, false],

  // ── Support (no subgroups) ───────────────────────────────────────────────
  ['Support', null, 'FOLDER WITH PRINTED DOCUMENTS',                     false, false],
  ['Support', null, "Canada currency ($40 in 5's and 10's)",              false, false],
  ['Support', null, 'Microfiber glasses-cleaning cloth',                  false, false],
  ['Support', null, 'AirPod Pro strap',                                   false, false],
  ['Support', null, 'Car key (not needed if cab to/from airport)',         false, false],
  ['Support', null, 'Condo key as backup (only one needs to bring)',       false, false],
  ['Support', null, 'Do NOT bring car FOB',                               false, false],
  ['Support', null, 'Contigo mug (water)',                                false, false],
  ['Support', null, 'Wet wipes',                                          false, false],
  ['Support', null, 'Detergent strips',                                   false, false],
  ['Support', null, 'Light waterproof bags',                              false, true],
  ['Support', null, 'Bags for dirty clothes',                             false, false],
  ['Support', null, 'Band-aids (in EB bag)',                              false, false],
  ['Support', null, 'AirTags + holders',                                  false, false],
  ['Support', null, 'Dry/wet pouches (waterproof bags)',                  false, false],
  ['Support', null, 'Travel wash cloths',                                 false, false],
  ['Support', null, 'Covid test kits',                                    false, false],
  ['Support', null, 'ID cards for luggage',                               false, false],
  ['Support', null, 'Downloaded movies for flights',                      false, false],
  ['Support', null, 'Wall outlet multiplug (flat profile)',                false, false],
  ['Support', null, 'Passport',                                           false, false],
]

// ── SEED ──────────────────────────────────────────────────────────────────────

async function seed() {
  // Resolve tripId using the same pattern as seed-from-can26.js

  console.log('Seeding packing groups...')
  const groupIdMap = {} // group_name => uuid

  for (const g of STAN_GROUPS) {
    const { data, error } = await supabase
      .from('packing_groups')
      .insert({ trip_id: tripId, person: 'stan', name: g.name, sort_order: g.sort_order })
      .select('id')
      .single()
    if (error) throw error
    groupIdMap[g.name] = data.id
    console.log(`  Group: ${g.name} → ${data.id}`)
  }

  console.log('Seeding packing subgroups...')
  const subgroupIdMap = {} // `${group_name}::${sub_name}` => uuid

  for (const [groupName, subs] of Object.entries(STAN_SUBGROUPS)) {
    for (const s of subs) {
      const { data, error } = await supabase
        .from('packing_subgroups')
        .insert({
          trip_id: tripId,
          group_id: groupIdMap[groupName],
          person: 'stan',
          name: s.name,
          sort_order: s.sort_order,
        })
        .select('id')
        .single()
      if (error) throw error
      subgroupIdMap[`${groupName}::${s.name}`] = data.id
      console.log(`  Subgroup: ${groupName} / ${s.name} → ${data.id}`)
    }
  }

  console.log('Seeding packing items...')
  // Track sort_order per group+subgroup bucket
  const sortCounters = {}

  for (const [groupName, subName, text, owned, packed] of STAN_ITEMS) {
    const bucketKey = `${groupName}::${subName ?? '__none__'}`
    if (!sortCounters[bucketKey]) sortCounters[bucketKey] = 1
    const sort_order = sortCounters[bucketKey]++

    const group_id = groupIdMap[groupName]
    const subgroup_id = subName ? (subgroupIdMap[`${groupName}::${subName}`] ?? null) : null

    const { error } = await supabase
      .from('packing')
      .insert({ trip_id: tripId, person: 'stan', group_id, subgroup_id, text, owned, packed, sort_order })
    if (error) throw error
    console.log(`  Item: ${text}`)
  }

  console.log('Done. Seeded Stan packing data successfully.')
}

seed().catch(err => { console.error(err); process.exit(1) })
```

---

## Step 3: API Routes

### 3a. `app/api/trips/[id]/packing/route.ts` — GET + POST items

```typescript
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { getAuthUserId } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('packing')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('packing')
    .insert({ trip_id: tripId, ...body })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

---

### 3b. `app/api/packing/[id]/route.ts` — PATCH + DELETE items

```typescript
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { getAuthUserId } from '@/lib/auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: item } = await supabase
    .from('packing')
    .select('trip_id')
    .eq('id', id)
    .single()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', item.trip_id)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('packing')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: item } = await supabase
    .from('packing')
    .select('trip_id')
    .eq('id', id)
    .single()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', item.trip_id)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('packing')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

### 3c. `app/api/trips/[id]/packing-groups/route.ts` — GET + POST groups

```typescript
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { getAuthUserId } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('packing_groups')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('packing_groups')
    .insert({ trip_id: tripId, ...body })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

---

### 3d. `app/api/packing-groups/[id]/route.ts` — PATCH + DELETE groups

DELETE is blocked (409) if the group has active (non-deleted) items.

```typescript
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { getAuthUserId } from '@/lib/auth'

async function resolveGroup(supabase: ReturnType<typeof serviceClient>, id: string) {
  const { data } = await supabase
    .from('packing_groups')
    .select('trip_id')
    .eq('id', id)
    .single()
  return data
}

async function checkMembership(supabase: ReturnType<typeof serviceClient>, tripId: string, userId: string) {
  const { data } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const group = await resolveGroup(supabase, id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const member = await checkMembership(supabase, group.trip_id, userId)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('packing_groups')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const group = await resolveGroup(supabase, id)
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const member = await checkMembership(supabase, group.trip_id, userId)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Block if active items exist
  const { count } = await supabase
    .from('packing')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', id)
    .is('deleted_at', null)
  if (count && count > 0) {
    return NextResponse.json({ error: 'Cannot delete a category that has items' }, { status: 409 })
  }

  const { error } = await supabase
    .from('packing_groups')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

### 3e. `app/api/trips/[id]/packing-subgroups/route.ts` — GET + POST subgroups

```typescript
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { getAuthUserId } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('packing_subgroups')
    .select('*')
    .eq('trip_id', tripId)
    .is('deleted_at', null)
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('packing_subgroups')
    .insert({ trip_id: tripId, ...body })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

---

### 3f. `app/api/packing-subgroups/[id]/route.ts` — PATCH + DELETE subgroups

DELETE blocked (409) if subgroup has active items.

```typescript
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { getAuthUserId } from '@/lib/auth'

async function resolveSub(supabase: ReturnType<typeof serviceClient>, id: string) {
  const { data } = await supabase
    .from('packing_subgroups')
    .select('trip_id')
    .eq('id', id)
    .single()
  return data
}

async function checkMembership(supabase: ReturnType<typeof serviceClient>, tripId: string, userId: string) {
  const { data } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const sub = await resolveSub(supabase, id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const member = await checkMembership(supabase, sub.trip_id, userId)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('packing_subgroups')
    .update(body)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const sub = await resolveSub(supabase, id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const member = await checkMembership(supabase, sub.trip_id, userId)
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Block if active items exist in this subgroup
  const { count } = await supabase
    .from('packing')
    .select('id', { count: 'exact', head: true })
    .eq('subgroup_id', id)
    .is('deleted_at', null)
  if (count && count > 0) {
    return NextResponse.json({ error: 'Cannot delete a sub-group that has items' }, { status: 409 })
  }

  const { error } = await supabase
    .from('packing_subgroups')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

### 3g. `app/api/trips/[id]/packing-reset/route.ts` — POST (reset all packed flags for a person)

```typescript
import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { getAuthUserId } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { person } = await req.json()
  const { error } = await supabase
    .from('packing')
    .update({ packed: false })
    .eq('trip_id', tripId)
    .eq('person', person)
    .is('deleted_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

## Step 4: UI Components

### 4a. `components/sections/PackingSection.tsx`

Thin async server component. Fetches all three data sets in parallel using the service client, then renders `PackingClient`.

```typescript
import { serviceClient } from '@/lib/supabase/service'
import PackingClient from './PackingClient'

interface Props {
  tripId: string
}

export default async function PackingSection({ tripId }: Props) {
  const supabase = serviceClient()

  const [
    { data: items },
    { data: groups },
    { data: subgroups },
  ] = await Promise.all([
    supabase.from('packing').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
    supabase.from('packing_groups').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
    supabase.from('packing_subgroups').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
  ])

  return (
    <PackingClient
      initialItems={items ?? []}
      initialGroups={groups ?? []}
      initialSubgroups={subgroups ?? []}
      tripId={tripId}
    />
  )
}
```

---

### 4b. `components/sections/PackingClient.tsx`

Full client component. Study TransportationClient.tsx for the exact BottomSheet, form field, and save/delete patterns — replicate those precisely.

#### Types

```typescript
type Person = 'stan' | 'cathy'

interface PackingGroup {
  id: string
  trip_id: string
  person: Person
  name: string
  sort_order: number
}

interface PackingSubgroup {
  id: string
  trip_id: string
  group_id: string
  person: Person
  name: string
  sort_order: number
}

interface PackingItem {
  id: string
  trip_id: string
  person: Person
  group_id: string
  subgroup_id: string | null
  text: string
  owned: boolean
  packed: boolean
  sort_order: number
}

interface PackingClientProps {
  initialItems: PackingItem[]
  initialGroups: PackingGroup[]
  initialSubgroups: PackingSubgroup[]
  tripId: string
}
```

#### State

```typescript
// Data
const [items, setItems] = useState<PackingItem[]>(initialItems)
const [groups, setGroups] = useState<PackingGroup[]>(initialGroups)
const [subgroups, setSubgroups] = useState<PackingSubgroup[]>(initialSubgroups)

// Person tab
const [activePerson, setActivePerson] = useState<Person>('stan')

// Item BottomSheet
const [itemSheetOpen, setItemSheetOpen] = useState(false)
const [editingItem, setEditingItem] = useState<PackingItem | null>(null)
const [itemText, setItemText] = useState('')
const [itemGroupId, setItemGroupId] = useState('')
const [itemSubgroupId, setItemSubgroupId] = useState('') // empty string = no subgroup
const [itemOwned, setItemOwned] = useState(false)
const [itemPacked, setItemPacked] = useState(false)

// Manage Categories BottomSheet
const [catSheetOpen, setCatSheetOpen] = useState(false)
const [newCatName, setNewCatName] = useState('')

// Manage Subgroups BottomSheet
const [subSheetOpen, setSubSheetOpen] = useState(false)
const [managingGroup, setManagingGroup] = useState<PackingGroup | null>(null)
const [newSubName, setNewSubName] = useState('')
```

#### Derived data (recompute each render)

```typescript
const personGroups = groups
  .filter(g => g.person === activePerson)
  .sort((a, b) => a.sort_order - b.sort_order)

const personSubgroups = subgroups.filter(s => s.person === activePerson)
const personItems = items.filter(i => i.person === activePerson)
```

#### Handlers — Item BottomSheet

```typescript
function openAddItem() {
  setEditingItem(null)
  setItemText('')
  setItemGroupId(personGroups[0]?.id ?? '')
  setItemSubgroupId('')
  setItemOwned(false)
  setItemPacked(false)
  setItemSheetOpen(true)
}

function openEditItem(item: PackingItem) {
  setEditingItem(item)
  setItemText(item.text)
  setItemGroupId(item.group_id)
  setItemSubgroupId(item.subgroup_id ?? '')
  setItemOwned(item.owned)
  setItemPacked(item.packed)
  setItemSheetOpen(true)
}

async function handleSaveItem() {
  const payload = {
    person: activePerson,
    group_id: itemGroupId,
    subgroup_id: itemSubgroupId || null,
    text: itemText,
    owned: itemOwned,
    packed: itemPacked,
  }
  if (editingItem) {
    const res = await fetch(`/api/packing/${editingItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
    }
  } else {
    // Calculate next sort_order for this group+subgroup bucket
    const bucket = items.filter(
      i => i.person === activePerson &&
           i.group_id === itemGroupId &&
           (i.subgroup_id ?? '') === (itemSubgroupId || '')
    )
    const nextSort = bucket.length ? Math.max(...bucket.map(i => i.sort_order)) + 1 : 1
    const res = await fetch(`/api/trips/${tripId}/packing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, sort_order: nextSort }),
    })
    if (res.ok) {
      const created = await res.json()
      setItems(prev => [...prev, created])
    }
  }
  setItemSheetOpen(false)
}

async function handleDeleteItem() {
  if (!editingItem) return
  const res = await fetch(`/api/packing/${editingItem.id}`, { method: 'DELETE' })
  if (res.ok) {
    setItems(prev => prev.filter(i => i.id !== editingItem.id))
    setItemSheetOpen(false)
  }
}
```

#### Handlers — Toggle owned/packed (optimistic)

```typescript
async function toggleOwned(item: PackingItem) {
  const newVal = !item.owned
  setItems(prev => prev.map(i => i.id === item.id ? { ...i, owned: newVal } : i))
  await fetch(`/api/packing/${item.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owned: newVal }),
  })
}

async function togglePacked(item: PackingItem) {
  const newVal = !item.packed
  setItems(prev => prev.map(i => i.id === item.id ? { ...i, packed: newVal } : i))
  await fetch(`/api/packing/${item.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packed: newVal }),
  })
}
```

#### Handlers — Reset packed

```typescript
async function handleResetPacked() {
  const res = await fetch(`/api/trips/${tripId}/packing-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person: activePerson }),
  })
  if (res.ok) {
    setItems(prev => prev.map(i => i.person === activePerson ? { ...i, packed: false } : i))
  }
}
```

#### Handlers — Manage Categories

```typescript
async function handleCreateCategory() {
  if (!newCatName.trim()) return
  const nextSort = personGroups.length ? Math.max(...personGroups.map(g => g.sort_order)) + 1 : 1
  const res = await fetch(`/api/trips/${tripId}/packing-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person: activePerson, name: newCatName.trim(), sort_order: nextSort }),
  })
  if (res.ok) {
    const created = await res.json()
    setGroups(prev => [...prev, created])
    setNewCatName('')
  }
}

async function moveCategoryUp(group: PackingGroup) {
  const sorted = [...personGroups]
  const idx = sorted.findIndex(g => g.id === group.id)
  if (idx <= 0) return
  const other = sorted[idx - 1]
  await Promise.all([
    fetch(`/api/packing-groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sort_order: other.sort_order }),
    }),
    fetch(`/api/packing-groups/${other.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sort_order: group.sort_order }),
    }),
  ])
  setGroups(prev => prev.map(g => {
    if (g.id === group.id) return { ...g, sort_order: other.sort_order }
    if (g.id === other.id) return { ...g, sort_order: group.sort_order }
    return g
  }))
}

async function moveCategoryDown(group: PackingGroup) {
  const sorted = [...personGroups]
  const idx = sorted.findIndex(g => g.id === group.id)
  if (idx >= sorted.length - 1) return
  const other = sorted[idx + 1]
  await Promise.all([
    fetch(`/api/packing-groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sort_order: other.sort_order }),
    }),
    fetch(`/api/packing-groups/${other.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sort_order: group.sort_order }),
    }),
  ])
  setGroups(prev => prev.map(g => {
    if (g.id === group.id) return { ...g, sort_order: other.sort_order }
    if (g.id === other.id) return { ...g, sort_order: group.sort_order }
    return g
  }))
}

async function handleDeleteCategory(group: PackingGroup) {
  const res = await fetch(`/api/packing-groups/${group.id}`, { method: 'DELETE' })
  if (res.status === 409) {
    alert('Cannot delete a category that has items.')
    return
  }
  if (res.ok) setGroups(prev => prev.filter(g => g.id !== group.id))
}
```

#### Handlers — Manage Subgroups (same swap pattern, scoped to managingGroup)

```typescript
async function handleCreateSubgroup() {
  if (!newSubName.trim() || !managingGroup) return
  const groupSubs = personSubgroups
    .filter(s => s.group_id === managingGroup.id)
    .sort((a, b) => a.sort_order - b.sort_order)
  const nextSort = groupSubs.length ? Math.max(...groupSubs.map(s => s.sort_order)) + 1 : 1
  const res = await fetch(`/api/trips/${tripId}/packing-subgroups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      group_id: managingGroup.id,
      person: activePerson,
      name: newSubName.trim(),
      sort_order: nextSort,
    }),
  })
  if (res.ok) {
    const created = await res.json()
    setSubgroups(prev => [...prev, created])
    setNewSubName('')
  }
}

// moveSubgroupUp / moveSubgroupDown: same swap pattern as categories,
// but scoped to personSubgroups.filter(s => s.group_id === managingGroup.id)
// using /api/packing-subgroups/[id] PATCH with { sort_order }

async function handleDeleteSubgroup(sub: PackingSubgroup) {
  const res = await fetch(`/api/packing-subgroups/${sub.id}`, { method: 'DELETE' })
  if (res.status === 409) {
    alert('Cannot delete a sub-group that has items.')
    return
  }
  if (res.ok) setSubgroups(prev => prev.filter(s => s.id !== sub.id))
}
```

#### Render structure

```tsx
return (
  <div>
    {/* ── Section header ─────────────────────────────────── */}
    <div className="section-header">
      <h2>Packing List</h2>
      <div className="section-header-actions">
        <button className="btn btn-ghost btn-sm" onClick={handleResetPacked}>
          ↺ Reset Packed
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setCatSheetOpen(true)}>
          Manage Categories
        </button>
        <button className="btn btn-primary" onClick={openAddItem}>
          + Add Item
        </button>
      </div>
    </div>

    {/* ── Person tabs ────────────────────────────────────── */}
    <div className="pack-tabs">
      {(['stan', 'cathy'] as Person[]).map(p => (
        <button
          key={p}
          className={`pack-tab${activePerson === p ? ' active' : ''}`}
          onClick={() => setActivePerson(p)}
        >
          🎒 {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>

    {/* ── Items grouped by category → sub-category ───────── */}
    <div className="pack-list">
      {personGroups.length === 0 && (
        <p className="empty-state">No categories yet. Add one via Manage Categories.</p>
      )}
      {personGroups.map(group => {
        const groupItems = personItems.filter(i => i.group_id === group.id)
        const groupSubs = personSubgroups
          .filter(s => s.group_id === group.id)
          .sort((a, b) => a.sort_order - b.sort_order)
        const packedCount = groupItems.filter(i => i.packed).length
        const ownedCount = groupItems.filter(i => i.owned).length

        return (
          <div key={group.id} className="pack-group">
            {/* Group header */}
            <div className="pack-group-header">
              <span className="pack-group-name">{group.name}</span>
              <span className="pack-group-progress">
                {packedCount}/{groupItems.length} packed · {ownedCount} owned
              </span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { setManagingGroup(group); setSubSheetOpen(true) }}
              >
                Manage Sub-groups
              </button>
            </div>

            {/* Items with no subgroup */}
            {groupItems
              .filter(i => !i.subgroup_id)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(item => renderItem(item))}

            {/* Subgroups */}
            {groupSubs.map(sub => {
              const subItems = groupItems
                .filter(i => i.subgroup_id === sub.id)
                .sort((a, b) => a.sort_order - b.sort_order)
              return (
                <div key={sub.id} className="pack-subgroup">
                  <div className="pack-subgroup-header">{sub.name}</div>
                  {subItems.map(item => renderItem(item))}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>

    {/* ── Item BottomSheet ────────────────────────────────── */}
    <BottomSheet
      isOpen={itemSheetOpen}
      onClose={() => setItemSheetOpen(false)}
      title={editingItem ? 'Edit Item' : 'Add Item'}
    >
      {/* Text input */}
      {/* Group dropdown — options from personGroups */}
      {/* Sub-group dropdown — options from personSubgroups filtered by selected group_id, plus "None" option */}
      {/* Owned checkbox */}
      {/* Packed checkbox */}
      {/* Save button, Delete button (edit mode only) */}
      {/* Follow the exact form field and button pattern from TransportationClient.tsx */}
    </BottomSheet>

    {/* ── Manage Categories BottomSheet ───────────────────── */}
    <BottomSheet
      isOpen={catSheetOpen}
      onClose={() => setCatSheetOpen(false)}
      title="Manage Categories"
    >
      {/* List personGroups with ↑ ↓ reorder buttons and Delete button */}
      {/* Delete button disabled (and shows tooltip) if group has active items */}
      {/* New category input + Add button at bottom */}
      {/* Follow Checklist Manage Groups BottomSheet pattern exactly */}
    </BottomSheet>

    {/* ── Manage Subgroups BottomSheet ────────────────────── */}
    <BottomSheet
      isOpen={subSheetOpen}
      onClose={() => setSubSheetOpen(false)}
      title={managingGroup ? `Sub-groups: ${managingGroup.name}` : 'Manage Sub-groups'}
    >
      {/* List subgroups for managingGroup with ↑ ↓ reorder and Delete */}
      {/* Delete button disabled if subgroup has active items */}
      {/* New subgroup input + Add button at bottom */}
    </BottomSheet>
  </div>
)
```

#### renderItem helper

```tsx
function renderItem(item: PackingItem) {
  const fullyDone = item.owned && item.packed
  return (
    <div
      key={item.id}
      className="pack-item"
      style={{ opacity: fullyDone ? 0.4 : item.packed ? 0.45 : 1 }}
      onClick={() => openEditItem(item)}
    >
      {/* Owned checkbox — gold when checked */}
      <button
        className={`pack-cb${item.owned ? ' owned' : ''}`}
        onClick={e => { e.stopPropagation(); toggleOwned(item) }}
        title="Toggle Owned"
        aria-label="Toggle owned"
      />
      <span className="pack-item-text">{item.text}</span>
      {/* Packed checkbox — navy when checked */}
      <button
        className={`pack-cb packed-cb${item.packed ? ' checked' : ''}`}
        onClick={e => { e.stopPropagation(); togglePacked(item) }}
        title="Toggle Packed"
        aria-label="Toggle packed"
      />
    </div>
  )
}
```

#### CSS classes needed (add to globals.css or a packing-specific stylesheet)

```css
.pack-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.pack-tab { /* ghost button style */ }
.pack-tab.active { /* active/selected style */ }

.pack-group { margin-bottom: 24px; }
.pack-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
}
.pack-group-progress { font-size: 12px; color: var(--color-text-muted); }

.pack-subgroup { margin-top: 8px; margin-left: 16px; }
.pack-subgroup-header {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  padding: 6px 0;
}

.pack-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 0;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-subtle);
}
.pack-item-text { flex: 1; font-size: 15px; }

.pack-cb {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  flex-shrink: 0;
  cursor: pointer;
  padding: 0;
}
.pack-cb.owned { background: var(--color-gold, #C9A84C); border-color: var(--color-gold, #C9A84C); }
.pack-cb.packed-cb.checked { background: var(--color-navy, #1B3A6B); border-color: var(--color-navy, #1B3A6B); }
```

Use Helm's existing CSS custom property names for gold/navy. If those exact tokens don't exist, use the closest matching ones already defined in globals.css — do not introduce new hardcoded color values.

---

## Step 5: Register the Section — Read This Carefully

**Known issue:** In previous builds, new sections were added to the tab navigation but the full section component was not mounted, causing section header buttons (like "+ Add Item") to not appear. This step must be done completely or those buttons will be missing.

**Before making any changes**, identify the file that manages the trip detail tab navigation. Run this first:

```
Search for where ChecklistSection or TransportationSection is imported and rendered in the trip detail view. Show me the full file path and the relevant import statement and JSX usage.
```

**What to look for:** There will be (a) a tab array or section list controlling which tabs appear in the nav bar, and (b) a conditional JSX block that renders the matching section component when a tab is active. Both must be updated — updating only one causes the missing-buttons bug.

**Make these two changes:**

1. Add `'packing'` (or equivalent) to the tab list in the correct position — after Checklist, before Key Info.

2. Add the `PackingSection` import and render it in the conditional render block, following the exact pattern of `ChecklistSection`. For example:

```tsx
import PackingSection from '@/components/sections/PackingSection'

// In the conditional render block:
{activeSection === 'packing' && (
  <PackingSection tripId={tripId} />
)}
```

**After making changes**, read back the full tab array and the full conditional render block to confirm both contain the packing entry. Do not proceed to Step 6 until this is verified.

**If a placeholder already exists** (e.g., the tab renders `null` or a "coming soon" message), replace that placeholder entirely with `<PackingSection tripId={tripId} />`.

---

## Step 6: Version Bump

In `lib/version.ts`, change:
```typescript
export const VERSION = '00.01.0052'
```
to:
```typescript
export const VERSION = '00.01.0053'
```
