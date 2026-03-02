import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminPerformanceClient from '@/components/admin/AdminPerformanceClient'

export default async function AdminPerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  const [
    { data: summaries },
    { data: profiles },
    { data: lessonProgress },
    { data: allSessions },
    { data: groups },
    { data: groupMembers },
  ] = await Promise.all([
    admin.from('player_financial_summary').select('*').order('total_profit_cents', { ascending: false }),
    admin.from('profiles').select('id, full_name, email, created_at').eq('role', 'student'),
    admin.from('lesson_progress').select('user_id, completed'),
    admin.from('poker_session_results').select('id, user_id, played_at, buy_in_cents, cash_out_cents, profit_cents, game_type, platform_name, is_live, tournament_name, entries, duration_minutes').order('played_at', { ascending: true }),
    admin.from('player_groups').select('id, name, color, description').order('name'),
    admin.from('player_group_members').select('group_id, user_id'),
  ])

  return (
    <AdminPerformanceClient
      summaries={summaries ?? []}
      profiles={profiles ?? []}
      lessonProgress={lessonProgress ?? []}
      allSessions={allSessions ?? []}
      groups={groups ?? []}
      groupMembers={groupMembers ?? []}
    />
  )
}
