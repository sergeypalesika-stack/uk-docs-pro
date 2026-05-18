'use client'
import { ReactNode } from 'react'

export default function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid #f0f4f8', paddingBottom: 12, marginBottom: 12 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#a0aec0',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 14,
        color: '#2d3748',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
      }}>
        {children}
      </div>
    </div>
  )
}
