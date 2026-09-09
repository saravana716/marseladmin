import React from 'react'

export default function EmptyState({ icon = '🎆', title = 'No items found', text = 'Try creating one or adjusting filters.' }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      color: 'var(--gray-400)',
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      border: '1px dashed var(--gray-200)',
      margin: '20px 0',
      width: '100%'
    }}>
      <div style={{ fontSize: '54px', marginBottom: '12px', opacity: 0.75 }}>{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gray-800)', marginBottom: '6px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--gray-500)', maxWidth: '380px', margin: '0 auto' }}>{text}</p>
    </div>
  )
}
