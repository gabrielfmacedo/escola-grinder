import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'instructor'].includes(profile.role)) return null
  return user
}

// GET — listar todos os cursos (admin)
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('courses')
    .select('id, title, slug, description, thumbnail_url, required_plan, is_published, order_index, modules(id, title, order_index, lessons(id, title, order_index, type, duration_minutes))')
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — criar novo curso
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { title, slug, description, thumbnail_url, required_plan, is_published } = body

  if (!title || !slug) return NextResponse.json({ error: 'Título e slug são obrigatórios' }, { status: 400 })

  const admin = createAdminClient()

  const { data: last } = await admin.from('courses').select('order_index').order('order_index', { ascending: false }).limit(1).single()
  const order_index = (last?.order_index ?? 0) + 1

  const { data, error } = await admin
    .from('courses')
    .insert({ title, slug, description, thumbnail_url, required_plan: required_plan ?? 'basic', is_published: is_published ?? false, order_index, instructor_id: user.id })
    .select('id, title, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (is_published) {
    await notifyAllStudents(admin, {
      type: 'new_content',
      title: '📚 Novo curso disponível!',
      message: `O curso "${title}" foi publicado. Acesse agora!`,
    })
  }

  return NextResponse.json(data)
}

// PUT — atualizar curso
export async function PUT(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { id, title, slug, description, thumbnail_url, required_plan, is_published } = body
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  const { data: before } = await admin.from('courses').select('is_published, title').eq('id', id).single()

  const { data, error } = await admin
    .from('courses')
    .update({ title, slug, description, thumbnail_url, required_plan, is_published })
    .eq('id', id)
    .select('id, title')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (is_published && !before?.is_published) {
    await notifyAllStudents(admin, {
      type: 'new_content',
      title: '📚 Novo curso disponível!',
      message: `O curso "${title ?? before?.title}" acaba de ser publicado!`,
    })
  }

  return NextResponse.json(data)
}

// DELETE — remover curso
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('courses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

// Helper — notificar todos os alunos
async function notifyAllStudents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  payload: { type: string; title: string; message: string }
) {
  const { data: students } = await admin.from('profiles').select('id').eq('role', 'student')
  if (!students?.length) return

  const notifications = students.map((s: { id: string }) => ({
    user_id: s.id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    is_read: false,
  }))

  await admin.from('notifications').insert(notifications)
}
