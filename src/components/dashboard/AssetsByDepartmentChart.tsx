'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DepartmentBreakdown } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/formatters'

interface AssetsByDepartmentChartProps {
  data: DepartmentBreakdown[]
}

export function AssetsByDepartmentChart({ data }: AssetsByDepartmentChartProps) {
  const chartData = data.map((d) => ({
    name: d.departmentName,
    assets: d.count,
    value: d.value,
  }))

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Assets by Department</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => String(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                fontSize: '12px',
              }}
              formatter={(value, name) => [
                name === 'value' && typeof value === 'number' ? formatCurrency(value) : value,
                name === 'value' ? 'Total value' : 'Assets',
              ]}
            />
            <Bar dataKey="assets" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
