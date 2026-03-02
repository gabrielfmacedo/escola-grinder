'use client'

import Link from 'next/link'
import { Play, Lock, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanType } from '@/lib/supabase/types'

interface CourseCardProps {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  required_plan: PlanType
  lesson_count?: number
  progress_percent?: number
  user_plan: PlanType
}

const PLAN_ORDER: Record<PlanType, number> = { basic: 0, pro: 1, elite: 2 }
const PLAN_LABEL: Record<PlanType, string> = { basic: 'Básico', pro: 'Pro', elite: 'Elite' }

export default function CourseCard({
  title, slug, description, thumbnail_url,
  required_plan, lesson_count = 0, progress_percent = 0, user_plan,
}: CourseCardProps) {
  const locked = PLAN_ORDER[user_plan] < PLAN_ORDER[required_plan]

  return (
    <Link
      href={locked ? '#' : `/cursos/${slug}`}
      className={cn(
        'group relative flex flex-col rounded-xl overflow-hidden',
        'bg-[var(--surface-2)] border border-[var(--border)]',
        'transition-all duration-200',
        locked
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:border-[var(--cyan)]/40 hover:shadow-[0_0_20px_rgba(0,212,232,0.08)] hover:-translate-y-0.5'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[var(--surface-3)] overflow-hidden">
        {thumbnail_url ? (
          <img src={thumbnail_url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={32} className="text-[var(--border-hi)]" />
          </div>
        )}

        {/* Overlay play */}
        {!locked && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <div className="w-10 h-10 rounded-full bg-[var(--cyan)] flex items-center justify-center">
              <Play size={16} className="text-black ml-0.5" fill="black" />
            </div>
          </div>
        )}

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <Lock size={20} className="text-[var(--gold)]" />
            <span className="text-xs text-[var(--gold)] mt-1 font-semibold">{PLAN_LABEL[required_plan]}</span>
          </div>
        )}

        {/* Progress bar */}
        {!locked && progress_percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div
              className="h-full bg-[var(--cyan)] transition-all"
              style={{ width: `${progress_percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[var(--foreground)] line-clamp-2 leading-snug">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">{description}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-[var(--text-muted)]">
            {lesson_count} aula{lesson_count !== 1 ? 's' : ''}
          </span>
          {!locked && progress_percent > 0 && (
            <span className="text-[11px] text-[var(--cyan)]">{progress_percent}%</span>
          )}
        </div>
      </div>
    </Link>
  )
}
