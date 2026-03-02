import { createClient } from '@/lib/supabase/server'
import TournamentForm from '@/components/performance/TournamentForm'

// Preferred platform order
const PLATFORM_ORDER = ['pokerstars', 'ggpoker', 'gg poker', 'wpt', 'partypoker', '888poker', 'coinpoker', 'bodog', 'ignition']

function sortPlatforms(platforms: { id: string; name: string }[]) {
  return [...platforms].sort((a, b) => {
    const ai = PLATFORM_ORDER.findIndex(k => a.name.toLowerCase().includes(k))
    const bi = PLATFORM_ORDER.findIndex(k => b.name.toLowerCase().includes(k))
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default async function NovoTorneioPage() {
  const supabase = await createClient()
  const { data: platforms } = await supabase
    .from('poker_platforms')
    .select('id, name')
    .eq('is_active', true)

  const sorted = sortPlatforms(platforms ?? [])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-black text-white">Novo Torneio</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Registre os dados do torneio para acompanhar sua performance.
        </p>
      </div>

      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6">
        <TournamentForm platforms={sorted} />
      </div>
    </div>
  )
}
