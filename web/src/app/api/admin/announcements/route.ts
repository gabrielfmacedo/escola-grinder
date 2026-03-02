import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'instructor'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { title, message, expires_at, action_url, action_label } = await req.json()
  if (!title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title,
      message: message ?? null,
      expires_at: expires_at ?? null,
      is_active: true,
      created_by: user.id,
      action_url: action_url ?? null,
      action_label: action_label ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'instructor'].includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id, is_active } = await req.json()
  const { error } = await supabase
    .from('announcements')
    .update({ is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
