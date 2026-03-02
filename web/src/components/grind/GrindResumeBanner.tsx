'use client'

import Link from 'next/link'
import { Zap, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function GrindResumeBanner({
  sessionId,
  startedAt,
  label,
}: {
  sessionId: string
  startedAt: string
  label: string
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startMs = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <div className="shrink-0 bg-[var(--cyan)]/10 border-b border-[var(--cyan)]/20 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
        <Zap size={13} className="text-[var(--cyan)]" />
        <span className="text-[var(--text-dim)] font-medium">Sessão ativa:</span>
        <span className="text-white font-semibold">{label}</span>
        <span className="flex items-center gap-1 text-[var(--text-muted)] text-xs ml-1">
          <Clock size={11} /> {formatElapsed(elapsed)}
        </span>
      </div>
      <Link
        href={`/grind/${sessionId}`}
        className="text-xs font-bold text-[var(--cyan)] hover:underline"
      >
        Retomar →
      </Link>
    </div>
  )
}
