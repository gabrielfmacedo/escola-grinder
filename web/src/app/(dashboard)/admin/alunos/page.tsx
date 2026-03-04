import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import AddStudentButton from '@/components/admin/AddStudentButton'
import StudentsListClient from '@/components/admin/StudentsListClient'

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Alunos</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{students?.length ?? 0} usuários cadastrados</p>
        </div>
        <AddStudentButton />
      </div>

      {!students?.length ? (
        <div className="text-center py-20">
          <Users size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">Nenhum aluno cadastrado.</p>
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <StudentsListClient students={students as any} />
      )}
    </div>
  )
}
