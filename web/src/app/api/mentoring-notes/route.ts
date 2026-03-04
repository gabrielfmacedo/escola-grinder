import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/mentoring-notes — player reads their own notes
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('mentoring_notes')
    .select('*, admin:profiles!admin_id(full_name)')
    .eq('user_id', user.id)
    .order('note_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
