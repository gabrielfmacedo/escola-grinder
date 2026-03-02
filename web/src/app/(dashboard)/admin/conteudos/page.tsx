import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import AdminCourseList from '@/components/admin/AdminCourseList'

export default async function AdminConteudosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'instructor'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: courses } = await admin
    .from('courses')
    .select('id, title, slug, description, thumbnail_url, required_plan, is_published, order_index, modules(id, title, order_index, lessons(id, title, type, order_index, duration_minutes))')
    .order('order_index')

  const published = courses?.filter(c => c.is_published).length ?? 0
  const drafts    = courses?.filter(c => !c.is_published).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Gerenciar Conteúdos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Crie e edite cursos, módulos e aulas.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total de Cursos',  value: courses?.length ?? 0, color: 'var(--text-dim)',  icon: BookOpen },
          { label: 'Publicados',       value: published,             color: 'var(--green)',     icon: Eye },
          { label: 'Rascunhos',        value: drafts,                color: 'var(--gold)',      icon: EyeOff },
        ].map(item => (
          <div key={item.label} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
            <item.icon size={18} style={{ color: item.color }} />
            <div>
              <p className="text-xl font-black text-white">{item.value}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Course list + management */}
      <AdminCourseList initialCourses={courses ?? []} />
    </div>
  )
}
