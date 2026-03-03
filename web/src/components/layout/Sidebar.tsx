'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Layers,
  Trophy,
  Bell,
  Settings,
  Users,
  Flame,
  ChevronRight,
  BookMarked,
  Send,
  BarChart2,
  Zap,
  CalendarDays,
  Megaphone,
  Wallet,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/types'
import SugestaoButton from '@/components/suggestions/SugestaoButton'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: UserRole[]
}

const NAV_PRIMARY: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Conteúdos',   href: '/conteudos',   icon: Layers },
  { label: 'Performance', href: '/performance', icon: TrendingUp },
  { label: 'Banca',       href: '/banca',       icon: Wallet },
  { label: 'Modo Grind',  href: '/grind',       icon: Zap },
  { label: 'Calendário',  href: '/calendario',  icon: CalendarDays },
  { label: 'Ranking',     href: '/ranking',     icon: Trophy },
]

const NAV_ADMIN: NavItem[] = [
  { label: 'Alunos',       href: '/admin/alunos',       icon: Users,      roles: ['instructor', 'admin'] },
  { label: 'Grupos',       href: '/admin/grupos',       icon: Flame,      roles: ['instructor', 'admin'] },
  { label: 'Gerenciar',    href: '/admin/conteudos',    icon: BookMarked, roles: ['instructor', 'admin'] },
  { label: 'Notif. Admin', href: '/admin/notificacoes', icon: Send,       roles: ['instructor', 'admin'] },
  { label: 'Anúncios',     href: '/admin/anuncios',     icon: Megaphone,  roles: ['instructor', 'admin'] },
  { label: 'Performance',  href: '/admin/performance',  icon: BarChart2,  roles: ['admin'] },
  { label: 'Sugestões',    href: '/admin/sugestoes',    icon: Lightbulb,  roles: ['instructor', 'admin'] },
]

const NAV_SECONDARY: NavItem[] = [
  { label: 'Notificações',  href: '/notificacoes',  icon: Bell },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
]

interface SidebarProps {
  role: UserRole
  streak?: number
  xp?: number
}

export default function Sidebar({ role, streak = 0, xp = 0 }: SidebarProps) {
  const pathname = usePathname()
  const filterRole = (items: NavItem[]) =>
    items.filter(item => !item.roles || item.roles.includes(role))
  const isAdmin = role === 'admin' || role === 'instructor'

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-full bg-[var(--surface-1)] border-r border-[var(--border)]">

      {/* ── Logo ─────────────────────────────── */}
      <Link href="/dashboard" className="px-5 pt-6 pb-5 border-b border-[var(--border)] block group">
        <div className="leading-none">
          <span className="font-display text-[15px] font-black tracking-[0.18em] text-white">gabrielf</span>
          <span className="font-display text-[15px] font-black tracking-[0.18em] text-[var(--gold)]">poker</span>
        </div>
        <p className="text-[9px] tracking-[0.25em] text-[var(--text-muted)] uppercase mt-1 font-medium">
          Pro Members Area
        </p>
      </Link>

      {/* ── Navegação ────────────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--text-muted)]">Menu</p>
        {filterRole(NAV_PRIMARY).map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {isAdmin && (
          <>
            <div className="mx-2 my-3 border-t border-[var(--border)]" />
            <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.18em] uppercase text-[var(--gold)]/60">Admin</p>
            {filterRole(NAV_ADMIN).map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} admin />
            ))}
          </>
        )}

        <div className="mx-2 my-3 border-t border-[var(--border)]" />
        {filterRole(NAV_SECONDARY).map(item => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <SugestaoButton />
      </nav>

      {/* ── Streak + XP ──────────────────────── */}
      {streak > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={13} className="text-orange-400 shrink-0" />
            <span className="text-[11px] text-[var(--text-dim)]">
              <span className="font-bold text-orange-400">{streak}</span> dias seguidos
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
              <span className="font-semibold tracking-wide uppercase">XP</span>
              <span className="font-mono">{xp.toLocaleString('pt-BR')}</span>
            </div>
            <div className="h-[3px] bg-[var(--surface-3)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((xp % 1000) / 10, 100)}%`,
                  background: 'linear-gradient(90deg, var(--cyan), var(--gold))',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Role badge ───────────────────────── */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <RoleBadge role={role} />
      </div>
    </aside>
  )
}

function NavLink({ item, pathname, admin }: { item: NavItem; pathname: string; admin?: boolean }) {
  const Icon = item.icon
  const active = pathname === item.href || pathname.startsWith(item.href + '/')
  const activeColor = admin ? 'var(--gold)' : 'var(--cyan)'

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-[9px] text-[13px] font-medium transition-all duration-150 rounded-lg group relative',
        active
          ? ['text-white', 'pl-[10px]',
              admin
                ? 'bg-[var(--gold)]/8 border-l-2 border-[var(--gold)]'
                : 'bg-[var(--cyan)]/10 border-l-2 border-[var(--cyan)]',
            ]
          : ['text-[var(--text-dim)]', 'hover:text-white', 'hover:bg-white/[0.04]', 'pl-3']
      )}
    >
      <Icon
        size={15}
        className={cn('shrink-0 transition-colors', !active && 'text-[var(--text-muted)] group-hover:text-[var(--text-dim)]')}
        style={active ? { color: activeColor } : {}}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {active && <ChevronRight size={11} style={{ color: activeColor }} className="opacity-50" />}
    </Link>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = {
    admin:      { label: 'Admin',     cls: 'text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--gold)]/25' },
    instructor: { label: 'Instrutor', cls: 'text-[var(--cyan)] bg-[var(--cyan)]/10 border-[var(--cyan)]/25' },
    student:    { label: 'Membro',    cls: 'text-[var(--text-dim)] bg-white/5 border-white/10' },
  }[role]

  return (
    <span className={cn(
      'inline-flex items-center text-[9px] font-bold px-2 py-1 rounded-full border tracking-[0.15em] uppercase',
      cfg.cls
    )}>
      {cfg.label}
    </span>
  )
}
