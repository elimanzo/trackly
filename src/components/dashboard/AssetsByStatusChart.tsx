'use client'

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ASSET_STATUS_CONFIG } from '@/lib/constants'
import type { StatusBreakdown } from '@/lib/types'

interface AssetsByStatusChartProps {
  data: StatusBreakdown[]
  total: number
}

export function AssetsByStatusChart({ data, total }: AssetsByStatusChartProps) {
  const chartData = data.map((d) => ({
    name: ASSET_STATUS_CONFIG[d.status].label,
    value: d.count,
    color: ASSET_STATUS_CONFIG[d.status].color,
  }))

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Assets by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  fontSize: '12px',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-muted-foreground text-center text-xs">{total} total assets</p>
      </CardContent>
    </Card>
  )
}
