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

// POST — criar módulo
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { course_id, title } = await req.json()
  if (!course_id || !title) return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 })

  const admin = createAdminClient()
  const { data: last } = await admin.from('modules').select('order_index').eq('course_id', course_id).order('order_index', { ascending: false }).limit(1).single()
  const order_index = (last?.order_index ?? 0) + 1

  const { data, error } = await admin.from('modules').insert({ course_id, title, order_index }).select('id, title').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// PUT — renomear módulo
export async function PUT(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id, title } = await req.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('modules').update({ title }).eq('id', id).select('id, title').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE — remover módulo (e suas aulas via CASCADE)
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  const admin = createAdminClient()
  const { error } = await admin.from('modules').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
