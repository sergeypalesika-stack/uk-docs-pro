'use client'
import { useState, useEffect } from 'react'

export default function NotificationManager({ docs, passports, lang, dark }) {
  const [permission, setPermission] = useState('default')
  const [enabled, setEnabled] = useState(false)

  const t = (en, uk) => lang === 'en' ? en : uk

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      setEnabled(localStorage.getItem('uk-docs-notifications') === 'on')
    }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function(){})
    }
  }, [])

  useEffect(() => {
    if (!enabled || permission !== 'granted') return
    checkExpiringDocs()
  }, [enabled, permission, docs, passports])

  const checkExpiringDocs = () => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const lastCheck = localStorage.getItem('uk-docs-last-notif-check')
    if (lastCheck === today) return
    localStorage.setItem('uk-docs-last-notif-check', today)

    const allItems = [
      ...docs.map(function(d){ return { title: d.title, date: d.valid_until, member: d.member } }),
      ...passports.map(function(p){ return { title: p.type, date: p.expiry_date, member: p.member } }),
    ].filter(function(i){ return i.date })

    allItems.forEach(function(item) {
      const days = Math.ceil((new Date(item.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (days === 30 || days === 14 || days === 7 || days === 1) {
        try {
          new Notification('⚠️ UK Docs: ' + t('Document expiring', 'Документ закінчується'), {
            body: item.title + (item.member ? ' (' + item.member + ')' : '') + ' — ' + days + ' ' + t('days left', 'днів'),
            icon: '/icon-192.png',
            tag: 'expiry-' + item.title,
          })
        } catch (err) {}
      }
    })
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert(t('Notifications not supported on this browser', 'Сповіщення не підтримуються цим браузером'))
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      setEnabled(true)
      localStorage.setItem('uk-docs-notifications', 'on')
      try {
        new Notification('✅ UK Docs', {
          body: t('Notifications enabled! Alerts at 30, 14, 7 and 1 days before expiry.', 'Сповіщення увімкнено! Попередження за 30, 14, 7 та 1 день.'),
          icon: '/icon-192.png',
        })
      } catch (err) {}
    }
  }

  const toggleOff = () => {
    setEnabled(false)
    localStorage.setItem('uk-docs-notifications', 'off')
  }

  return (
    <div style={{ background: dark ? '#1e293b' : '#fff', borderRadius: 14, padding: '16px 18px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f1f3d' }}>
            {t('Expiry Notifications', 'Сповіщення про документи')}
          </div>
          <div style={{ fontSize: 12, color: '#7a8aaa', marginTop: 2 }}>
            {enabled && permission === 'granted'
              ? t('Active — alerts at 30/14/7/1 days', 'Активно — за 30/14/7/1 днів')
              : t('Get alerts before documents expire', 'Попередження до закінчення документів')}
          </div>
        </div>
        {enabled && permission === 'granted' ? (
          <button onClick={toggleOff} style={{ background: '#16a34a', border: 'none', borderRadius: 20, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>ON</button>
        ) : (
          <button onClick={requestPermission} style={{ background: dark ? '#334155' : '#e2e8f4', border: 'none', borderRadius: 20, padding: '8px 16px', color: dark ? '#94a3b8' : '#7a8aaa', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OFF</button>
        )}
      </div>
    </div>
  )
}
