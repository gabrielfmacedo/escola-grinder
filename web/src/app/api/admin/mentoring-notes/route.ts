import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdminOrInstructor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'instructor'].includes(profile.role)) return null
  return user
}

// GET /api/admin/mentoring-notes?user_id=...
export async function GET(req: NextRequest) {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mentoring_notes')
    .select('*, admin:profiles!admin_id(full_name)')
    .eq('user_id', userId)
    .order('note_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/mentoring-notes
export async function POST(req: NextRequest) {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { user_id, note_date, content } = await req.json()
  if (!user_id || !content) return NextResponse.json({ error: 'user_id e content obrigatórios' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mentoring_notes')
    .insert({ user_id, admin_id: caller.id, note_date: note_date ?? new Date().toISOString().slice(0, 10), content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
