import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function SalesChart({ data }) {
  const formatYAxis = (value) => {
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
    return `₹${value}`
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          border: '1.5px solid var(--gray-100)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600 }}>{payload[0].payload.dateLabel}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 800, color: 'var(--primary-dark)' }}>
            ₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorSales)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
