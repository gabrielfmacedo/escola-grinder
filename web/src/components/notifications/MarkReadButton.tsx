'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MarkReadButton({ userId }: { userId: string }) {
  const router = useRouter()

  async function markAll() {
    const supabase = createClient()
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    router.refresh()
  }

  return (
    <button onClick={markAll}
      className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
      Marcar todas como lidas
    </button>
  )
}
