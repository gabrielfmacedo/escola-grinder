'use client'

import { useState } from 'react'
import { getYoutubeEmbedUrl, getDriveEmbedUrl } from '@/lib/utils'
import type { LessonType } from '@/lib/supabase/types'

interface VideoPlayerProps {
  type: LessonType
  url: string | null
  title: string
  onComplete?: () => void
}

export default function VideoPlayer({ type, url, title, onComplete }: VideoPlayerProps) {
  const [completed, setCompleted] = useState(false)

  function handleComplete() {
    if (completed) return
    setCompleted(true)
    onComplete?.()
  }

  const embedUrl = type === 'video_youtube'
    ? getYoutubeEmbedUrl(url ?? '')
    : type === 'video_drive'
      ? getDriveEmbedUrl(url ?? '')
      : null

  if (!embedUrl && (type === 'video_youtube' || type === 'video_drive')) {
    return (
      <div className="aspect-video bg-[var(--surface-3)] rounded-xl flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">URL do vídeo inválida.</p>
      </div>
    )
  }

  if (type === 'text') {
    return null // texto renderizado na página
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          src={embedUrl!}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {!completed && (
        <button
          onClick={handleComplete}
          className="text-sm text-[var(--cyan)] hover:underline transition-colors"
        >
          Marcar como concluída
        </button>
      )}
      {completed && (
        <p className="text-sm text-[var(--green)]">✓ Aula concluída</p>
      )}
    </div>
  )
}
