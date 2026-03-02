'use client'

import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DataPoint {
  date: string
  cumulative: number
}

interface PnLChartProps {
  data: DataPoint[]
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  const isPos = value >= 0
  return (
    <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      <p className={isPos ? 'text-[var(--green)] font-bold' : 'text-[var(--red)] font-bold'}>
        {isPos ? '+' : ''}{formatCurrency(value)}
      </p>
    </div>
  )
}

export default function PnLChart({ data }: PnLChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm">
        Nenhuma sessão registrada ainda.
      </div>
    )
  }

  const isPositive = (data[data.length - 1]?.cumulative ?? 0) >= 0
  const color = isPositive ? 'var(--green)' : 'var(--red)'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `R$${(v / 100).toFixed(0)}`}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={color}
          strokeWidth={2}
          fill="url(#pnlGradient)"
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: 'var(--background)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
