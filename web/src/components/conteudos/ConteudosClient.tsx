'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Play, Lock, BookOpen, Map, ChevronRight, Clock, Star, Search, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanType } from '@/lib/supabase/types'

const PLAN_ORDER: Record<PlanType, number> = { basic: 0, pro: 1, elite: 2 }
const PLAN_LABEL: Record<PlanType, string> = { basic: 'Básico', pro: 'Pro', elite: 'Elite' }

type Lesson = { id: string; title: string }
type Module = { id: string; lessons: Lesson[] }
type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  required_plan: string
  order_index: number
  modules: Module[]
}
type LearningPath = {
  id: string
  title: string
  slug: string | null
  description: string | null
  thumbnail_url: string | null
  required_plan: string
  learning_path_courses: { courses: { id: string; modules: { lessons: { id: string }[] }[] } | null }[]
}
type TagRow = { id: string; name: string; color: string; slug: string }
type CourseTag = { course_id: string; tag_id: string }
type LessonTag = { lesson_id: string; tag_id: string }

export default function ConteudosClient({
  courses,
  learningPaths,
  completedLessonIds,
  enrolledPathIds,
  userPlan,
  tags,
  courseTags,
  lessonTags,
}: {
  courses: Course[]
  learningPaths: LearningPath[]
  completedLessonIds: string[]
  enrolledPathIds: string[]
  userPlan: PlanType
  tags: TagRow[]
  courseTags: CourseTag[]
  lessonTags: LessonTag[]
}) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [searchText, setSearchText] = useState('')

  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds])
  const enrolledSet = useMemo(() => new Set(enrolledPathIds), [enrolledPathIds])

  function getLessonIds(course: Course): string[] {
    return course.modules.flatMap(m => m.lessons.map(l => l.id))
  }

  function getLessonTitles(course: Course): string[] {
    return course.modules.flatMap(m => m.lessons.map(l => l.title))
  }

  function getProgress(course: Course): number {
    const ids = getLessonIds(course)
    if (!ids.length) return 0
    return Math.round((ids.filter(id => completedSet.has(id)).length / ids.length) * 100)
  }

  function getPathProgress(path: LearningPath): number {
    const ids = path.learning_path_courses.flatMap(lpc =>
      (lpc.courses?.modules ?? []).flatMap(m => m.lessons.map(l => l.id))
    )
    if (!ids.length) return 0
    return Math.round((ids.filter(id => completedSet.has(id)).length / ids.length) * 100)
  }

  function toggleTag(id: string) {
    setSelectedTags(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const hasFilter = selectedTags.size > 0 || searchText.trim().length > 0
  const search = searchText.trim().toLowerCase()

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Tag filter: course must have one of the selected tags OR a lesson with one of the selected tags
      if (selectedTags.size > 0) {
        const hasCourseTag = courseTags.some(ct => ct.course_id === course.id && selectedTags.has(ct.tag_id))
        const allLessonIds = getLessonIds(course)
        const hasLessonTag = lessonTags.some(lt => allLessonIds.includes(lt.lesson_id) && selectedTags.has(lt.tag_id))
        if (!hasCourseTag && !hasLessonTag) return false
      }

      // Text search: course title, description, or lesson titles
      if (search) {
        const inTitle = course.title.toLowerCase().includes(search)
        const inDesc = course.description?.toLowerCase().includes(search) ?? false
        const inLesson = getLessonTitles(course).some(t => t.toLowerCase().includes(search))
        if (!inTitle && !inDesc && !inLesson) return false
      }

      return true
    })
  }, [courses, selectedTags, search, courseTags, lessonTags])

  const featured = courses.find(c => PLAN_ORDER[c.required_plan as PlanType] <= PLAN_ORDER[userPlan]) ?? courses[0]
  const inProgress = courses.filter(c => { const p = getProgress(c); return p > 0 && p < 100 })
  const unlocked = courses.filter(c => PLAN_ORDER[userPlan] >= PLAN_ORDER[c.required_plan as PlanType])
  const locked = courses.filter(c => PLAN_ORDER[userPlan] < PLAN_ORDER[c.required_plan as PlanType])

  return (
    <div className="-mx-6 -mt-6 space-y-0">
      {/* Hero — only when no filter active */}
      {!hasFilter && featured && (
        <div className="relative w-full h-[420px] overflow-hidden">
          <div className="absolute inset-0">
            {featured.thumbnail_url ? (
              <img src={featured.thumbnail_url} alt={featured.title} className="w-full h-full object-cover scale-105" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--surface-2)] to-black" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, var(--cyan), transparent 70%)' }} />
          <div className="relative h-full flex flex-col justify-end px-8 pb-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--cyan)] text-black text-[10px] font-black tracking-wider uppercase">
                  <Star size={9} fill="black" /> Em Destaque
                </span>
                <span className="text-[11px] text-[var(--text-dim)] uppercase tracking-widest capitalize font-medium">
                  {featured.required_plan}
                </span>
              </div>
              <h1 className="text-3xl font-black text-white leading-tight mb-2">{featured.title}</h1>
              {featured.description && (
                <p className="text-sm text-[var(--text-dim)] line-clamp-2 mb-5 leading-relaxed">{featured.description}</p>
              )}
              <div className="flex items-center gap-3">
                {PLAN_ORDER[userPlan] >= PLAN_ORDER[featured.required_plan as PlanType] ? (
                  <Link href={`/cursos/${featured.slug}`}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-black font-black text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(230,48,48,0.4)]">
                    <Play size={14} fill="black" /> Assistir Agora
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/60 font-bold text-sm cursor-not-allowed border border-white/10">
                    <Lock size={14} /> Plano {featured.required_plan}
                  </div>
                )}
                <Link href={`/cursos/${featured.slug}`}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/10">
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

      <div className="px-8 py-8 space-y-8">
        {/* Search + Tag filter bar */}
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Buscar cursos e aulas..."
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60 transition-colors"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={13} className="text-[var(--text-muted)] shrink-0" />
              {tags.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                    selectedTags.has(t.id)
                      ? 'border-transparent scale-105'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hi)] bg-transparent'
                  )}
                  style={selectedTags.has(t.id) ? {
                    backgroundColor: t.color + '22',
                    color: t.color,
                    borderColor: t.color + '44',
                  } : {}}
                >
                  {t.name}
                </button>
              ))}
              {selectedTags.size > 0 && (
                <button
                  onClick={() => setSelectedTags(new Set())}
                  className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1 transition-colors"
                >
                  <X size={11} /> Limpar
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── FILTERED VIEW ── */}
        {hasFilter ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[3px] h-5 rounded-full shrink-0 bg-[var(--cyan)]" />
              <h2 className="text-base font-black text-white">
                {filteredCourses.length} resultado{filteredCourses.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)] text-sm">
                <Search size={32} className="mx-auto mb-3 text-[var(--border-hi)]" />
                <p>Nenhum curso encontrado para os filtros aplicados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredCourses.map(c => {
                  const locked = PLAN_ORDER[userPlan] < PLAN_ORDER[c.required_plan as PlanType]
                  const prog = getProgress(c)
                  const lessonCount = getLessonIds(c).length
                  // Get tags for this course
                  const cTags = courseTags
                    .filter(ct => ct.course_id === c.id)
                    .map(ct => tags.find(t => t.id === ct.tag_id))
                    .filter(Boolean) as TagRow[]
                  return (
                    <ContentCard
                      key={c.id}
                      title={c.title}
                      slug={c.slug}
                      thumbnail={c.thumbnail_url}
                      plan={c.required_plan as PlanType}
                      locked={locked}
                      progress={locked ? 0 : prog}
                      lessonCount={lessonCount}
                      tags={cTags}
                    />
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── ORIGINAL CAROUSEL VIEW ── */
          <div className="space-y-10">
            {/* Continuar assistindo */}
            {inProgress.length > 0 && (
              <CarouselSection title="Continuar Assistindo" accent="var(--gold)">
                {inProgress.map(c => (
                  <ContentCard
                    key={c.id} title={c.title} slug={c.slug}
                    thumbnail={c.thumbnail_url} plan={c.required_plan as PlanType}
                    locked={false} progress={getProgress(c)} lessonCount={getLessonIds(c).length}
                  />
                ))}
              </CarouselSection>
            )}

            {/* Trilhas de Aprendizado */}
            {learningPaths.length > 0 && (
              <section>
                <SectionHeader title="Trilhas de Aprendizado" accent="var(--gold)" />
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
                  {learningPaths.map(path => {
                    const isLocked = PLAN_ORDER[userPlan] < PLAN_ORDER[(path.required_plan as PlanType) ?? 'basic']
                    const prog = getPathProgress(path)
                    return (
                      <Link key={path.id}
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
                    locked={false} progress={getProgress(c)} lessonCount={getLessonIds(c).length}
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
                    locked={true} progress={0} lessonCount={getLessonIds(c).length}
                  />
                ))}
              </CarouselSection>
            )}

            {courses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <BookOpen size={48} className="text-[var(--border-hi)] mb-4" />
                <h2 className="text-lg font-bold text-[var(--text-dim)]">Nenhum conteúdo ainda</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">O administrador ainda não publicou nenhum curso.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────── */

function SectionHeader({ title, accent, subtitle }: { title: string; accent: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="w-[3px] h-5 rounded-full shrink-0" style={{ background: accent }} />
        <div>
          <h2 className="text-base font-black text-white">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
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

function ContentCard({ title, slug, thumbnail, plan, locked, progress, lessonCount, tags }: {
  title: string; slug: string; thumbnail: string | null
  plan: PlanType; locked: boolean; progress: number; lessonCount: number
  tags?: TagRow[]
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
      <div className="relative aspect-video bg-[var(--surface-3)]">
        {thumbnail
          ? <img src={thumbnail} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={24} className="text-[var(--border-hi)]" /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {!locked && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-11 h-11 rounded-full bg-[var(--cyan)] flex items-center justify-center shadow-[0_0_16px_rgba(230,48,48,0.5)] scale-90 group-hover:scale-100 transition-transform">
              <Play size={16} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Lock size={18} className="text-[var(--gold)]" />
            <span className="text-[10px] text-[var(--gold)] mt-1 font-bold">{PLAN_LABEL[plan]}</span>
          </div>
        )}
        {!locked && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div className="h-full bg-[var(--cyan)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
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
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map(t => (
              <span key={t.id} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: t.color + '22', color: t.color }}>
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
