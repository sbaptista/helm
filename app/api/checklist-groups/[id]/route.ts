import { NextRequest, NextResponse } from 'next/server'
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
  if (process.env.BYPASS_AUTH_USER_ID) {
    return process.env.BYPASS_AUTH_USER_ID;
  }
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Exceptions raised by the functions (P0001) are user-facing; a missing
// function (PGRST202) means the migration hasn't been applied yet.
function functionError(error: { code?: string; message: string }, feature: string) {
  if (error.code === 'P0001') return NextResponse.json({ error: error.message }, { status: 400 })
  if (error.code === 'PGRST202') {
    return NextResponse.json({ error: `${feature} database setup is not yet applied.` }, { status: 503 })
  }
  return NextResponse.json({ error: error.message }, { status: 500 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: record } = await supabase
    .from('checklist_groups')
    .select('trip_id')
    .eq('id', id)
    .single()
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', record.trip_id)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, ...rest } = await req.json()
  let data: Record<string, unknown> | null = null

  // Items point at their group by name, so a rename also renames them, in one
  // transaction (docs/checklist-packing-parity-plan.md, section 3).
  if (name !== undefined) {
    const { data: renamed, error } = await supabase.rpc('rename_checklist_group', {
      p_trip_id: record.trip_id,
      p_user_id: userId,
      p_group_id: id,
      p_name: typeof name === 'string' ? name : '',
    })
    if (error) return functionError(error, 'Rename Group')
    data = renamed.group
  }

  if (Object.keys(rest).length > 0) {
    const { data: updated, error } = await supabase
      .from('checklist_groups')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    data = updated
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { data: record } = await supabase
    .from('checklist_groups')
    .select('trip_id')
    .eq('id', id)
    .single()
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: member } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', record.trip_id)
    .eq('user_id', userId)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Deletes the group and soft-deletes its items in one transaction
  // (docs/checklist-packing-parity-plan.md, section 5).
  const { data, error } = await supabase.rpc('delete_checklist_group', {
    p_trip_id: record.trip_id,
    p_user_id: userId,
    p_group_id: id,
  })
  if (error) return functionError(error, 'Delete Group')
  return NextResponse.json({ success: true, ...data })
}
