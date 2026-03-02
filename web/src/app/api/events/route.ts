import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Return upcoming + recent past (last 7 days)
  const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString()

  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', cutoff)
    .order('starts_at', { ascending: true })
    .limit(50)

  return NextResponse.json({ events: data ?? [] })
}
