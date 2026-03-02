'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LessonCompleteButton({ lessonId }: { lessonId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function markComplete() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('lesson_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      progress_percent: 100,
      last_watched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

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
