import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Eventos da Cakto que nos interessam
const GRANT_ACCESS_EVENTS  = ['purchase_approved', 'subscription_created', 'subscription_renewed']
const REVOKE_ACCESS_EVENTS = ['subscription_canceled', 'refund', 'chargeback']

interface CaktoWebhookPayload {
  event: string
  data: {
    customer: {
      email: string
      name: string
    }
    product?: {
      id: string
    }
    subscription?: {
      id: string
    }
    transaction?: {
      id: string
    }
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  // Valida o secret do webhook
  const secret = request.headers.get('x-cakto-secret') || request.headers.get('authorization')
  if (process.env.CAKTO_WEBHOOK_SECRET && secret !== process.env.CAKTO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: CaktoWebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Salva o evento para auditoria
  await supabase.from('cakto_webhook_events').insert({
    event_type: payload.event,
    payload: payload as unknown as Record<string, unknown>,
    processed: false,
  })

  const { email, name } = payload.data.customer
  const caktoProductId = payload.data.product?.id
  const caktoSubscriptionId = payload.data.subscription?.id
  const caktoTransactionId = payload.data.transaction?.id

  try {
    if (GRANT_ACCESS_EVENTS.includes(payload.event)) {
      await grantAccess({ supabase, email, name, caktoProductId, caktoSubscriptionId, caktoTransactionId })
    } else if (REVOKE_ACCESS_EVENTS.includes(payload.event)) {
      await revokeAccess({ supabase, email, caktoSubscriptionId })
    }

    // Marca como processado
    await supabase
      .from('cakto_webhook_events')
      .update({ processed: true })
      .eq('event_type', payload.event)
      .order('received_at', { ascending: false })
      .limit(1)

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await supabase
      .from('cakto_webhook_events')
      .update({ processed: false, error: message })
      .eq('event_type', payload.event)
      .order('received_at', { ascending: false })
      .limit(1)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function grantAccess({ supabase, email, name, caktoProductId, caktoSubscriptionId, caktoTransactionId }: {
  supabase: ReturnType<typeof createAdminClient>
  email: string
  name: string
  caktoProductId?: string
  caktoSubscriptionId?: string
  caktoTransactionId?: string
}) {
  // Descobre qual plano está associado ao produto da Cakto
  const { data: plan } = await supabase
    .from('plans')
    .select('id, type')
    .eq('cakto_product_id', caktoProductId ?? '')
    .single()

  // Verifica se o usuário já existe pelo perfil
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  let userId: string

  if (existingProfile) {
    userId = existingProfile.id
  } else {
    // Cria o usuário e envia e-mail de definição de senha
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    })
    if (error || !newUser.user) throw new Error(`Erro ao criar usuário: ${error?.message}`)
    userId = newUser.user.id

    // Cria o perfil na tabela pública
    await supabase.from('profiles').insert({
      id: userId,
      full_name: name,
      email,
    })
  }

  // Cria ou atualiza a assinatura
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan_id: plan?.id ?? '',
    status: 'active',
    cakto_subscription_id: caktoSubscriptionId,
    cakto_transaction_id: caktoTransactionId,
    starts_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Notifica o aluno
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'system',
    title: 'Bem-vindo ao gabrielfpoker!',
    message: 'Seu acesso foi liberado. Comece a estudar agora.',
    action_url: '/dashboard',
  })
}

async function revokeAccess({ supabase, email, caktoSubscriptionId }: {
  supabase: ReturnType<typeof createAdminClient>
  email: string
  caktoSubscriptionId?: string
}) {
  // Busca o usuário pelo e-mail
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile) return

  // Cancela a assinatura
  const query = supabase
    .from('subscriptions')
    .update({ status: 'canceled', ends_at: new Date().toISOString() })
    .eq('user_id', profile.id)

  if (caktoSubscriptionId) {
    query.eq('cakto_subscription_id', caktoSubscriptionId)
  }

  await query

  // Notifica o aluno
  await supabase.from('notifications').insert({
    user_id: profile.id,
    type: 'system',
    title: 'Acesso encerrado',
    message: 'Sua assinatura foi cancelada. Entre em contato caso precise de ajuda.',
  })
}
