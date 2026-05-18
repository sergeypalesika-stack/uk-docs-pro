'use client'
import { ReactNode } from 'react'

export default function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}
