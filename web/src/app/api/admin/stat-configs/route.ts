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

// GET /api/admin/stat-configs
export async function GET() {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('stat_configs')
    .select('*')
    .order('sort_order')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/admin/stat-configs
export async function POST(req: NextRequest) {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { name, unit, ideal_min, ideal_max, description, sort_order } = await req.json()
  if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('stat_configs')
    .insert({ name, unit: unit ?? '%', ideal_min, ideal_max, description, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
