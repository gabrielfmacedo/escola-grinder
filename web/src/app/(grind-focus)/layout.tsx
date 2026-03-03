import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Modo Grind · gabrielfpoker',
}

export default function GrindFocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-start justify-center py-8 px-4">
      {children}
    </div>
  )
}
