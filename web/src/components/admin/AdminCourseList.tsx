'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Edit2, Trash2, Eye, EyeOff, Video, FileText, X, Check, Loader2 } from 'lucide-react'
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

interface Props {
  initialCourses: Course[]
}

export default function AdminCourseList({ initialCourses }: Props) {
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  async function reload() {
    const res = await fetch('/api/admin/courses')
    if (res.ok) setCourses(await res.json())
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

  return (
    <div className="space-y-4">
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
        {courses.map(course => (
          <div key={course.id} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {/* Course header */}
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => toggle(course.id)}
                className="shrink-0 text-[var(--text-muted)] hover:text-white transition-colors"
              >
                {expanded.has(course.id)
                  ? <ChevronDown size={16} />
                  : <ChevronRight size={16} />
                }
              </button>

              {/* Thumbnail preview */}
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt="" className="w-12 h-8 object-cover rounded shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
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
                        {mod.lessons.map(lesson => (
                          <div key={lesson.id} className="flex items-center gap-2 px-8 py-1.5 hover:bg-white/[0.02] group">
                            {lesson.type.startsWith('video')
                              ? <Video size={11} className="text-[var(--cyan)] shrink-0" />
                              : <FileText size={11} className="text-[var(--gold)] shrink-0" />
                            }
                            <span className="text-xs text-[var(--text-dim)] flex-1 truncate">{lesson.title}</span>
                            {lesson.duration_minutes && (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {lesson.duration_minutes}min
                              </span>
                            )}
                            <button
                              onClick={() => deleteLesson(lesson.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--red)] transition-all"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
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
        ))}
      </div>
    </div>
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
