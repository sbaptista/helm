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
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

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
  req: NextRequest,
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
  _req: NextRequest,
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
