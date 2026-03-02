'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function LessonCompleteButton({ lessonId }: { lessonId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function markComplete() {
    setLoading(true)
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={markComplete}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--green)] border border-[var(--border)] hover:border-[var(--green)]/40 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
    >
      <CheckCircle size={14} />
      {loading ? 'Salvando...' : 'Marcar como concluída'}
    </button>
  )
}
