export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getExpiryStatus(dateStr: string): {
  days: number | null
  color: string
  bg: string
  label: string
} | null {
  const days = daysUntil(dateStr)
  if (days === null) return null
  if (days < 0)   return { days, color: '#c62828', bg: '#fce8e8', label: 'Expired' }
  if (days <= 30)  return { days, color: '#e65100', bg: '#fff3e0', label: `${days}d left` }
  if (days <= 90)  return { days, color: '#f57f17', bg: '#fffde7', label: `${days}d left` }
  return { days, color: '#2e7d32', bg: '#e8f5e9', label: `${days}d left` }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
