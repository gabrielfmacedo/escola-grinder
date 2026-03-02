'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm text-[var(--text-dim)] mb-1.5">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="seu@email.com"
          className={cn(
            'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3',
            'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:border-[var(--cyan)] transition-colors'
          )}
        />
      </div>

      <div>
        <label className="block text-sm text-[var(--text-dim)] mb-1.5">Senha</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className={cn(
            'w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-3',
            'text-[var(--foreground)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none focus:border-[var(--cyan)] transition-colors'
          )}
        />
      </div>

      {error && (
        <p className="text-[var(--red)] text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          'w-full bg-[var(--gold)] hover:bg-[var(--gold-light)] text-black font-bold',
          'py-3 rounded-lg transition-colors mt-2',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl font-black mb-1">
            <span className="text-[var(--gold)]">POKER</span>
            <span className="text-[var(--cyan)]">.SCHOOL</span>
          </div>
          <p className="text-[var(--text-dim)] text-sm">Entre na sua conta</p>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
          <Suspense fallback={<div className="h-48 animate-pulse" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-[var(--text-muted)] text-xs mt-6">
          Acesso exclusivo para alunos matriculados.
        </p>
      </div>
    </div>
  )
}
