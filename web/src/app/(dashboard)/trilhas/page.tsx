import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Map, BookOpen, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanType } from '@/lib/supabase/types'

const PLAN_ORDER: Record<PlanType, number> = { basic: 0, pro: 1, elite: 2 }
const PLAN_LABEL: Record<PlanType, string> = { basic: 'Básico', pro: 'Pro', elite: 'Elite' }
const PLAN_COLOR: Record<PlanType, string> = {
  basic: 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20',
  pro:   'text-[var(--cyan)]  bg-[var(--cyan)]/10  border-[var(--cyan)]/20',
  elite: 'text-[var(--gold)]  bg-[var(--gold)]/10  border-[var(--gold)]/20',
}

export default async function TrilhasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subscription } = await supabase
    .from('subscriptions').select('plans(type)')
    .eq('user_id', user!.id).eq('status', 'active').single()
  const userPlan: PlanType = (subscription?.plans as { type: PlanType } | null)?.type ?? 'basic'

  const { data: paths } = await supabase
    .from('learning_paths')
    .select(`id, title, slug, description, required_plan, thumbnail_url,
      learning_path_courses(course_id, courses(title))`)
    .eq('is_published', true)
    .order('order_index')

  const { data: enrollments } = await supabase
    .from('learning_path_enrollments')
    .select('learning_path_id, completed_at')
    .eq('user_id', user!.id)

  const enrolledSet = new Set(enrollments?.map(e => e.learning_path_id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Trilhas de Aprendizado</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Percursos estruturados para atingir seus objetivos no poker.
        </p>
      </div>

      {!paths?.length && (
        <div className="text-center py-20 text-[var(--text-muted)]">Nenhuma trilha publicada ainda.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {paths?.map(path => {
          const plan = path.required_plan as PlanType
          const locked = PLAN_ORDER[userPlan] < PLAN_ORDER[plan]
          const enrolled = enrolledSet.has(path.id)
          const courses = (path.learning_path_courses as { courses: { title: string } | null }[] ?? [])
            .map(c => c.courses?.title).filter(Boolean)

          return (
            <div key={path.id} className={cn(
              'relative bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden',
              'transition-all duration-200',
              !locked && 'hover:border-[var(--cyan)]/30 hover:shadow-[0_0_24px_rgba(0,212,232,0.06)]'
            )}>
              {/* Faixa de plano */}
              <div className="absolute top-4 right-4">
                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full border', PLAN_COLOR[plan])}>
                  {PLAN_LABEL[plan]}
                </span>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    {locked ? <Lock size={18} className="text-[var(--text-muted)]" /> : <Map size={18} className="text-[var(--cyan)]" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--foreground)]">{path.title}</h3>
                    {enrolled && <span className="text-[10px] text-[var(--green)] font-semibold">Matriculado</span>}
                  </div>
                </div>

                <p className="text-sm text-[var(--text-dim)] mb-4 line-clamp-2">{path.description}</p>

                {/* Cursos da trilha */}
                <div className="space-y-1.5 mb-5">
                  {courses.map((title, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <BookOpen size={11} />
                      <span>{title}</span>
                    </div>
                  ))}
                </div>

                {locked ? (
                  <div className="text-xs text-[var(--text-muted)] py-2">
                    Requer plano <strong className="text-[var(--gold)]">{PLAN_LABEL[plan]}</strong>
                  </div>
                ) : (
                  <Link href={`/trilhas/${path.slug}`}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[var(--cyan)]/10 hover:bg-[var(--cyan)]/20 border border-[var(--cyan)]/20 text-[var(--cyan)] text-sm font-semibold transition-colors">
                    {enrolled ? 'Continuar trilha' : 'Começar trilha'}
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
