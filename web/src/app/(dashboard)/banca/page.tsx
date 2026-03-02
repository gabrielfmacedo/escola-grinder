import { createClient } from '@/lib/supabase/server'
import BancaClient from '@/components/banca/BancaClient'

export default async function BancaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: entries }, { data: sessions }, { data: platforms }] = await Promise.all([
    supabase.from('bankroll_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('poker_session_results').select('*').eq('user_id', user.id).order('played_at', { ascending: true }),
    supabase.from('poker_platforms').select('id, name').order('name'),
  ])

  return (
    <BancaClient
      entries={entries ?? []}
      sessions={sessions ?? []}
      platforms={platforms ?? []}
    />
  )
}
