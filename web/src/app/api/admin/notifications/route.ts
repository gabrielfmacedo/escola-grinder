import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['admin', 'instructor'].includes(p.role)) return null
  return user
}

// POST — enviar notificação
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { title, message, type, target, action_url } = await req.json()
  if (!title || !message) return NextResponse.json({ error: 'Título e mensagem obrigatórios' }, { status: 400 })

  const admin = createAdminClient()
  let userIds: string[] = []

  if (target && target !== 'all') {
    userIds = [target]
  } else {
    const { data: students } = await admin.from('profiles').select('id').in('role', ['student', 'instructor'])
    userIds = students?.map((s: { id: string }) => s.id) ?? []
  }

  if (!userIds.length) return NextResponse.json({ error: 'Nenhum destinatário encontrado' }, { status: 400 })

  const notifications = userIds.map(id => ({
    user_id: id,
    type: type ?? 'system',
    title,
    message,
    action_url: action_url ?? null,
    is_read: false,
  }))

  const { error } = await admin.from('notifications').insert(notifications)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, sent: userIds.length })
}
