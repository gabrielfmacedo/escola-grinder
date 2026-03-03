import { createClient } from '@/lib/supabase/server'
import ConfigForm from '@/components/settings/ConfigForm'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Configurações</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Gerencie seu perfil e preferências.</p>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
        {profile && <ConfigForm profile={profile} />}
      </div>
    </div>
  )
}
