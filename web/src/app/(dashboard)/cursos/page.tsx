import { createClient } from '@/lib/supabase/server'
import CourseCard from '@/components/courses/CourseCard'
import type { PlanType } from '@/lib/supabase/types'

const PLAN_ORDER: Record<PlanType, number> = { basic: 0, pro: 1, elite: 2 }

export default async function CursosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Plano do usuário
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, plans(type)')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .single()

  const userPlan: PlanType = (subscription?.plans as { type: PlanType } | null)?.type ?? 'basic'

  // Cursos publicados
  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, title, slug, description, thumbnail_url, required_plan, order_index,
      modules(lessons(id))
    `)
    .eq('is_published', true)
    .order('order_index')

  // Progresso do usuário
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed')
    .eq('user_id', user!.id)

  const completedSet = new Set(
    progress?.filter(p => p.completed).map(p => p.lesson_id) ?? []
  )

  // Agrupa cursos por plano (carrosséis)
  const byPlan: Record<PlanType, typeof courses> = { basic: [], pro: [], elite: [] }
  for (const course of courses ?? []) {
    byPlan[course.required_plan as PlanType]?.push(course)
  }

  const sections: { label: string; plan: PlanType; accent: string }[] = [
    { label: 'Conteúdo Gratuito', plan: 'basic', accent: 'var(--green)' },
    { label: 'Pro',               plan: 'pro',   accent: 'var(--cyan)' },
    { label: 'Elite',             plan: 'elite',  accent: 'var(--gold)' },
  ]

  function getLessonIds(course: NonNullable<typeof courses>[number]) {
    return (course.modules as { lessons: { id: string }[] }[] ?? [])
      .flatMap(m => m.lessons.map(l => l.id))
  }

  function getProgress(course: NonNullable<typeof courses>[number]) {
    const ids = getLessonIds(course)
    if (!ids.length) return 0
    const done = ids.filter(id => completedSet.has(id)).length
    return Math.round((done / ids.length) * 100)
  }

  const hasAnyCourse = (courses?.length ?? 0) > 0

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] p-8 min-h-[180px] flex flex-col justify-end"
        style={{ background: 'linear-gradient(135deg, var(--surface-2) 0%, rgba(0,212,232,0.05) 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(var(--cyan), transparent)' }}
        />
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Biblioteca de Cursos</h1>
        <p className="text-[var(--text-dim)] mt-1 text-sm max-w-lg">
          Acesse os conteúdos do seu plano e acompanhe seu progresso em cada aula.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--cyan)] font-medium">
          <span className="w-2 h-2 rounded-full bg-[var(--cyan)]" />
          Plano atual: <span className="capitalize font-bold">{userPlan}</span>
        </div>
      </div>

      {!hasAnyCourse && (
        <div className="text-center py-16 text-[var(--text-muted)]">
          Nenhum curso publicado ainda.
        </div>
      )}

      {/* Carrosséis por plano */}
      {sections.map(({ label, plan, accent }) => {
        const list = byPlan[plan] ?? []
        if (!list.length) return null

        return (
          <section key={plan}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-1 h-5 rounded-full" style={{ background: accent }} />
              <h2 className="text-base font-bold text-[var(--foreground)]">{label}</h2>
              <span className="text-xs text-[var(--text-muted)] ml-1">{list.length} curso{list.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {list.map(course => {
                const lessonIds = getLessonIds(course)
                return (
                  <CourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    slug={course.slug}
                    description={course.description}
                    thumbnail_url={course.thumbnail_url}
                    required_plan={course.required_plan as PlanType}
                    lesson_count={lessonIds.length}
                    progress_percent={getProgress(course)}
                    user_plan={userPlan}
                  />
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Continuar assistindo */}
      {(() => {
        const inProgress = (courses ?? []).filter(c => {
          const p = getProgress(c)
          return p > 0 && p < 100
        })
        if (!inProgress.length) return null
        return (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-1 h-5 rounded-full bg-[var(--orange)]" />
              <h2 className="text-base font-bold text-[var(--foreground)]">Continuar Assistindo</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {inProgress.map(course => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  slug={course.slug}
                  description={course.description}
                  thumbnail_url={course.thumbnail_url}
                  required_plan={course.required_plan as PlanType}
                  lesson_count={getLessonIds(course).length}
                  progress_percent={getProgress(course)}
                  user_plan={userPlan}
                />
              ))}
            </div>
          </section>
        )
      })()}
    </div>
  )
}
