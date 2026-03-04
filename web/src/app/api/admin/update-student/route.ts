import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return null
  return user
}

export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id, full_name, role, group_ids, email, password } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const adminClient = createAdminClient()

  // Update auth credentials (email / password) via Admin API
  if (email || password) {
    const authUpdates: { email?: string; password?: string } = {}
    if (email) authUpdates.email = email
    if (password) authUpdates.password = password
    const { error } = await adminClient.auth.admin.updateUserById(id, authUpdates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Keep profiles.email in sync
    if (email) {
      await adminClient.from('profiles').update({ email }).eq('id', id)
    }
  }

  // Update profile fields
  const profileUpdates: Record<string, string> = {}
  if (full_name !== undefined) profileUpdates.full_name = full_name
  if (role !== undefined) profileUpdates.role = role

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await adminClient.from('profiles').update(profileUpdates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sync group memberships
  if (Array.isArray(group_ids)) {
    await adminClient.from('player_group_members').delete().eq('user_id', id)
    if (group_ids.length > 0) {
      await adminClient.from('player_group_members').insert(
        group_ids.map((gid: string) => ({ group_id: gid, user_id: id }))
      )
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
