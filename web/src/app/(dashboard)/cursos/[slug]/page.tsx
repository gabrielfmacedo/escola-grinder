import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight, Play, CheckCircle, Lock, Clock } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PlanType } from '@/lib/supabase/types'

const PLAN_ORDER: Record<PlanType, number> = { basic: 0, pro: 1, elite: 2 }

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, title, description, thumbnail_url, required_plan,
      modules(
        id, title, order_index,
        lessons(id, title, description, type, duration_minutes, order_index, is_free_preview)
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!course) notFound()

  // Plano do usuário
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plans(type)')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .single()

  const userPlan: PlanType = (subscription?.plans as { type: PlanType } | null)?.type ?? 'basic'
  const hasAccess = PLAN_ORDER[userPlan] >= PLAN_ORDER[course.required_plan as PlanType]

  // Progresso
  const allLessonIds = (course.modules as { lessons: { id: string }[] }[] ?? [])
    .flatMap(m => m.lessons.map(l => l.id))

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed')
    .eq('user_id', user!.id)
    .in('lesson_id', allLessonIds)

  const completedSet = new Set(
    progress?.filter(p => p.completed).map(p => p.lesson_id) ?? []
  )

  const totalLessons = allLessonIds.length
  const completedCount = allLessonIds.filter(id => completedSet.has(id)).length
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const sortedModules = [...(course.modules as {
    id: string; title: string; order_index: number;
    lessons: { id: string; title: string; description: string | null; type: string; duration_minutes: number | null; order_index: number; is_free_preview: boolean }[]
  }[] ?? [])].sort((a, b) => a.order_index - b.order_index)

  // Primeira aula disponível para o CTA
  const firstLesson = sortedModules[0]?.lessons
    .sort((a, b) => a.order_index - b.order_index)[0]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Link href="/cursos" className="hover:text-[var(--foreground)] transition-colors">Cursos</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--foreground)]">{course.title}</span>
      </nav>

      {/* Hero do curso */}
      <div className="relative rounded-2xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)]">
        {course.thumbnail_url && (
          <div className="relative h-48 sm:h-60">
            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-2)] via-[var(--surface-2)]/40 to-transparent" />
          </div>
        )}
        <div className="p-6">
          <h1 className="text-xl font-bold text-[var(--foreground)]">{course.title}</h1>
          {course.description && (
            <p className="text-sm text-[var(--text-dim)] mt-2 max-w-2xl">{course.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4">
            {/* Progresso */}
            {hasAccess && totalLessons > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-32 h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--cyan)] rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {completedCount}/{totalLessons} aulas
                </span>
              </div>
            )}

            {/* CTA */}
            {hasAccess && firstLesson && (
              <Link
                href={`/cursos/${slug}/aula/${firstLesson.id}`}
                className="inline-flex items-center gap-2 bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-black text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <Play size={14} fill="black" />
                {progressPercent > 0 ? 'Continuar' : 'Começar curso'}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Lista de módulos e aulas */}
      <div className="space-y-3">
        {sortedModules.map((module, mIdx) => {
          const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index)
          const moduleDuration = sortedLessons.reduce((acc, l) => acc + (l.duration_minutes ?? 0), 0)

          return (
            <div key={module.id} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl overflow-hidden">
              {/* Cabeçalho do módulo */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] font-mono">M{mIdx + 1}</span>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{module.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span>{sortedLessons.length} aulas</span>
                  {moduleDuration > 0 && <span>{formatDuration(moduleDuration)}</span>}
                </div>
              </div>

              {/* Aulas */}
              <div className="divide-y divide-[var(--border)]">
                {sortedLessons.map((lesson, lIdx) => {
                  const isDone = completedSet.has(lesson.id)
                  const canAccess = hasAccess || lesson.is_free_preview

                  return (
                    <div key={lesson.id} className={cn(
                      'flex items-center gap-3 px-5 py-3 transition-colors',
                      canAccess ? 'hover:bg-white/[0.02]' : 'opacity-50'
                    )}>
                      {/* Ícone de status */}
                      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                        {isDone ? (
                          <CheckCircle size={16} className="text-[var(--green)]" />
                        ) : !canAccess ? (
                          <Lock size={14} className="text-[var(--text-muted)]" />
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] font-mono">{lIdx + 1}</span>
                        )}
                      </div>

                      {/* Info da aula */}
                      <div className="flex-1 min-w-0">
                        {canAccess ? (
                          <Link
                            href={`/cursos/${slug}/aula/${lesson.id}`}
                            className="text-sm text-[var(--foreground)] hover:text-[var(--cyan)] transition-colors line-clamp-1"
                          >
                            {lesson.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-[var(--text-dim)] line-clamp-1">{lesson.title}</span>
                        )}
                        {lesson.is_free_preview && !hasAccess && (
                          <span className="text-[10px] text-[var(--gold)] font-semibold">Preview gratuito</span>
                        )}
                      </div>

                      {/* Duração */}
                      {lesson.duration_minutes && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] shrink-0">
                          <Clock size={11} />
                          {formatDuration(lesson.duration_minutes)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
