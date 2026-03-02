import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) return null
  return user
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: tags, error } = await supabase
    .from('tags')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tags: tags ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const slug = slugify(name.trim())
  const { data, error } = await supabase.from('tags').insert({
    name: name.trim(),
    slug,
    color: color ?? '#3b9ef5',
    created_by: user.id,
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tag: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id, name, color } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const updates: Record<string, string> = {}
  if (name) { updates.name = name.trim(); updates.slug = slugify(name.trim()) }
  if (color) updates.color = color

  const { error } = await supabase.from('tags').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // Check if in use
  const [{ count: courseCount }, { count: lessonCount }] = await Promise.all([
    supabase.from('course_tags').select('*', { count: 'exact', head: true }).eq('tag_id', id),
    supabase.from('lesson_tags').select('*', { count: 'exact', head: true }).eq('tag_id', id),
  ])

  if ((courseCount ?? 0) > 0 || (lessonCount ?? 0) > 0) {
    return NextResponse.json({ error: 'Tag em uso. Remova de cursos/aulas antes de deletar.' }, { status: 409 })
  }

  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
