# Helm Instructions — Apr07d — AI

## Overview
Refactor the Key Info section from read-only display to full CRUD, following the Gold Standard pattern (TransportationClient.tsx). Includes dropping `packing_items`, creating `key_info_groups`, migrating existing `key_info` category data to group FKs, 4 API routes, and 2 UI components.

**Version bump:** `00.01.0053` → `00.01.0054` in `lib/version.ts`

---

## Step 1: SQL

Stan runs all SQL directly in the Supabase SQL Editor. No SQL action required from you. Assume the following is already in place before you begin:

- `packing_items` table has been dropped
- `key_info_groups` table exists with fu
ll RLS policies
- `key_info` table has a `group_id` UUID column referencing `key_info_groups`
- All existing `key_info` rows have been migrated and have a valid `group_id`

Verify column names before writing any insert/update code by asking Stan to run:

```sql
select column_name, data_type
from information_schema.columns
where table_name in ('key_info', 'key_info_groups')
order by table_name, ordinal_position;
```

Use the actual column names from that output. Do not assume column names from memory.

---

## Step 2: API Routes

### 2a. `app/api/trips/[id]/key-info/route.ts` — GET + POST items

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('key_info')
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
    .from('key_info')
    .insert({ trip_id: tripId, ...body })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

---

### 2b. `app/api/key-info/[id]/route.ts` — PATCH + DELETE items

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: item } = await supabase
    .from('key_info')
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
    .from('key_info')
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
    .from('key_info')
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
    .from('key_info')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

### 2c. `app/api/trips/[id]/key-info-groups/route.ts` — GET + POST groups

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('key_info_groups')
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
    .from('key_info_groups')
    .insert({ trip_id: tripId, ...body })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

---

### 2d. `app/api/key-info-groups/[id]/route.ts` — PATCH + DELETE groups

DELETE blocked (409) if group has active items.

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: group } = await supabase
    .from('key_info_groups')
    .select('trip_id')
    .eq('id', id)
    .single()
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', group.trip_id)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('key_info_groups')
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
  const { data: group } = await supabase
    .from('key_info_groups')
    .select('trip_id')
    .eq('id', id)
    .single()
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', group.trip_id)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Block if active items exist in this group
  const { count } = await supabase
    .from('key_info')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', id)
    .is('deleted_at', null)
  if (count && count > 0) {
    return NextResponse.json({ error: 'Cannot delete a group that has items' }, { status: 409 })
  }

  const { error } = await supabase
    .from('key_info_groups')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

---

## Step 3: UI Components

### 3a. `components/sections/KeyInfoSection.tsx`

Named export — not default. This is critical. Match the export style of ChecklistSection exactly.

```typescript
import { createClient } from '@supabase/supabase-js'
import KeyInfoClient from './KeyInfoClient'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

interface Props {
  tripId: string
}

export async function KeyInfoSection({ tripId }: Props) {
  const supabase = serviceClient()

  const [
    { data: items },
    { data: groups },
  ] = await Promise.all([
    supabase.from('key_info').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
    supabase.from('key_info_groups').select('*').eq('trip_id', tripId).is('deleted_at', null).order('sort_order'),
  ])

  return (
    <KeyInfoClient
      initialItems={items ?? []}
      initialGroups={groups ?? []}
      tripId={tripId}
    />
  )
}
```

---

### 3b. `components/sections/KeyInfoClient.tsx`

Full client component. Study TransportationClient.tsx for the exact BottomSheet, form field, and save/delete patterns.

#### Types

```typescript
interface KeyInfoGroup {
  id: string
  trip_id: string
  name: string
  sort_order: number
}

interface KeyInfoItem {
  id: string
  trip_id: string
  group_id: string | null
  label: string
  value: string
  url: string | null
  url_label: string | null
  flag: boolean
  sort_order: number
}

interface KeyInfoClientProps {
  initialItems: KeyInfoItem[]
  initialGroups: KeyInfoGroup[]
  tripId: string
}
```

#### State

```typescript
const [items, setItems] = useState<KeyInfoItem[]>(initialItems)
const [groups, setGroups] = useState<KeyInfoGroup[]>(initialGroups)

// Item BottomSheet
const [itemSheetOpen, setItemSheetOpen] = useState(false)
const [editingItem, setEditingItem] = useState<KeyInfoItem | null>(null)
const [itemLabel, setItemLabel] = useState('')
const [itemGroupId, setItemGroupId] = useState('')
const [itemValue, setItemValue] = useState('')
const [itemUrl, setItemUrl] = useState('')
const [itemUrlLabel, setItemUrlLabel] = useState('')
const [itemFlag, setItemFlag] = useState(false)

// Manage Groups BottomSheet
const [groupSheetOpen, setGroupSheetOpen] = useState(false)
const [newGroupName, setNewGroupName] = useState('')
```

#### List display — 3-line truncation

Apply this CSS class to the value display in the list (not in the BottomSheet):

