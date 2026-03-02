import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Play, Lock, BookOpen, Map, ChevronRight, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanType } from '@/lib/supabase/types'

const PLAN_ORDER: Record<PlanType, number> = { basic: 0, pro: 1, elite: 2 }

export default async function ConteudosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, plans(type)')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .single()

  const userPlan: PlanType = (subscription?.plans as { type: PlanType } | null)?.type ?? 'basic'

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, slug, description, thumbnail_url, required_plan, order_index, modules(lessons(id))')
    .eq('is_published', true)
    .order('order_index')

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed')
    .eq('user_id', user!.id)

  const { data: paths } = await supabase
    .from('learning_paths')
    .select('id, title, slug, description, thumbnail_url, required_plan, learning_path_courses(courses(id, modules(lessons(id))))')

  const { data: enrollments } = await supabase
    .from('learning_path_enrollments')
    .select('learning_path_id')
    .eq('user_id', user!.id)

  const completedSet = new Set(progress?.filter(p => p.completed).map(p => p.lesson_id) ?? [])
  const enrolledSet = new Set(enrollments?.map(e => e.learning_path_id) ?? [])

  function getLessonIds(course: NonNullable<typeof courses>[number]) {
    return (course.modules as { lessons: { id: string }[] }[] ?? []).flatMap(m => m.lessons.map(l => l.id))
  }

  function getProgress(course: NonNullable<typeof courses>[number]) {
    const ids = getLessonIds(course)
    if (!ids.length) return 0
    const done = ids.filter(id => completedSet.has(id)).length
    return Math.round((done / ids.length) * 100)
  }

  function getPathProgress(path: NonNullable<typeof paths>[number]) {
    const lpc = path.learning_path_courses as { courses: { id: string; modules: { lessons: { id: string }[] }[] } | null }[]
    const ids = lpc.flatMap(lpc =>
      (lpc.courses?.modules ?? []).flatMap((m: { lessons: { id: string }[] }) => m.lessons.map(l => l.id))
    )
    if (!ids.length) return 0
    return Math.round((ids.filter(id => completedSet.has(id)).length / ids.length) * 100)
  }

  const allCourses = courses ?? []
  const featured = allCourses.find(c => PLAN_ORDER[c.required_plan as PlanType] <= PLAN_ORDER[userPlan]) ?? allCourses[0]
  const inProgress = allCourses.filter(c => { const p = getProgress(c); return p > 0 && p < 100 })
  const unlocked   = allCourses.filter(c => PLAN_ORDER[userPlan] >= PLAN_ORDER[c.required_plan as PlanType])
  const locked     = allCourses.filter(c => PLAN_ORDER[userPlan] < PLAN_ORDER[c.required_plan as PlanType])

  return (
    <div className="-mx-6 -mt-6 space-y-0">

      {/* ════════════════════════════════════════════
          HERO — featured content
      ════════════════════════════════════════════ */}
      {featured && (
        <div className="relative w-full h-[420px] overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            {featured.thumbnail_url ? (
              <img
                src={featured.thumbnail_url}
                alt={featured.title}
                className="w-full h-full object-cover scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--surface-2)] to-black" />
            )}
          </div>

          {/* Gradients para criar profundidade */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />

          {/* Accent glow vermelho */}
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, var(--cyan), transparent 70%)' }}
          />

          {/* Content */}
          <div className="relative h-full flex flex-col justify-end px-8 pb-10">
            <div className="max-w-xl">
              {/* Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--cyan)] text-black text-[10px] font-black tracking-wider uppercase">
                  <Star size={9} fill="black" /> Em Destaque
                </span>
                <span className="text-[11px] text-[var(--text-dim)] uppercase tracking-widest capitalize font-medium">
                  {featured.required_plan}
                </span>
              </div>

              <h1 className="text-3xl font-black text-white leading-tight mb-2">
                {featured.title}
              </h1>
              {featured.description && (
                <p className="text-sm text-[var(--text-dim)] line-clamp-2 mb-5 leading-relaxed">
                  {featured.description}
                </p>
              )}

              <div className="flex items-center gap-3">
                {PLAN_ORDER[userPlan] >= PLAN_ORDER[featured.required_plan as PlanType] ? (
                  <Link
                    href={`/cursos/${featured.slug}`}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-black font-black text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(230,48,48,0.4)]"
                  >
                    <Play size={14} fill="black" /> Assistir Agora
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/60 font-bold text-sm cursor-not-allowed border border-white/10">
                    <Lock size={14} /> Plano {featured.required_plan}
                  </div>
                )}
                <Link
                  href={`/cursos/${featured.slug}`}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/10"
                >
                  <BookOpen size={14} /> Ver detalhes
                </Link>
              </div>

              {getProgress(featured) > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 max-w-[200px] h-1 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--cyan)] rounded-full" style={{ width: `${getProgress(featured)}%` }} />
                  </div>
                  <span className="text-xs text-[var(--text-dim)]">{getProgress(featured)}% concluído</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          CONTEÚDO — carrosséis
      ════════════════════════════════════════════ */}
      <div className="px-8 py-8 space-y-10">

        {/* Continuar assistindo */}
        {inProgress.length > 0 && (
          <CarouselSection title="Continuar Assistindo" accent="var(--gold)">
            {inProgress.map(c => (
              <ContentCard
                key={c.id} title={c.title} slug={c.slug}
                thumbnail={c.thumbnail_url} plan={c.required_plan as PlanType}
                locked={false} progress={getProgress(c)}
                lessonCount={getLessonIds(c).length}
              />
            ))}
          </CarouselSection>
        )}

        {/* Trilhas de Aprendizado */}
        {(paths?.length ?? 0) > 0 && (
          <section>
            <SectionHeader title="Trilhas de Aprendizado" accent="var(--gold)" href="#" />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
              {paths!.map(path => {
                const isLocked = PLAN_ORDER[userPlan] < PLAN_ORDER[(path.required_plan as PlanType) ?? 'basic']
                const prog = getPathProgress(path)
                return (
                  <Link
                    key={path.id}
                    href={isLocked ? '#' : `/trilhas/${path.slug ?? path.id}`}
                    className={cn(
                      'snap-start shrink-0 w-[280px] rounded-xl overflow-hidden border transition-all duration-200 group relative',
                      'bg-[var(--surface-2)] border-[var(--border)]',
                      isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:border-[var(--gold)]/40 hover:shadow-[0_4px_24px_rgba(240,192,64,0.12)] hover:-translate-y-0.5'
                    )}
                  >
                    <div className="relative h-36 bg-[var(--surface-3)]">
                      {path.thumbnail_url
                        ? <img src={path.thumbnail_url} alt={path.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Map size={32} className="text-[var(--border-hi)]" /></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Lock size={20} className="text-[var(--gold)]" />
                        </div>
                      )}
                      {prog > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1">
                          <div className="h-full bg-[var(--gold)]" style={{ width: `${prog}%` }} />
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3">
                        {enrolledSet.has(path.id) && (
                          <span className="text-[10px] font-bold text-[var(--gold)] bg-[var(--gold)]/15 px-2 py-0.5 rounded-full border border-[var(--gold)]/30">
                            Inscrito
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-white line-clamp-1">{path.title}</h3>
                      {path.description && (
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{path.description}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Disponíveis para você */}
        {unlocked.length > 0 && (
          <CarouselSection title="Disponíveis para Você" accent="var(--cyan)">
            {unlocked.map(c => (
              <ContentCard
                key={c.id} title={c.title} slug={c.slug}
                thumbnail={c.thumbnail_url} plan={c.required_plan as PlanType}
                locked={false} progress={getProgress(c)}
                lessonCount={getLessonIds(c).length}
              />
            ))}
          </CarouselSection>
        )}

        {/* Conteúdo premium bloqueado */}
        {locked.length > 0 && (
          <CarouselSection title="Conteúdo Premium" accent="var(--gold)" subtitle="Faça upgrade para desbloquear">
            {locked.map(c => (
              <ContentCard
                key={c.id} title={c.title} slug={c.slug}
                thumbnail={c.thumbnail_url} plan={c.required_plan as PlanType}
                locked={true} progress={0}
                lessonCount={getLessonIds(c).length}
              />
            ))}
          </CarouselSection>
        )}

        {allCourses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen size={48} className="text-[var(--border-hi)] mb-4" />
            <h2 className="text-lg font-bold text-[var(--text-dim)]">Nenhum conteúdo ainda</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">O administrador ainda não publicou nenhum curso.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Componentes auxiliares ─────────────────────────── */

function SectionHeader({ title, accent, href, subtitle }: {
  title: string; accent: string; href?: string; subtitle?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="w-[3px] h-5 rounded-full shrink-0" style={{ background: accent }} />
        <div>
          <h2 className="text-base font-black text-white">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs text-[var(--text-dim)] hover:text-white transition-colors">
          Ver todos <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

function CarouselSection({ title, accent, subtitle, children }: {
  title: string; accent: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <section>
      <SectionHeader title={title} accent={accent} subtitle={subtitle} />
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x">
        {children}
      </div>
    </section>
  )
}

const PLAN_LABEL: Record<PlanType, string> = { basic: 'Básico', pro: 'Pro', elite: 'Elite' }

function ContentCard({ title, slug, thumbnail, plan, locked, progress, lessonCount }: {
  title: string; slug: string; thumbnail: string | null
  plan: PlanType; locked: boolean; progress: number; lessonCount: number
}) {
  return (
    <Link
      href={locked ? '#' : `/cursos/${slug}`}
      className={cn(
        'content-card snap-start shrink-0 w-[200px] rounded-xl overflow-hidden border group relative',
        'bg-[var(--surface-2)] border-[var(--border)]',
        locked && 'opacity-55 cursor-not-allowed'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[var(--surface-3)]">
        {thumbnail
          ? <img src={thumbnail} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={24} className="text-[var(--border-hi)]" /></div>
        }

        {/* Gradiente bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Play button */}
        {!locked && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-11 h-11 rounded-full bg-[var(--cyan)] flex items-center justify-center shadow-[0_0_16px_rgba(230,48,48,0.5)] scale-90 group-hover:scale-100 transition-transform">
              <Play size={16} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}

        {/* Lock */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Lock size={18} className="text-[var(--gold)]" />
            <span className="text-[10px] text-[var(--gold)] mt-1 font-bold">{PLAN_LABEL[plan]}</span>
          </div>
        )}

        {/* Progress bar */}
        {!locked && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div className="h-full bg-[var(--cyan)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">{title}</h3>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Clock size={10} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">{lessonCount} aulas</span>
          {!locked && progress > 0 && (
            <>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[10px] text-[var(--cyan)] font-semibold">{progress}%</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
