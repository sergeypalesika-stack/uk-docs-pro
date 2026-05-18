'use client'
import { Doc, Category } from '@/lib/types'
import { formatDate, getExpiryStatus } from '@/lib/utils'
import ExpiryBadge from './ExpiryBadge'

interface Props {
  doc: Doc
  cat: Category
  lang: 'en' | 'ru'
  onOpen: () => void
}

export default function DocCard({ doc, cat, lang, onOpen }: Props) {
  const title = lang === 'ru' && doc.titleRu ? doc.titleRu : doc.title
  const status = getExpiryStatus(doc.validUntil)
  const isExpired = status && status.days !== null && status.days < 0

  return (
    <div
      onClick={onOpen}
      style={{
        background: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${cat.color}`,
        opacity: isExpired ? 0.6 : 1,
        transition: 'box-shadow 0.15s',
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        background: cat.color + '18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        flexShrink: 0,
      }}>
        {cat.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1a202c',
          marginBottom: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'wrap',
        }}>
          {doc.pinned && <span style={{ fontSize: 10 }}>📌</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          {doc.validUntil && <ExpiryBadge dateStr={doc.validUntil} />}
        </div>

        {doc.number && (
          <div style={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#4a5568',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}>
            {doc.number}
          </div>
        )}

        {doc.validUntil && (
          <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>
            {lang === 'ru' ? 'до' : 'until'} {formatDate(doc.validUntil)}
          </div>
        )}
      </div>

      <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
    </div>
  )
}