```css
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

Add this to `globals.css`. It is the established pattern for truncating long text in all section list views.

#### URL rendering

In the list view, if `item.url` is present, render it as a tappable link below the value:

```tsx
{item.url && (
  <a
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={e => e.stopPropagation()}
    className="key-info-link"
  >
    {item.url_label || item.url}
  </a>
)}
```

The `e.stopPropagation()` prevents the link tap from opening the edit BottomSheet.

#### Action Required badge

If `item.flag` is true, render a badge on the item row:

```tsx
{item.flag && (
  <span className="badge-action-required">ACTION REQUIRED</span>
)}
```

Use the same badge style as Hotels ACTION REQUIRED — check `globals.css` or `HotelsClient.tsx` for the exact class name already in use.

#### Render structure

```tsx
return (
  <div>
    {/* Section header */}
    <div className="section-header">
      <h2>Key Info</h2>
      <div className="section-header-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => setGroupSheetOpen(true)}>
          Manage Groups
        </button>
        <button className="btn btn-primary" onClick={openAddItem}>
          + Add Item
        </button>
      </div>
    </div>

    {/* Items grouped by key_info_groups */}
    <div className="key-info-list">
      {groups.map(group => {
        const groupItems = items
          .filter(i => i.group_id === group.id)
          .sort((a, b) => a.sort_order - b.sort_order)
        return (
          <div key={group.id} className="key-info-group">
            <div className="key-info-group-header">{group.name}</div>
            {groupItems.map(item => (
              <div
                key={item.id}
                className="key-info-item"
                onClick={() => openEditItem(item)}
              >
                <div className="key-info-item-header">
                  <span className="key-info-label">{item.label}</span>
                  {item.flag && <span className="badge-action-required">ACTION REQUIRED</span>}
                </div>
                <div className="key-info-value line-clamp-3">{item.value}</div>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="key-info-link"
                  >
                    {item.url_label || item.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Items with no group_id */}
      {items.filter(i => !i.group_id).length > 0 && (
        <div className="key-info-group">
          <div className="key-info-group-header">Uncategorized</div>
          {items
            .filter(i => !i.group_id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(item => (/* same item render as above */))}
        </div>
      )}
    </div>

    {/* Item BottomSheet */}
    <BottomSheet
      isOpen={itemSheetOpen}
      onClose={() => setItemSheetOpen(false)}
      title={editingItem ? 'Edit Item' : 'Add Item'}
    >
      {/* Label — text input */}
      {/* Group — dropdown from groups */}
      {/* Value — textarea (multiline) */}
      {/* URL — text input, optional */}
      {/* URL Label — text input, optional */}
      {/* Action Required — checkbox mapped to flag */}
      {/* Save button, Delete button (edit mode only) */}
      {/* Follow TransportationClient.tsx form field and button pattern exactly */}
    </BottomSheet>

    {/* Manage Groups BottomSheet */}
    <BottomSheet
      isOpen={groupSheetOpen}
      onClose={() => setGroupSheetOpen(false)}
      title="Manage Groups"
    >
      {/* List groups with ↑ ↓ reorder and Delete (blocked if items exist) */}
      {/* New group input + Add button at bottom */}
      {/* Follow Checklist Manage Groups pattern exactly */}
    </BottomSheet>
  </div>
)
```

#### CSS to add to globals.css

```css
/* Key Info */
.key-info-group { margin-bottom: 24px; }
.key-info-group-header {
  font-weight: 600;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 8px;
}
.key-info-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-subtle);
  cursor: pointer;
  min-height: 44px;
}
.key-info-item:hover { background: var(--color-hover, rgba(0,0,0,0.02)); }
.key-info-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.key-info-label { font-weight: 600; font-size: 14px; }
.key-info-value { font-size: 14px; color: var(--color-text-secondary); }
.key-info-link {
  display: inline-block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-accent, var(--color-gold));
  text-decoration: underline;
  word-break: break-all;
}

/* 3-line clamp — established pattern for all section list views */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

Use Helm's existing CSS custom property names throughout. Do not introduce hardcoded color values.

---

## Step 4: Register the Section — Read This Carefully

**Known issue from previous builds:** New sections added to the tab navigation without the full component mounted cause section header buttons to not appear. Both the tab list and the conditional render block must be updated.

Before making any changes, run:
```
Search for where KeyInfoSection is currently imported and rendered in app/advisor/trips/[id]/page.tsx. Show me the exact import line and the JSX usage.
```

If `KeyInfoSection` is already imported but renders a placeholder or read-only component, replace it entirely with the new `KeyInfoSection` from `@/components/sections/KeyInfoSection`.

The import must use a named export:
```tsx
import { KeyInfoSection } from '@/components/sections/KeyInfoSection'
```

After making changes, read back the full import block and the conditional render block to confirm `KeyInfoSection` is correctly wired.

---

## Step 5: Version Bump

In `lib/version.ts`, change:
```typescript
export const VERSION = '00.01.0053'
```
to:
```typescript
export const VERSION = '00.01.0054'
```
