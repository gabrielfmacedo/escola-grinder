import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data } = await supabase
    .from('suggestions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ suggestions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { title, body } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
  if (!body?.trim()) return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 })

  const { data, error } = await supabase
    .from('suggestions')
    .insert({ user_id: user.id, title: title.trim(), body: body.trim() })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
