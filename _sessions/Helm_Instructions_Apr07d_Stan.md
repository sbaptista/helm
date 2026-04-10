# Helm Instructions — Apr07d — Stan

## What's being built
Key Info section — full CRUD refactor. Drops orphaned `packing_items` table, creates `key_info_groups`, migrates existing category data to group FKs, 4 API routes, 2 UI components.

---

## Step 1: Run SQL in Supabase

Open the Supabase SQL Editor and run this entire block:

```sql
-- Drop orphaned packing_items table (superseded by packing + packing_groups + packing_subgroups)
drop table if exists public.packing_items;

-- Create key_info_groups
create table if not exists public.key_info_groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.key_info_groups enable row level security;

create policy "Users can view key_info_groups for their trips"
  on public.key_info_groups for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = key_info_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can insert key_info_groups for their trips"
  on public.key_info_groups for insert
  with check (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = key_info_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can update key_info_groups for their trips"
  on public.key_info_groups for update
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = key_info_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

create policy "Users can delete key_info_groups for their trips"
  on public.key_info_groups for delete
  using (
    exists (
      select 1 from public.trip_members
      where trip_members.trip_id = key_info_groups.trip_id
      and trip_members.user_id = auth.uid()
    )
  );

-- Add group_id to key_info
alter table public.key_info
  add column if not exists group_id uuid references public.key_info_groups(id) on delete set null;

-- Migrate existing category text values to key_info_groups
with distinct_cats as (
  select
    trip_id,
    category,
    min(sort_order) as first_sort
  from public.key_info
  where deleted_at is null
    and category is not null
  group by trip_id, category
  order by trip_id, first_sort
),
inserted as (
  insert into public.key_info_groups (trip_id, name, sort_order)
  select
    trip_id,
    category,
    row_number() over (partition by trip_id order by first_sort)
  from distinct_cats
  returning id, trip_id, name
)
update public.key_info ki
set group_id = ins.id
from inserted ins
where ki.trip_id = ins.trip_id
  and ki.category = ins.name
  and ki.deleted_at is null;
```

---

## Step 1a: Verify SQL

Run this to confirm columns are correct:

```sql
select column_name, data_type
from information_schema.columns
where table_name in ('key_info', 'key_info_groups')
order by table_name, ordinal_position;
```

Then run this to confirm the migration succeeded:

```sql
select count(*) as total,
       count(group_id) as with_group_id
from key_info
where deleted_at is null;
```

`total` and `with_group_id` must be equal before proceeding.

---

## Step 2: Git push

After the AI confirms all files are placed and version is bumped to `00.01.0054`:

```
git add . && git commit -m "Key Info: full CRUD, key_info_groups, 3-line truncation, action required badge" && git push
```

---

## Step 3: Verify on Vercel

After deploy:

1. Navigate to Key Info tab
2. Confirm items are grouped (💰 Financials, 📋 Booking References, 🔗 Key Links, 🎒 Add-Ons & Activities, 📦 Luggage, 🌦️ Time Zones)
3. Confirm long values are truncated to 3 lines with …
4. Confirm URLs in Key Links section are tappable links
5. Confirm ACTION REQUIRED badge appears where `flag` is true
6. Tap an item — BottomSheet opens with correct values including textarea for value
7. Add a new item — confirm it appears in the correct group
8. Open Manage Groups — confirm 6 groups in correct order, reorder works
9. Version shows `00.01.0054`
