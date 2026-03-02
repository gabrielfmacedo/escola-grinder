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

// POST — criar aula
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { module_id, title, type, content_url, content_text, duration_minutes, is_free_preview } = await req.json()
  if (!module_id || !title) return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 })

  const admin = createAdminClient()
  const { data: last } = await admin.from('lessons').select('order_index').eq('module_id', module_id).order('order_index', { ascending: false }).limit(1).single()
  const order_index = (last?.order_index ?? 0) + 1

  const { data, error } = await admin.from('lessons').insert({
    module_id, title, type: type ?? 'video',
    content_url: content_url ?? null,
    content_text: content_text ?? null,
    duration_minutes: duration_minutes ?? null,
    is_free_preview: is_free_preview ?? false,
    order_index,
  }).select('id, title').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// PUT — atualizar aula
export async function PUT(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id, title, type, content_url, content_text, duration_minutes, is_free_preview } = await req.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('lessons').update({
    title, type, content_url, content_text, duration_minutes, is_free_preview
  }).eq('id', id).select('id, title').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

// DELETE — remover aula
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  const admin = createAdminClient()
  const { error } = await admin.from('lessons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
