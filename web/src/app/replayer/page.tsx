import { HandUploader } from './_components/HandUploader'

export default function ReplayerHomePage() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-12">

      {/* Hero */}
      <div className="text-center mb-10 space-y-3 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Replayer gratuito · Sem limites
        </div>

        <h1 className="text-4xl font-bold text-white tracking-tight">
          Reviva cada decisão
        </h1>
        <p className="text-white/50 text-lg leading-relaxed">
          Importe seu histórico de mãos do PokerStars ou GGPoker
          e assista o replay com animações em tempo real.
        </p>

        {/* Supported sites badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {['PokerStars', 'GGPoker'].map(site => (
            <span
              key={site}
              className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/50"
            >
              {site}
            </span>
          ))}
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/30">
            + mais em breve
          </span>
        </div>
      </div>

      {/* Uploader */}
      <HandUploader />

      {/* Footer hint */}
      <p className="mt-8 text-xs text-white/20 text-center">
        Seus históricos nunca são armazenados sem sua permissão. · 100% gratuito.
      </p>
    </div>
  )
}
