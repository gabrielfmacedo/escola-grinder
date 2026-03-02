import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminNotificationSender from '@/components/admin/AdminNotificationSender'

export default async function AdminNotificacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'instructor'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: students } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'student')
    .order('full_name')

  // Últimas notificações enviadas pelo sistema
  const { data: recent } = await admin
    .from('notifications')
    .select('id, title, message, type, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  // Agrupa para mostrar apenas notificações únicas (sem duplicar por usuário)
  const uniqueRecent = recent
    ? Object.values(
        recent.reduce<Record<string, typeof recent[number]>>((acc, n) => {
          const key = `${n.title}|${n.message}|${n.type}|${n.created_at?.slice(0, 16)}`
          if (!acc[key]) acc[key] = n
          return acc
        }, {})
      ).slice(0, 10)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Enviar Notificações</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Envie mensagens para todos os alunos ou um aluno específico.</p>
      </div>

      <AdminNotificationSender students={students ?? []} recentNotifications={uniqueRecent} />
    </div>
  )
}
