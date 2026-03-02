import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import AddStudentButton from '@/components/admin/AddStudentButton'

export default async function AlunosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!myProfile || !['admin', 'instructor'].includes(myProfile.role)) redirect('/dashboard')

  const { data: students } = await supabase
    .from('profiles')
    .select(`
      id, full_name, email, role, created_at,
      subscriptions(status, plans(name, type))
    `)
    .order('created_at', { ascending: false })

  const ROLE_CONFIG = {
    student:    { label: 'Aluno',     color: 'text-[var(--green)] bg-[var(--green)]/10' },
    instructor: { label: 'Instrutor', color: 'text-[var(--blue)] bg-[var(--blue)]/10'   },
    admin:      { label: 'Admin',     color: 'text-[var(--gold)] bg-[var(--gold)]/10'   },
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Alunos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{students?.length ?? 0} usuários cadastrados</p>
        </div>
        <AddStudentButton />
      </div>

      {!students?.length && (
        <div className="text-center py-20">
          <Users size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">Nenhum aluno cadastrado.</p>
        </div>
      )}

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">Aluno</span>
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide w-24 text-center">Plano</span>
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide w-20 text-center">Perfil</span>
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide w-28 text-right">Cadastro</span>
        </div>

        {students?.map(s => {
          const roleCfg = ROLE_CONFIG[s.role]
          const sub = (s.subscriptions as { status: string; plans: { name: string; type: string } | null }[] | null)?.[0]
          const planName = sub?.plans?.name ?? '—'
          const planActive = sub?.status === 'active'

          return (
            <Link key={s.id} href={`/admin/alunos/${s.id}`}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-[var(--border)] last:border-0 hover:bg-white/[0.025] transition-colors cursor-pointer">
              {/* Aluno */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-black">{s.full_name.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{s.full_name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{s.email}</p>
                </div>
              </div>

              {/* Plano */}
              <div className="w-24 text-center">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  planActive ? 'text-[var(--cyan)] bg-[var(--cyan)]/10' : 'text-[var(--text-muted)] bg-[var(--surface-3)]'
                )}>
                  {planName}
                </span>
              </div>

              {/* Role */}
              <div className="w-20 text-center">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleCfg.color)}>
                  {roleCfg.label}
                </span>
              </div>

              {/* Data */}
              <p className="text-xs text-[var(--text-muted)] w-28 text-right">
                {new Date(s.created_at).toLocaleDateString('pt-BR')}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
