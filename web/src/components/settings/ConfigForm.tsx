'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function ConfigForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: profile.full_name, phone: profile.phone ?? '', bio: profile.bio ?? '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('profiles').update({
      full_name: form.full_name,
      phone: form.phone || null,
      bio: form.bio || null,
    }).eq('id', profile.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const inputCls = cn(
    'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
    'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
    'focus:outline-none focus:border-[var(--cyan)]/60 transition-colors'
  )

  return (
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
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black font-bold text-sm transition-colors disabled:opacity-50">
        {saved ? '✓ Salvo!' : loading ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
