'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OnboardingForm() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true); setError('')

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name.trim() }),
    })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Erro ao salvar')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 mb-4">
            <User size={28} className="text-[var(--gold)]" />
          </div>
          <h1 className="text-2xl font-black text-white">Bem-vindo!</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Para finalizar, como podemos te chamar?
          </p>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--text-muted)] font-medium">Seu nome completo *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                placeholder="Ex: João Silva"
                className={cn(
                  'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm',
                  'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
                  'focus:outline-none focus:border-[var(--gold)]/60 transition-colors'
                )}
              />
            </div>
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black font-black text-sm transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Salvando...' : 'Entrar na plataforma →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
