'use client'

import { useState, useEffect } from 'react'
import { X, Megaphone, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  message: string | null
  created_at: string
  action_url: string | null
  action_label: string | null
}

const STORAGE_KEY = 'dismissed_announcements_v1'

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function addDismissed(id: string) {
  const set = getDismissed()
  set.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export default function AnnouncementToast() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => {
        const dismissed = getDismissed()
        const active = (d.announcements ?? []).filter((a: Announcement) => !dismissed.has(a.id))
        setAnnouncements(active)
        if (active.length > 0) {
          // Delay slightly for nice entrance
          setTimeout(() => setVisible(true), 800)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  function dismiss(id: string) {
    addDismissed(id)
    const remaining = announcements.filter(a => a.id !== id)
    setAnnouncements(remaining)
    if (remaining.length === 0) setVisible(false)
    else setCurrent(Math.min(current, remaining.length - 1))
  }

  function dismissAll() {
    announcements.forEach(a => addDismissed(a.id))
    setAnnouncements([])
    setVisible(false)
  }

  if (!loaded || !visible || announcements.length === 0) return null

  const ann = announcements[current]

  return (
    <div className={cn(
      'fixed bottom-5 right-5 z-50 w-[320px] transition-all duration-300',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    )}>
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--cyan)]/8 border-b border-[var(--border)]">
          <Megaphone size={14} className="text-[var(--cyan)] shrink-0" />
          <span className="text-xs font-bold text-[var(--cyan)] flex-1 uppercase tracking-wide">Anúncio</span>
          {announcements.length > 1 && (
            <span className="text-[10px] text-[var(--text-muted)]">{current + 1}/{announcements.length}</span>
          )}
          <button onClick={dismissAll} className="p-0.5 text-[var(--text-muted)] hover:text-white transition-colors ml-1">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="text-sm font-bold text-white">{ann.title}</p>
          {ann.message && <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{ann.message}</p>}
          {ann.action_url && (
            <a
              href={ann.action_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2.5 px-3 py-1.5 rounded-lg bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)] text-xs font-bold hover:bg-[var(--gold)]/25 transition-colors"
            >
              {ann.action_label ?? 'Ver mais'}
            </a>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            {new Date(ann.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-3 gap-2">
          {announcements.length > 1 ? (
            <div className="flex gap-1">
              <button
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white disabled:opacity-30 hover:bg-white/5 transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setCurrent(c => Math.min(announcements.length - 1, c + 1))}
                disabled={current === announcements.length - 1}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white disabled:opacity-30 hover:bg-white/5 transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          ) : <div />}
          <button
            onClick={() => dismiss(ann.id)}
            className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Dispensar
          </button>
        </div>
      </div>
    </div>
  )
}
