import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Replayer · Poker School',
  description: 'O melhor replayer de mãos de poker do mercado. Analise, compartilhe e evolua.',
}

export default function ReplayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white">
      {/* Header independente — sem navbar da escola */}
      <header className="border-b border-white/5 bg-[#0a0f0d]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/replayer" className="flex items-center gap-2 group">
            <span className="text-2xl">♠</span>
            <span className="font-bold tracking-tight">
              Poker<span className="text-emerald-400">School</span>
              <span className="text-white/40 font-normal ml-2 text-sm">Replayer</span>
            </span>
          </a>

          <nav className="flex items-center gap-4 text-sm">
            <a
              href="/replayer"
              className="text-white/60 hover:text-white transition-colors"
            >
              Nova mão
            </a>
            <a
              href="/"
              className="text-white/40 hover:text-white/70 transition-colors text-xs"
            >
              ← Voltar para a escola
            </a>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
