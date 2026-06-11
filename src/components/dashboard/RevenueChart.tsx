import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyTotal } from '@/lib/dashboard-types'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface RevenueChartProps {
  data: DailyTotal[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatted = data.map((d) => ({
    date: format(parseISO(d.date), 'dd MMM', { locale: it }),
    total: d.total,
  }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) => `€${v}`}
          />
          <Tooltip
            contentStyle={{
              background: '#141414',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#fff' }}
            itemStyle={{ color: '#3b82f6' }}
            formatter={(v: number) => [`€${v.toFixed(2)}`, 'Totale']}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#revGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
