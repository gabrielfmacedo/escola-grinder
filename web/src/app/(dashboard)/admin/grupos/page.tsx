import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import GruposAdmin from '@/components/admin/GruposAdmin'

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'instructor'].includes(profile?.role ?? '')) redirect('/dashboard')

  const [{ data: groups }, { data: students }] = await Promise.all([
    supabase.from('player_groups').select('id, name, color, description, player_group_members(user_id)').order('name'),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center">
          <Users size={18} className="text-[var(--gold)]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Grupos de Jogadores</h1>
          <p className="text-sm text-[var(--text-muted)]">Organize alunos em turmas ou grupos.</p>
        </div>
      </div>

      <GruposAdmin initialGroups={groups ?? []} students={students ?? []} />
    </div>
  )
}
