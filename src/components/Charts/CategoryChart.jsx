import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COLORS = ['#FF4500', '#FF8C00', '#FFD700', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']

export default function CategoryChart({ data }) {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'white',
          border: '1.5px solid var(--gray-100)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--gray-800)' }}>
            {payload[0].name}
          </p>
          <p style={{ margin: '3px 0 0 0', fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </p>
        </div>
      )
    }
    return null
  }

  const renderLegend = (props) => {
    const { payload } = props
    return (
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: '10px 0 0 0',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '12px',
        fontFamily: 'Inter',
        color: 'var(--gray-600)'
      }}>
        {payload.map((entry, index) => (
          <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color,
              display: 'inline-block'
            }} />
            <span>{entry.value}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius="65%"
            outerRadius="85%"
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
