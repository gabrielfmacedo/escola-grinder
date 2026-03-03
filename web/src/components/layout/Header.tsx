'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Bell, LogOut, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':            'Dashboard',
  '/conteudos':            'Conteúdos',
  '/cursos':               'Cursos',
  '/performance':          'Performance',
  '/banca':                'Bankroll',
  '/ranking':              'Ranking',
  '/notificacoes':         'Notificações',
  '/configuracoes':        'Configurações',
  '/grind':                'Modo Grind',
  '/calendario':           'Calendário',
  '/admin/alunos':         'Alunos',
  '/admin/conteudos':      'Gerenciar Conteúdos',
  '/admin/notificacoes':   'Notificações Admin',
  '/admin/anuncios':       'Anúncios',
  '/admin/performance':    'Performance Admin',
  '/admin/grupos':         'Grupos de Jogadores',
  '/admin/sugestoes':      'Sugestões',
  '/onboarding':           'Bem-vindo!',
}

interface HeaderProps {
  profile: Profile
  streak?: number
  unreadCount?: number
}

export default function Header({ profile, streak = 0, unreadCount = 0 }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? ''

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-[52px] shrink-0 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--surface-1)]">

      {/* ── Título da página ── */}
      <h1 className="text-[13px] font-semibold text-[var(--text-dim)] tracking-wide">
        {pageTitle}
      </h1>

      {/* ── Ações à direita ── */}
      <div className="flex items-center gap-1">

        {/* Streak */}
        {streak > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 mr-1 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Flame size={12} className="text-orange-400" />
            <span className="text-[11px] font-bold text-orange-400">{streak}</span>
          </div>
        )}

        {/* Notificações */}
        <button
          className="relative p-2 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors rounded-lg hover:bg-white/[0.04]"
          title="Notificações"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-[6px] h-[6px] rounded-full bg-[var(--cyan)]" />
          )}
        </button>

        {/* Separador */}
        <div className="w-px h-5 bg-[var(--border)] mx-1" />

        {/* Avatar + nome */}
        <div className="flex items-center gap-2 pl-1">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center',
            'text-[11px] font-bold text-black shrink-0',
            'bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dim)]',
          )}>
            {getInitials(profile.full_name)}
          </div>
          <span className="text-[13px] font-medium text-[var(--text-dim)] hidden sm:block">
            {profile.full_name.split(' ')[0]}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="ml-1 p-2 text-[var(--text-muted)] hover:text-[var(--red)] transition-colors rounded-lg hover:bg-white/[0.04]"
          title="Sair"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
