'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, Eye, EyeOff, Video, FileText, X, Check, Loader2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type Lesson = {
  id: string
  title: string
  type: string
  order_index: number
  duration_minutes: number | null
}

type Module = {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  required_plan: string
  is_published: boolean
  order_index: number
  modules: Module[]
}

type TagRow = {
  id: string
  name: string
  color: string
  slug: string
}

type CourseTag = { course_id: string; tag_id: string }
type LessonTag = { lesson_id: string; tag_id: string }

interface Props {
  initialCourses: Course[]
  initialTags: TagRow[]
  initialCourseTags: CourseTag[]
  initialLessonTags: LessonTag[]
}

const TAG_COLORS = ['#3b9ef5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminCourseList({ initialCourses, initialTags, initialCourseTags, initialLessonTags }: Props) {
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [tags, setTags] = useState<TagRow[]>(initialTags)
  const [courseTags, setCourseTags] = useState<CourseTag[]>(initialCourseTags)
  const [lessonTags, setLessonTags] = useState<LessonTag[]>(initialLessonTags)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [showTagForm, setShowTagForm] = useState(false)

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  async function reload() {
    const [coursesRes, tagsRes, ctRes, ltRes] = await Promise.all([
      fetch('/api/admin/courses').then(r => r.json()),
      fetch('/api/admin/tags').then(r => r.json()),
      fetch('/api/admin/tags/courses').then(r => r.json()).catch(() => ({ course_tags: [] })),
      fetch('/api/admin/tags/lessons').then(r => r.json()).catch(() => ({ lesson_tags: [] })),
    ])
    setCourses(Array.isArray(coursesRes) ? coursesRes : [])
    setTags(tagsRes.tags ?? [])
    setCourseTags(ctRes.course_tags ?? [])
    setLessonTags(ltRes.lesson_tags ?? [])
  }

  async function reloadTags() {
    const [tagsRes, ctRes, ltRes] = await Promise.all([
      fetch('/api/admin/tags').then(r => r.json()),
      fetch('/api/admin/tags/courses').then(r => r.json()).catch(() => ({ course_tags: [] })),
      fetch('/api/admin/tags/lessons').then(r => r.json()).catch(() => ({ lesson_tags: [] })),
    ])
    setTags(tagsRes.tags ?? [])
    setCourseTags(ctRes.course_tags ?? [])
    setLessonTags(ltRes.lesson_tags ?? [])
  }

  async function togglePublish(course: Course) {
    setLoading(true)
    await fetch('/api/admin/courses', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: course.id, is_published: !course.is_published }),
    })
    await reload()
    setLoading(false)
  }

  async function deleteCourse(id: string) {
    if (!confirm('Excluir este curso permanentemente?')) return
    setLoading(true)
    await fetch('/api/admin/courses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await reload()
    setLoading(false)
  }

  async function addModule(courseId: string) {
    const title = prompt('Nome do módulo:')
    if (!title) return
    setLoading(true)
    await fetch('/api/admin/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, title }),
    })
    await reload()
    setLoading(false)
  }

  async function deleteModule(id: string) {
    if (!confirm('Excluir módulo e todas as suas aulas?')) return
    setLoading(true)
    await fetch('/api/admin/modules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await reload()
    setLoading(false)
  }

  async function addLesson(moduleId: string) {
    const title = prompt('Título da aula:')
    if (!title) return
    const content_url = prompt('URL do vídeo (YouTube ou Google Drive):')
    setLoading(true)
    await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module_id: moduleId, title, content_url, type: 'video_youtube' }),
    })
    await reload()
    setLoading(false)
  }

  async function deleteLesson(id: string) {
    if (!confirm('Excluir esta aula?')) return
    setLoading(true)
    await fetch('/api/admin/lessons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await reload()
    setLoading(false)
  }

  async function addTagToCourse(courseId: string, tagId: string) {
    await fetch('/api/admin/tags/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, tag_id: tagId }),
    })
    setCourseTags(prev => [...prev.filter(ct => !(ct.course_id === courseId && ct.tag_id === tagId)), { course_id: courseId, tag_id: tagId }])
  }

  async function removeTagFromCourse(courseId: string, tagId: string) {
    await fetch('/api/admin/tags/courses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, tag_id: tagId }),
    })
    setCourseTags(prev => prev.filter(ct => !(ct.course_id === courseId && ct.tag_id === tagId)))
  }

  async function addTagToLesson(lessonId: string, tagId: string) {
    await fetch('/api/admin/tags/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, tag_id: tagId }),
    })
    setLessonTags(prev => [...prev.filter(lt => !(lt.lesson_id === lessonId && lt.tag_id === tagId)), { lesson_id: lessonId, tag_id: tagId }])
  }

  async function removeTagFromLesson(lessonId: string, tagId: string) {
    await fetch('/api/admin/tags/lessons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, tag_id: tagId }),
    })
    setLessonTags(prev => prev.filter(lt => !(lt.lesson_id === lessonId && lt.tag_id === tagId)))
  }

  async function deleteTag(id: string) {
    const res = await fetch('/api/admin/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(d.error ?? 'Erro ao deletar tag')
      return
    }
    setTags(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Tags section */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-[var(--text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--text-dim)]">Tags de Conteúdo</h2>
          </div>
          <button
            onClick={() => setShowTagForm(!showTagForm)}
            className="flex items-center gap-1.5 text-xs text-[var(--cyan)] hover:underline"
          >
            <Plus size={11} /> Nova Tag
          </button>
        </div>

        {showTagForm && (
          <TagForm
            onSaved={async () => { await reloadTags(); setShowTagForm(false) }}
            onClose={() => setShowTagForm(false)}
          />
        )}

        {tags.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Nenhuma tag criada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <span key={t.id} className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: t.color + '22', color: t.color, border: `1px solid ${t.color}44` }}>
                {t.name}
                <button
                  onClick={() => { if (confirm(`Deletar tag "${t.name}"?`)) deleteTag(t.id) }}
                  className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Header com botão criar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--text-dim)] uppercase tracking-wider">Cursos</h2>
        <button
          onClick={() => { setEditingCourse(null); setShowCourseForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-bold text-sm transition-colors"
        >
          <Plus size={14} /> Novo Curso
        </button>
      </div>

      {/* Modal criar/editar curso */}
      {showCourseForm && (
        <CourseForm
          course={editingCourse}
          onClose={() => { setShowCourseForm(false); setEditingCourse(null) }}
          onSaved={async () => { await reload(); setShowCourseForm(false); setEditingCourse(null) }}
        />
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" /> Salvando...
        </div>
      )}

      {courses.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-2xl">
          <p className="text-[var(--text-muted)] text-sm">Nenhum curso criado ainda.</p>
          <button
            onClick={() => setShowCourseForm(true)}
            className="mt-3 text-xs text-[var(--cyan)] hover:underline"
          >
            Criar primeiro curso →
          </button>
        </div>
      )}

      {/* Lista de cursos */}
      <div className="space-y-3">
        {courses.map(course => {
          const assignedCourseTags = courseTags
            .filter(ct => ct.course_id === course.id)
            .map(ct => tags.find(t => t.id === ct.tag_id))
            .filter(Boolean) as TagRow[]
          const unassignedCourseTags = tags.filter(t => !courseTags.some(ct => ct.course_id === course.id && ct.tag_id === t.id))

          return (
            <div key={course.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {/* Course header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggle(course.id)}
                  className="shrink-0 text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  {expanded.has(course.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {course.thumbnail_url && (
                  <img src={course.thumbnail_url} alt="" className="w-12 h-8 object-cover rounded shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-white truncate">{course.title}</p>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                      course.is_published
                        ? 'bg-[var(--green)]/15 text-[var(--green)]'
                        : 'bg-[var(--gold)]/15 text-[var(--gold)]'
                    )}>
                      {course.is_published ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] capitalize shrink-0">{course.required_plan}</span>
                    {assignedCourseTags.map(t => (
                      <span key={t.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: t.color + '22', color: t.color }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {course.modules.length} módulo{course.modules.length !== 1 ? 's' : ''} ·{' '}
                    {course.modules.reduce((a, m) => a + m.lessons.length, 0)} aulas
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePublish(course)}
                    title={course.is_published ? 'Despublicar' : 'Publicar'}
                    className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors"
                  >
                    {course.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => { setEditingCourse(course); setShowCourseForm(true) }}
                    className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="p-2 rounded-lg hover:bg-[var(--red)]/10 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Módulos expandidos */}
              {expanded.has(course.id) && (
                <div className="border-t border-[var(--border)] bg-[var(--surface-2)]">
                  {/* Course tags management */}
                  {tags.length > 0 && (
                    <div className="px-5 py-2.5 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Tags do curso:</span>
                      {assignedCourseTags.map(t => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: t.color + '22', color: t.color, border: `1px solid ${t.color}44` }}>
                          {t.name}
                          <button onClick={() => removeTagFromCourse(course.id, t.id)} className="hover:opacity-60">
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                      {unassignedCourseTags.length > 0 && (
                        <InlineTagAdd
                          tags={unassignedCourseTags}
                          onAdd={tagId => addTagToCourse(course.id, tagId)}
                        />
                      )}
                    </div>
                  )}

                  {course.modules.map(mod => (
                    <div key={mod.id} className="border-b border-[var(--border)] last:border-0">
                      {/* Module header */}
                      <div className="flex items-center gap-2 px-5 py-2.5">
                        <span className="text-[var(--text-muted)] text-xs font-medium flex-1 truncate">{mod.title}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{mod.lessons.length} aulas</span>
                        <button
                          onClick={() => addLesson(mod.id)}
                          className="flex items-center gap-1 text-[10px] text-[var(--cyan)] hover:underline px-2 py-1"
                        >
                          <Plus size={10} /> Aula
                        </button>
                        <button
                          onClick={() => deleteModule(mod.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Lessons */}
                      {mod.lessons.length > 0 && (
                        <div className="pb-1">
                          {mod.lessons.map(lesson => {
                            const assignedLessonTags = lessonTags
                              .filter(lt => lt.lesson_id === lesson.id)
                              .map(lt => tags.find(t => t.id === lt.tag_id))
                              .filter(Boolean) as TagRow[]
                            const unassignedLessonTags = tags.filter(t => !lessonTags.some(lt => lt.lesson_id === lesson.id && lt.tag_id === t.id))

                            return (
                              <div key={lesson.id} className="flex items-center gap-2 px-8 py-1.5 hover:bg-white/[0.02] group flex-wrap">
                                {lesson.type.startsWith('video')
                                  ? <Video size={11} className="text-[var(--cyan)] shrink-0" />
                                  : <FileText size={11} className="text-[var(--gold)] shrink-0" />
                                }
                                <span className="text-xs text-[var(--text-dim)] flex-1 truncate min-w-0">{lesson.title}</span>
                                {lesson.duration_minutes && (
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    {lesson.duration_minutes}min
                                  </span>
                                )}
                                {assignedLessonTags.map(t => (
                                  <span key={t.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                                    style={{ backgroundColor: t.color + '22', color: t.color }}>
                                    {t.name}
                                    <button onClick={() => removeTagFromLesson(lesson.id, t.id)} className="hover:opacity-60">
                                      <X size={8} />
                                    </button>
                                  </span>
                                ))}
                                {tags.length > 0 && unassignedLessonTags.length > 0 && (
                                  <InlineTagAdd
                                    tags={unassignedLessonTags}
                                    onAdd={tagId => addTagToLesson(lesson.id, tagId)}
                                    tiny
                                  />
                                )}
                                <button
                                  onClick={() => deleteLesson(lesson.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--red)] transition-all"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Adicionar módulo */}
                  <div className="px-5 py-3">
                    <button
                      onClick={() => addModule(course.id)}
                      className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                      <Plus size={12} /> Adicionar módulo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Inline tag adder ────────────────────────────── */
function InlineTagAdd({ tags, onAdd, tiny }: { tags: TagRow[]; onAdd: (id: string) => void; tiny?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-0.5 rounded-full text-[var(--text-muted)] hover:text-white border border-dashed border-[var(--border)] transition-colors',
          tiny ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
        )}
      >
        <Plus size={tiny ? 8 : 9} /> Tag
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl shadow-lg p-2 min-w-[120px] space-y-1">
          {tags.map(t => (
            <button
              key={t.id}
              onClick={() => { onAdd(t.id); setOpen(false) }}
              className="w-full text-left px-2 py-1 rounded text-xs hover:bg-white/5 transition-colors"
              style={{ color: t.color }}
            >
              {t.name}
            </button>
          ))}
          <button onClick={() => setOpen(false)} className="w-full text-left px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:bg-white/5">
            cancelar
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Tag form (create) ────────────────────────────── */
function TagForm({ onSaved, onClose }: { onSaved: () => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true)
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao criar tag')
      setLoading(false)
      return
    }
    await onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-3 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-3">
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nome da tag..."
          className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--cyan)]/60"
        />
        <div className="flex gap-1.5">
          {TAG_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn('w-5 h-5 rounded-full border-2 transition-all', color === c ? 'border-white scale-110' : 'border-transparent')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-[var(--red)]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="text-xs text-[var(--text-muted)] hover:text-white px-3 py-1.5 rounded-lg border border-[var(--border)] transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[var(--cyan)] text-white font-semibold disabled:opacity-50 hover:bg-[var(--cyan-light)] transition-colors"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Criar Tag
        </button>
      </div>
    </form>
  )
}

/* ── Modal de criação/edição de curso ──────────────── */
function CourseForm({
  course, onClose, onSaved
}: {
  course: Course | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: course?.title ?? '',
    slug: course?.slug ?? '',
    description: course?.description ?? '',
    thumbnail_url: course?.thumbnail_url ?? '',
    required_plan: course?.required_plan ?? 'basic',
    is_published: course?.is_published ?? false,
  })

  function autoSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const method = course ? 'PUT' : 'POST'
    const body = course ? { id: course.id, ...form } : form

    const res = await fetch('/api/admin/courses', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro ao salvar')
      setLoading(false)
      return
    }
    await onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-[var(--shadow-modal)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-black text-white">{course ? 'Editar Curso' : 'Novo Curso'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Título *">
            <input
              required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: course ? f.slug : autoSlug(e.target.value) }))}
              className="input-field"
              placeholder="Ex: Fundamentos do Hold'em"
            />
          </Field>

          <Field label="Slug *" hint="URL amigável, sem espaços">
            <input
              required value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              className="input-field"
              placeholder="fundamentos-holdem"
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field resize-none"
              rows={3}
              placeholder="Breve descrição do curso..."
            />
          </Field>

          <Field label="URL da Thumbnail">
            <input
              value={form.thumbnail_url}
              onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
              className="input-field"
              placeholder="https://..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Plano mínimo">
              <select
                value={form.required_plan}
                onChange={e => setForm(f => ({ ...f, required_plan: e.target.value }))}
                className="input-field"
              >
                <option value="basic">Básico</option>
                <option value="pro">Pro</option>
                <option value="elite">Elite</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.is_published ? 'true' : 'false'}
                onChange={e => setForm(f => ({ ...f, is_published: e.target.value === 'true' }))}
                className="input-field"
              >
                <option value="false">Rascunho</option>
                <option value="true">Publicado</option>
              </select>
            </Field>
          </div>

          {error && <p className="text-sm text-[var(--red)]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-dim)] text-sm font-semibold hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[var(--cyan)] hover:bg-[var(--cyan-light)] text-white font-black text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {course ? 'Salvar' : 'Criar Curso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5">
        {label} {hint && <span className="text-[var(--text-muted)] font-normal">— {hint}</span>}
      </label>
      {children}
    </div>
  )
}
