import { createClient } from '@supabase/supabase-js'
import { ChecklistClient } from './ChecklistClient'

export async function ChecklistSection({ tripId }: { tripId: string }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const [{ data: items }, { data: groups }] = await Promise.all([
    supabase
      .from('checklist')
      .select('*')
      .eq('trip_id', tripId)
      .is('deleted_at', null)
      .order('group_name', { ascending: true })
      .order('item_number', { ascending: false }),
    supabase
      .from('checklist_groups')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true }),
  ])

  return (
    <ChecklistClient
      tripId={tripId}
      initialItems={items ?? []}
      initialGroups={groups ?? []}
    />
  )
}
