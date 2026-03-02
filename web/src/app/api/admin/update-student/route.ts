import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'instructor'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id, full_name, role, group_ids } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Update profile fields
  const updates: Record<string, string> = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (role !== undefined) updates.role = role

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sync group memberships
  if (Array.isArray(group_ids)) {
    // Remove all existing
    await admin.from('player_group_members').delete().eq('user_id', id)
    // Insert new
    if (group_ids.length > 0) {
      await admin.from('player_group_members').insert(
        group_ids.map((gid: string) => ({ group_id: gid, user_id: id }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}
