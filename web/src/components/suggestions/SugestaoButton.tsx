'use client'

import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import SugestaoModal from './SugestaoModal'

export default function SugestaoButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-3 py-[9px] text-[13px] font-medium text-[var(--text-dim)] hover:text-white hover:bg-white/[0.04] transition-all duration-150 rounded-lg w-full"
      >
        <Lightbulb size={15} className="shrink-0 text-[var(--text-muted)]" />
        <span className="flex-1 truncate text-left">Sugestões</span>
      </button>

      {open && <SugestaoModal onClose={() => setOpen(false)} />}
    </>
  )
}
