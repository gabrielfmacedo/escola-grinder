'use client'

import { useState } from 'react'
import { Database } from 'lucide-react'

export default function SeedButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleSeed() {
    setStatus('loading')
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (res.ok) {
        setStatus('done')
        setTimeout(() => window.location.reload(), 1200)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const labels = {
    idle:    'Carregar dados de exemplo',
    loading: 'Carregando...',
    done:    'Dados carregados! Recarregando...',
    error:   'Erro — tente novamente',
  }

  return (
    <button
      onClick={handleSeed}
      disabled={status === 'loading' || status === 'done'}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-dashed border-[var(--cyan)]/40 text-[var(--cyan)] hover:bg-[var(--cyan)]/8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Database size={14} />
      {labels[status]}
    </button>
  )
}
