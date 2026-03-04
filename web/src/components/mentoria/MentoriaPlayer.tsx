'use client'

import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface StatConfig {
  id: string
  name: string
  unit: string
  ideal_min: number | null
  ideal_max: number | null
}

interface PlayerStat {
  id: string
  stat_config_id: string
  value: number
  recorded_at: string
}

interface Override {
  stat_config_id: string
  ideal_min: number | null
  ideal_max: number | null
}

interface Note {
  id: string
  note_date: string
  content: string
  admin?: { full_name: string } | null
}

function statStatus(value: number, min: number | null, max: number | null) {
  if (min === null && max === null) return 'neutral'
  if (min !== null && value < min) return 'low'
  if (max !== null && value > max) return 'high'
  return 'ideal'
}

const STATUS_CFG = {
  low:     { label: 'Abaixo do ideal', dot: '🔴', color: 'text-[var(--red)]',   bar: 'bg-[var(--red)]' },
  ideal:   { label: 'Ideal',           dot: '🟢', color: 'text-[var(--green)]', bar: 'bg-[var(--green)]' },
  high:    { label: 'Acima do ideal',  dot: '🟡', color: 'text-[var(--gold)]',  bar: 'bg-[var(--gold)]' },
  neutral: { label: '—',               dot: '⚪', color: 'text-[var(--text-muted)]', bar: 'bg-[var(--surface-3)]' },
}

export default function MentoriaPlayer() {
  const [configs, setConfigs]     = useState<StatConfig[]>([])
  const [stats, setStats]         = useState<PlayerStat[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [notes, setNotes]         = useState<Note[]>([])
  const [loading, setLoading]     = useState(true)
  const [expandedStat, setExpandedStat] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [statsRes, notesRes] = await Promise.all([
      fetch('/api/player-stats'),
      fetch('/api/mentoring-notes'),
    ])
    const statsData = await statsRes.json()
    const notesData = await notesRes.json()
    setConfigs(statsData.configs ?? [])
    setStats(statsData.stats ?? [])
    setOverrides(statsData.overrides ?? [])
    setNotes(notesData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function latestStat(configId: string) {
    return stats.find(s => s.stat_config_id === configId)
  }

  function historyFor(configId: string) {
    return stats
      .filter(s => s.stat_config_id === configId)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  }

  function effectiveRange(config: StatConfig): [number | null, number | null] {
    const ov = overrides.find(o => o.stat_config_id === config.id)
    return [ov?.ideal_min ?? config.ideal_min, ov?.ideal_max ?? config.ideal_max]
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-[var(--text-muted)] animate-pulse">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Mentoria</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Acompanhe sua evolução e as notas das suas sessões de X1.</p>
      </div>

      {/* ── ESTATÍSTICAS ─────────────────────────────── */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-white">Estatísticas — Ideal vs Real</h2>
        </div>

        {configs.length === 0 ? (
          <p className="text-center py-10 text-sm text-[var(--text-muted)]">
            Nenhuma estatística configurada ainda. Aguarde seu coach.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {configs.map(cfg => {
              const latest = latestStat(cfg.id)
              const [eMin, eMax] = effectiveRange(cfg)
              const status = latest ? statStatus(latest.value, eMin, eMax) : 'neutral'
              const st = STATUS_CFG[status]
              const history = historyFor(cfg.id)
              const isExpanded = expandedStat === cfg.id

              // Bar fill: position relative to ideal range
              let barPct = 0
              if (latest && (eMin !== null || eMax !== null)) {
                const lo = eMin ?? 0
                const hi = eMax ?? lo * 2
                const range = hi - lo || 1
                barPct = Math.min(Math.max(((latest.value - lo) / range) * 100, 0), 100)
              }

              // Chart data for history
              const chartData = history.map(h => ({
                date: new Date(h.recorded_at + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                value: h.value,
              }))

              return (
                <div key={cfg.id}>
                  <button
                    onClick={() => setExpandedStat(isExpanded ? null : cfg.id)}
                    className="w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{st.dot}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-white">{cfg.name}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {latest ? (
                              <span className={cn('text-sm font-black tabular-nums', st.color)}>
                                {latest.value}{cfg.unit}
                              </span>
                            ) : (
                              <span className="text-sm text-[var(--text-muted)]">—</span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-muted)] w-8 text-right shrink-0">
                            {eMin ?? '—'}
                          </span>
                          <div className="flex-1 h-1.5 bg-[var(--surface-3)] rounded-full overflow-hidden relative">
                            {/* Ideal zone */}
                            <div className="absolute inset-0 bg-[var(--green)]/10 rounded-full" />
                            {/* Actual value */}
                            {latest && (
                              <div
                                className={cn('h-full rounded-full transition-all', st.bar)}
                                style={{ width: `${barPct}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] w-8 shrink-0">
                            {eMax ?? '—'}
                          </span>
                          <span className={cn('text-[10px] font-semibold w-20 text-right shrink-0', st.color)}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* History chart */}
                  {isExpanded && history.length > 1 && (
                    <div className="px-5 pb-4 bg-[var(--surface-2)] border-t border-[var(--border)]">
                      <p className="text-[11px] text-[var(--text-muted)] py-3">Histórico de leituras</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={chartData}>
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false}
                            tickFormatter={v => `${v}${cfg.unit}`} width={36} />
                          <Tooltip
                            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}
                            formatter={(v: number | string | undefined) => [v !== undefined ? `${v}${cfg.unit}` : '—', cfg.name]}
                          />
                          {/* Ideal band reference lines */}
                          <Line type="monotone" dataKey="value" stroke="var(--cyan)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {isExpanded && history.length === 1 && (
                    <div className="px-5 pb-4 bg-[var(--surface-2)] border-t border-[var(--border)]">
                      <p className="text-[11px] text-[var(--text-muted)] py-3">
                        Apenas uma leitura registrada — o gráfico aparece com 2 ou mais pontos.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── NOTAS DE X1 ──────────────────────────────── */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-white">Notas de X1</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Registro das sessões individuais com seu coach.</p>
        </div>

        {notes.length === 0 ? (
          <p className="text-center py-10 text-sm text-[var(--text-muted)]">
            Nenhuma nota registrada ainda.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notes.map(note => (
              <div key={note.id} className="px-5 py-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[var(--text-dim)]">
                    {new Date(note.note_date + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </span>
                  {note.admin?.full_name && (
                    <span className="text-[11px] text-[var(--text-muted)]">· por {note.admin.full_name}</span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-dim)] whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
