'use client'

import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface MiniPnLChartProps {
  data: { value: number }[]
  positive: boolean
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs">
      <span className={v >= 0 ? 'text-[var(--green)] font-bold' : 'text-[var(--red)] font-bold'}>
        {v >= 0 ? '+' : ''}{formatCurrency(v)}
      </span>
    </div>
  )
}

export default function MiniPnLChart({ data, positive }: MiniPnLChartProps) {
  const color = positive ? 'var(--green)' : 'var(--red)'
  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
          fill="url(#miniGrad)" dot={false}
          activeDot={{ r: 3, fill: color, stroke: 'var(--background)' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
