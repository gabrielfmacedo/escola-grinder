'use client'

import { useRouter } from 'next/navigation'

export default function MarkReadButton({ userId: _userId }: { userId: string }) {
  const router = useRouter()

  async function markAll() {
    await fetch('/api/notifications/read', { method: 'POST' })
    router.refresh()
  }

  return (
    <button onClick={markAll}
      className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
      Marcar todas como lidas
    </button>
  )
}
