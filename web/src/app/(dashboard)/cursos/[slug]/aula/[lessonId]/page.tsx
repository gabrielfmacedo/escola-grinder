import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight, ChevronLeft, ChevronRight as Next, CheckCircle } from 'lucide-react'
import VideoPlayer from '@/components/courses/VideoPlayer'
import LessonCompleteButton from '@/components/courses/LessonCompleteButton'
import { cn } from '@/lib/utils'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Busca aula + curso + módulo
  const { data: lesson } = await supabase
    .from('lessons')
    .select(`
      id, title, description, type, content_url, content_text, duration_minutes,
      module:modules(
        id, title, order_index,
        course:courses(id, title, slug, is_published)
      )
    `)
    .eq('id', lessonId)
    .single()

  if (!lesson) notFound()

  const module = lesson.module as {
    id: string; title: string; order_index: number;
    course: { id: string; title: string; slug: string; is_published: boolean }
  }

  if (module.course.slug !== slug || !module.course.is_published) notFound()

  // Todas as aulas do curso em ordem (para navegação)
  const { data: allModules } = await supabase
    .from('modules')
    .select('id, order_index, lessons(id, title, order_index)')
    .eq('course_id', module.course.id)
    .order('order_index')

  const orderedLessons = (allModules ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .flatMap(m =>
      [...(m.lessons as { id: string; title: string; order_index: number }[])]
        .sort((a, b) => a.order_index - b.order_index)
    )

  const currentIdx = orderedLessons.findIndex(l => l.id === lessonId)
  const prevLesson = currentIdx > 0 ? orderedLessons[currentIdx - 1] : null
  const nextLesson = currentIdx < orderedLessons.length - 1 ? orderedLessons[currentIdx + 1] : null

  // Progresso
  const { data: progressRow } = await supabase
    .from('lesson_progress')
    .select('completed')
    .eq('user_id', user!.id)
    .eq('lesson_id', lessonId)
    .single()

  const isCompleted = progressRow?.completed ?? false

  // Marcar como "iniciada" se ainda não tem registro (para CONTINUE ASSISTINDO no dashboard)
  if (!isCompleted) {
    await supabase.from('lesson_progress').upsert(
      {
        user_id: user!.id,
        lesson_id: lessonId,
        progress_percent: 10,
        last_watched_at: new Date().toISOString(),
        completed: false,
      },
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true }
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <Link href="/cursos" className="hover:text-[var(--foreground)] transition-colors">Cursos</Link>
        <ChevronRight size={12} />
        <Link href={`/cursos/${slug}`} className="hover:text-[var(--foreground)] transition-colors line-clamp-1">
          {module.course.title}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text-dim)] line-clamp-1">{lesson.title}</span>
      </nav>

      {/* Player */}
      {(lesson.type === 'video_youtube' || lesson.type === 'video_drive') && (
        <div className="rounded-2xl overflow-hidden">
          <VideoPlayer
            type={lesson.type}
            url={lesson.content_url}
            title={lesson.title}
          />
        </div>
      )}

      {/* Título + status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">{module.title}</p>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{lesson.title}</h1>
          {lesson.description && (
            <p className="text-sm text-[var(--text-dim)] mt-2">{lesson.description}</p>
          )}
        </div>

        {isCompleted ? (
          <div className="flex items-center gap-1.5 text-[var(--green)] text-sm shrink-0">
            <CheckCircle size={16} />
            Concluída
          </div>
        ) : (
          <LessonCompleteButton lessonId={lessonId} />
        )}
      </div>

      {/* Conteúdo texto */}
      {lesson.type === 'text' && lesson.content_text && (
        <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 prose prose-invert prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: lesson.content_text }} />
        </div>
      )}

      {/* Navegação entre aulas */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        {prevLesson ? (
          <Link
            href={`/cursos/${slug}/aula/${prevLesson.id}`}
            className="flex items-center gap-2 text-sm text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="line-clamp-1 max-w-[180px]">{prevLesson.title}</span>
          </Link>
        ) : <div />}

        {nextLesson ? (
          <Link
            href={`/cursos/${slug}/aula/${nextLesson.id}`}
            className="flex items-center gap-2 text-sm text-[var(--cyan)] hover:text-[var(--cyan-light)] transition-colors group"
          >
            <span className="line-clamp-1 max-w-[180px]">{nextLesson.title}</span>
            <Next size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <Link
            href={`/cursos/${slug}`}
            className={cn(
              'flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-colors',
              'bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20'
            )}
          >
            <CheckCircle size={14} />
            Curso concluído!
          </Link>
        )}
      </div>
    </div>
  )
}
