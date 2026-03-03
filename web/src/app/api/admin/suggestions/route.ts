import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SuggestionStatus } from '@/lib/supabase/types'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'instructor')) return null
  return user
}

export async function GET() {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data } = await supabase
    .from('suggestions')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  return NextResponse.json({ suggestions: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id, status, admin_notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const validStatuses: SuggestionStatus[] = ['pending', 'reviewing', 'approved', 'implemented', 'rejected']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status
  if (admin_notes !== undefined) updates.admin_notes = admin_notes

  const { error } = await supabase.from('suggestions').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
