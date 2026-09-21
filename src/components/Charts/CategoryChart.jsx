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
            Revenue: ₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
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
        padding: '0 10px 0 0',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontSize: '12px',
        fontFamily: 'Inter',
        color: 'var(--gray-600)',
        maxHeight: '280px',
        overflowY: 'auto',
        width: '140px'
      }}>
        {payload.map((entry, index) => (
          <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: entry.color,
              display: 'inline-block',
              flexShrink: 0
            }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={entry.value}>
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="35%"
            cy="50%"
            innerRadius="55%"
            outerRadius="75%"
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            content={renderLegend} 
            layout="vertical" 
            verticalAlign="middle" 
            align="right" 
            wrapperStyle={{ right: 0 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
