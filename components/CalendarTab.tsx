'use client'

export default function CalendarTab({ docs, passports, jobs, getHMRCDeadlines, lang, dark }) {
  const t = (en, uk) => lang === 'en' ? en : uk

  const now = new Date()

  // Collect all events
  const events = []

  // Document expirations
  docs.forEach(function(d) {
    if (d.valid_until) {
      events.push({ date: new Date(d.valid_until), icon: '📄', title: d.title + (d.member ? ' (' + d.member + ')' : ''), type: t('Document expires', 'Документ закінчується'), color: '#dc2626' })
    }
  })

  // Passport expirations
  passports.forEach(function(p) {
    if (p.expiry_date) {
      events.push({ date: new Date(p.expiry_date), icon: '📘', title: p.type + (p.member ? ' (' + p.member + ')' : ''), type: t('Passport expires', 'Паспорт закінчується'), color: '#dc2626' })
    }
  })

  // HMRC deadlines
  getHMRCDeadlines().forEach(function(d) {
    if (d.diff >= 0) {
      events.push({ date: d.date, icon: d.icon, title: d.label, type: 'HMRC', color: '#b45309' })
    }
  })

  // Job interviews (jobs with interview status)
  ;(jobs || []).forEach(function(j) {
    if (j.status === 'interview') {
      events.push({ date: new Date(), icon: '💼', title: j.title + ' @ ' + j.company, type: t('Interview stage', 'Етап співбесіди'), color: '#1d4ed8', noDate: true })
    }
  })

  // Sort by date, filter future + next 365 days
  const sorted = events
    .filter(function(e) { return e.noDate || (e.date >= now && (e.date.getTime() - now.getTime()) < 365 * 86400000) })
    .sort(function(a, b) { return (a.noDate ? 0 : a.date.getTime()) - (b.noDate ? 0 : b.date.getTime()) })

  // Group by month
  const groups = {}
  sorted.forEach(function(e) {
    const key = e.noDate ? 'now' : e.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  const daysUntil = (d) => Math.ceil((d.getTime() - now.getTime()) / 86400000)

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, color: dark ? '#f1f5f9' : '#0f1f3d', marginBottom: 16 }}>
        📅 {t('Upcoming Events', 'Майбутні події')}
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7a8aaa' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14 }}>{t('No upcoming events', 'Немає майбутніх подій')}</div>
        </div>
      )}

      {Object.keys(groups).map(function(month) { return (
        <div key={month} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7a8aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {month === 'now' ? t('Active now', 'Зараз активно') : month}
          </div>
          {groups[month].map(function(e, i) {
            const days = e.noDate ? null : daysUntil(e.date)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: dark ? '#1e293b' : '#fff', borderRadius: 12, padding: '12px 14px', marginBottom: 8, borderLeft: '4px solid ' + e.color, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{e.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f1f3d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: '#7a8aaa', marginTop: 2 }}>
                    {e.type}{!e.noDate && ' · ' + e.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {days !== null && (
                  <div style={{ flexShrink: 0, background: days <= 30 ? '#fee2e2' : days <= 90 ? '#fff7ed' : (dark ? '#0f172a' : '#f1f5fb'), color: days <= 30 ? '#dc2626' : days <= 90 ? '#b45309' : '#7a8aaa', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                    {days}d
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )})}
    </div>
  )
}
