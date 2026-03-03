import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Lightbulb } from 'lucide-react'
import AdminSugestoesClient from '@/components/admin/AdminSugestoesClient'

export default async function SugestoesAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'instructor'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: suggestions } = await supabase
    .from('suggestions')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center">
          <Lightbulb size={18} className="text-[var(--gold)]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Sugestões</h1>
          <p className="text-sm text-[var(--text-muted)]">Ideias e melhorias enviadas pelos alunos.</p>
        </div>
      </div>

      <AdminSugestoesClient initialSuggestions={suggestions ?? []} />
    </div>
  )
}
