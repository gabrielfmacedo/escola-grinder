import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { lesson_id } = await req.json()
  if (!lesson_id) {
    return NextResponse.json({ error: 'lesson_id obrigatório' }, { status: 400 })
  }

  const { error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: user.id,
      lesson_id,
      completed: true,
      progress_percent: 100,
      last_watched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

  if (error) {
    console.error('[POST /api/progress] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
