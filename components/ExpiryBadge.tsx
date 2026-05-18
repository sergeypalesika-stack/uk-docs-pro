'use client'
import { getExpiryStatus } from '@/lib/utils'

export default function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const status = getExpiryStatus(dateStr)
  if (!status) return null
  return (
    <span style={{
      background: status.bg,
      color: status.color,
      fontSize: 11,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 20,
      marginLeft: 6,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {status.label}
    </span>
  )
}
