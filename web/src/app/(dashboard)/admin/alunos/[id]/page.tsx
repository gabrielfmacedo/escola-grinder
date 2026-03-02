import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import StudentDetail from '@/components/admin/StudentDetail'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || !['admin', 'instructor'].includes(myProfile.role)) redirect('/dashboard')

  const admin = createAdminClient()

  const [
    { data: profile },
    { data: sessions },
    { data: lessonProgress },
    { data: groupMemberships },
    { data: allGroups },
  ] = await Promise.all([
    admin.from('profiles')
      .select('id, full_name, email, role, created_at, preferred_currency, subscriptions(status, plans(name))')
      .eq('id', id)
      .single(),
    admin.from('poker_session_results')
      .select('id, played_at, buy_in_cents, cash_out_cents, profit_cents, game_type, platform_name, is_live, tournament_name, entries, duration_minutes')
      .eq('user_id', id)
      .order('played_at', { ascending: true }),
    admin.from('lesson_progress')
      .select('user_id, completed, lessons(title)')
      .eq('user_id', id),
    admin.from('player_group_members')
      .select('player_groups(id, name, color)')
      .eq('user_id', id),
    admin.from('player_groups').select('id, name, color').order('name'),
  ])

  if (!profile) notFound()

  const groups = (groupMemberships ?? [])
    .map(m => m.player_groups)
    .filter(Boolean) as { id: string; name: string; color: string }[]

  return (
    <div className="max-w-4xl mx-auto">
      <StudentDetail
        profile={profile as Parameters<typeof StudentDetail>[0]['profile']}
        sessions={sessions ?? []}
        lessonProgress={(lessonProgress ?? []) as Parameters<typeof StudentDetail>[0]['lessonProgress']}
        groups={groups}
        allGroups={(allGroups ?? []) as { id: string; name: string; color: string }[]}
      />
    </div>
  )
}
