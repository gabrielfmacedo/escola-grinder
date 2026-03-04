import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LayoutShell from '@/components/layout/LayoutShell'
import GrindResumeBanner from '@/components/grind/GrindResumeBanner'
import AnnouncementToast from '@/components/announcements/AnnouncementToast'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: activeGrind }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('grind_sessions')
      .select('id, started_at, type, tournament_name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!profile) redirect('/login')
  if (!profile.full_name?.trim()) redirect('/onboarding')

  const banner = activeGrind ? (
    <GrindResumeBanner
      sessionId={activeGrind.id}
      startedAt={activeGrind.started_at}
      label={activeGrind.tournament_name ?? (activeGrind.type === 'single' ? 'Single Buy-in' : 'Sessão Mista')}
    />
  ) : undefined

  return (
    <>
      <LayoutShell profile={profile} role={profile.role} banner={banner}>
        {children}
      </LayoutShell>
      <AnnouncementToast />
    </>
  )
}
