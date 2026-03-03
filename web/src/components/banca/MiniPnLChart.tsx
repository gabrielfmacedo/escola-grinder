'use client'

import { ResponsiveContainer, AreaChart, Area, Tooltip, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/utils'

export interface PeakPoint {
  index: number
  tournament_name: string
  prize_cents: number
  date: string
  platform_name: string
}

interface MiniPnLChartProps {
  data: { value: number; index?: number }[]
  positive: boolean
  milestones?: number[]
  peaks?: PeakPoint[]
  height?: number
}

function StarDot({ cx, cy }: { cx: number; cy: number }) {
  const r = 6, ir = 2.5
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = ((i * 36) - 90) * Math.PI / 180
    const d = i % 2 === 0 ? r : ir
    return `${cx + d * Math.cos(a)},${cy + d * Math.sin(a)}`
  }).join(' ')
  return <polygon points={pts} fill="var(--gold)" strokeWidth={0} style={{ filter: 'drop-shadow(0 0 3px rgba(240,192,64,0.6))' }} />
}

function TooltipContent({
  active, payload, peaks,
}: {
  active?: boolean
  payload?: { value: number; payload: { index?: number } }[]
  peaks?: PeakPoint[]
}) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  const idx = payload[0].payload.index
  const peak = peaks?.find(p => p.index === idx)

  if (peak) {
    return (
      <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs shadow-lg max-w-[200px] space-y-1">
        <p className="font-bold text-[var(--gold)] leading-tight">{peak.tournament_name}</p>
        <p className="text-[var(--green)] font-bold">+${(peak.prize_cents / 100).toFixed(2)}</p>
        <p className="text-[var(--text-muted)]">
          {new Date(peak.date).toLocaleDateString('pt-BR')} · {peak.platform_name}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs">
      <span className={v >= 0 ? 'text-[var(--green)] font-bold' : 'text-[var(--red)] font-bold'}>
        {v >= 0 ? '+' : ''}{formatCurrency(v)}
      </span>
    </div>
  )
}

export default function MiniPnLChart({
  data,
  positive,
  milestones = [],
  peaks = [],
  height = 100,
}: MiniPnLChartProps) {
  const color = positive ? 'var(--green)' : 'var(--red)'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 14, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>

        <Tooltip content={(props: any) => <TooltipContent {...props} peaks={peaks} />} />

        {milestones.map(m => (
          <ReferenceLine key={m} y={m} stroke="var(--gold)" strokeDasharray="3 3" strokeOpacity={0.5} />
        ))}

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#miniGrad)"
          activeDot={{ r: 3, fill: color, stroke: 'var(--background)' }}
          dot={(props: any) => {
            const isPeak = peaks.some(p => p.index === props.index)
            if (!isPeak) return <g key={props.key} />
            return <StarDot key={props.key} cx={props.cx} cy={props.cy} />
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
