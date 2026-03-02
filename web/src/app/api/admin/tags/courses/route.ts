import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) return null
  return user
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data } = await supabase.from('course_tags').select('course_id, tag_id')
  return NextResponse.json({ course_tags: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { course_id, tag_id } = await req.json()
  if (!course_id || !tag_id) return NextResponse.json({ error: 'course_id e tag_id obrigatórios' }, { status: 400 })

  const { error } = await supabase.from('course_tags').upsert({ course_id, tag_id }, { onConflict: 'course_id,tag_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { course_id, tag_id } = await req.json()
  if (!course_id || !tag_id) return NextResponse.json({ error: 'course_id e tag_id obrigatórios' }, { status: 400 })

  const { error } = await supabase.from('course_tags').delete().eq('course_id', course_id).eq('tag_id', tag_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
