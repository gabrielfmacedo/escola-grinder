import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ announcements: [] })

  const now = new Date().toISOString()

  const { data } = await supabase
    .from('announcements')
    .select('id, title, message, created_at, action_url, action_label')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ announcements: data ?? [] })
}
