// ─── Currency (INR) ───
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0)
}

// ─── Date ───
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(dateStr))
}

// ─── Date + Time ───
export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

// ─── Initials ───
export function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ─── Truncate ───
export function truncate(text, len = 50) {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '…' : text
}

// ─── Stock color ───
export function stockColor(stock) {
  if (stock === 0) return '#EF4444'
  if (stock < 10) return '#F59E0B'
  return '#10B981'
}

// ─── Order status config ───
export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export function statusConfig(status) {
  const map = {
    Pending:    { color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
    Processing: { color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
    Shipped:    { color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
    Delivered:  { color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
    Cancelled:  { color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  }
  return map[status] || { color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' }
}
