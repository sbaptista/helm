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
  req: NextRequest,
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
  _req: NextRequest,
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

  // Deletes the category with its sub-groups and items in one transaction.
  // docs/packing-delete-category-plan.md
  const { data, error } = await supabase.rpc('delete_packing_category', {
    p_trip_id: group.trip_id,
    p_user_id: userId,
    p_group_id: id,
  })
  if (error?.code === 'P0001') return NextResponse.json({ error: error.message }, { status: 400 })
  if (error?.code === 'PGRST202') {
    return NextResponse.json({ error: 'Delete Category database setup is not yet applied.' }, { status: 503 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, ...data })
}
