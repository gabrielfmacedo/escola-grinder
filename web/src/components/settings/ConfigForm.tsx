'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

type Profile = Database['public']['Tables']['profiles']['Row']

const inputCls = cn(
  'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
  'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
  'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
)

export default function ConfigForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: profile.full_name, phone: profile.phone ?? '', bio: profile.bio ?? '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: form.full_name, phone: form.phone, bio: form.bio }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao salvar')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="space-y-10">
      {/* ── Perfil ── */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-5">Perfil</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">Nome completo</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">E-mail</label>
            <input value={profile.email} disabled className={cn(inputCls, 'opacity-50 cursor-not-allowed')} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">Telefone / WhatsApp</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+55 11 99999-9999" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Conte um pouco sobre você..." rows={3} className={cn(inputCls, 'resize-none')} />
          </div>
          {error && <p className="text-sm text-[var(--red)]">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black font-bold text-sm transition-colors disabled:opacity-50">
            {saved ? '✓ Salvo!' : loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      {/* ── Alterar Senha ── */}
      <ChangePasswordForm />
    </div>
  )
}

function ChangePasswordForm() {
  const [form, setForm] = useState({ current: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(false)

    if (form.password.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    const supabase = createClient()

    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setError('Usuário não encontrado.'); setLoading(false); return }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: form.current,
    })
    if (signInErr) { setError('Senha atual incorreta.'); setLoading(false); return }

    const { error: updateErr } = await supabase.auth.updateUser({ password: form.password })
    setLoading(false)

    if (updateErr) { setError(updateErr.message); return }

    setSuccess(true)
    setForm({ current: '', password: '', confirm: '' })
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--foreground)] mb-5">Alterar Senha</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">Senha atual</label>
          <input
            type="password"
            value={form.current}
            onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
            required
            placeholder="••••••••"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">Nova senha</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            placeholder="Mínimo 6 caracteres"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] font-medium block mb-1.5">Confirmar nova senha</label>
          <input
            type="password"
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            required
            placeholder="Repita a nova senha"
            className={inputCls}
          />
        </div>
        {error   && <p className="text-sm text-[var(--red)]">{error}</p>}
        {success && <p className="text-sm text-[var(--green)]">✓ Senha alterada com sucesso!</p>}
        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-bold text-sm hover:border-[var(--border-hi)] transition-colors disabled:opacity-50">
          {loading ? 'Alterando...' : 'Alterar senha'}
        </button>
      </form>
    </div>
  )
}
