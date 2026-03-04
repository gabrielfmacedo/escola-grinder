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

// GET /api/admin/player-stats?user_id=...
export async function GET(req: NextRequest) {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const [{ data: stats }, { data: overrides }, { data: configs }] = await Promise.all([
    admin.from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false }),
    admin.from('player_stat_overrides')
      .select('*')
      .eq('user_id', userId),
    admin.from('stat_configs')
      .select('*')
      .order('sort_order')
      .order('name'),
  ])

  return NextResponse.json({ stats: stats ?? [], overrides: overrides ?? [], configs: configs ?? [] })
}

// POST /api/admin/player-stats — add a new snapshot
export async function POST(req: NextRequest) {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { user_id, stat_config_id, value, recorded_at } = await req.json()
  if (!user_id || !stat_config_id || value === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('player_stats')
    .insert({ user_id, stat_config_id, value, recorded_at: recorded_at ?? new Date().toISOString().slice(0, 10) })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT /api/admin/player-stats — upsert per-player ideal range override
export async function PUT(req: NextRequest) {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { user_id, stat_config_id, ideal_min, ideal_max } = await req.json()
  if (!user_id || !stat_config_id) {
    return NextResponse.json({ error: 'user_id e stat_config_id obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('player_stat_overrides')
    .upsert({ user_id, stat_config_id, ideal_min, ideal_max }, { onConflict: 'user_id,stat_config_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/player-stats — delete a snapshot by id (body: { id })
export async function DELETE(req: NextRequest) {
  const caller = await requireAdminOrInstructor()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('player_stats').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
