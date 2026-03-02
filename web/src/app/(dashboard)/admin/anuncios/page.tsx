import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import AnunciosAdmin from '@/components/announcements/AnunciosAdmin'

export default async function AnunciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'instructor'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center">
          <Megaphone size={18} className="text-[var(--gold)]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Anúncios</h1>
          <p className="text-sm text-[var(--text-muted)]">Mensagens exibidas para todos os membros.</p>
        </div>
      </div>

      <AnunciosAdmin initialAnnouncements={announcements ?? []} />
    </div>
  )
}
