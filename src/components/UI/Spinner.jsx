import React from 'react'

export default function Spinner({ size = 'md', color = 'primary' }) {
  const sizeMap = {
    sm: { width: '16px', height: '16px', borderSize: '2px' },
    md: { width: '28px', height: '28px', borderSize: '3px' },
    lg: { width: '48px', height: '48px', borderSize: '4px' },
  }

  const config = sizeMap[size] || sizeMap.md
  const isDark = color === 'dark'

  return (
    <div style={{ display: 'inline-block' }}>
      <div
        style={{
          width: config.width,
          height: config.height,
          border: `${config.borderSize} solid ${isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255, 69, 0, 0.15)'}`,
          borderTopColor: isDark ? 'var(--gray-700)' : 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
