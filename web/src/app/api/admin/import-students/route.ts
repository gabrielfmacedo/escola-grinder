import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'instructor'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { emails, group_id } = await req.json()
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'Nenhum e-mail fornecido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const rawEmail of emails) {
    const email = String(rawEmail).trim().toLowerCase()
    if (!email || !email.includes('@')) {
      results.push({ email, ok: false, error: 'Email inválido' })
      continue
    }

    try {
      // Try inviting user (sends email with magic link to set password)
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email)

      if (inviteErr) {
        results.push({ email, ok: false, error: inviteErr.message })
        continue
      }

      // Create/upsert profile with empty full_name (onboarding will complete it)
      const { error: profileErr } = await admin.from('profiles').upsert({
        id: invited.user.id,
        full_name: '',
        email,
        role: 'student',
      }, { onConflict: 'id' })

      if (profileErr) {
        results.push({ email, ok: false, error: profileErr.message })
        continue
      }

      // Add to group if specified
      if (group_id) {
        await admin.from('player_group_members').upsert({ group_id, user_id: invited.user.id }, { onConflict: 'group_id,user_id' })
      }

      results.push({ email, ok: true })
    } catch (e: unknown) {
      results.push({ email, ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' })
    }
  }

  const sent = results.filter(r => r.ok).length
  const errors = results.filter(r => !r.ok).map(r => `${r.email}: ${r.error}`)

  return NextResponse.json({ sent, errors, total: emails.length })
}
