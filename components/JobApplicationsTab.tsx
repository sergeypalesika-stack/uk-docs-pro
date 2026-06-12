'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const sb = () => createClient()

const STATUSES = [
  { id: 'saved',      label: 'Saved',      labelUk: 'Збережено',   color: '#64748b', bg: '#f1f5f9' },
  { id: 'applied',    label: 'Applied',    labelUk: 'Подано',       color: '#1d4ed8', bg: '#eff6ff' },
  { id: 'interview',  label: 'Interview',  labelUk: 'Інтерв\'ю',   color: '#b45309', bg: '#fff7ed' },
  { id: 'offer',      label: 'Offer!',     labelUk: 'Оффер!',      color: '#166534', bg: '#f0fdf4' },
  { id: 'rejected',   label: 'Rejected',   labelUk: 'Відмова',     color: '#991b1b', bg: '#fee2e2' },
]

const EMPTY = { title: '', company: '', location: '', url: '', salary: '', status: 'saved', notes: '', date_applied: new Date().toISOString().slice(0,10) }

const C = {
  navy: '#0f1f3d', blue: '#2457a4', surface: '#ffffff', bg: '#f1f5fb',
  border: '#e2e8f4', text: '#1a2035', muted: '#7a8aaa', red: '#dc2626',
}

function iStyle(extra = {}) {
  return { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', background: '#fff', boxSizing: 'border-box', ...extra }
}

export default function JobApplicationsTab({ userId, dark, lang }) {
  const [jobs, setJobs] = useState([])
  const [view, setView] = useState('list')
  const [form, setForm] = useState(EMPTY)
  const [selJob, setSelJob] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const t = (en, uk) => lang === 'uk' ? uk : lang === 'ru' ? uk : en

  useEffect(() => {
    loadJobs()
  }, [userId])

  const loadJobs = async () => {
    const { data } = await sb().from('job_applications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setJobs(data || [])
  }

  const saveJob = async () => {
    if (!form.title || !form.company) return
    setSaving(true)
    if (selJob) {
      await sb().from('job_applications').update(form).eq('id', selJob.id)
      setJobs(prev => prev.map(j => j.id === selJob.id ? { ...j, ...form } : j))
    } else {
      const { data } = await sb().from('job_applications').insert({ user_id: userId, ...form }).select().single()
      if (data) setJobs(prev => [data, ...prev])
    }
    setSaving(false)
    setView('list')
    setSelJob(null)
    setForm(EMPTY)
  }

  const deleteJob = async (id) => {
    await sb().from('job_applications').delete().eq('id', id)
    setJobs(prev => prev.filter(j => j.id !== id))
    setConfirmDel(null)
    setView('list')
    setSelJob(null)
  }

  const getStatus = (id) => STATUSES.find(s => s.id === id) || STATUSES[0]

  const filtered = jobs.filter(j => {
    const matchStatus = filterStatus === 'all' || j.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const stats = STATUSES.map(s => ({ ...s, count: jobs.filter(j => j.status === s.id).length }))

  // ── LIST VIEW
  if (view === 'list') return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {stats.map(s => (
          <div key={s.id} onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
            style={{ flexShrink: 0, background: filterStatus === s.id ? s.color : (dark ? '#1e293b' : C.surface), color: filterStatus === s.id ? '#fff' : s.color, border: `1.5px solid ${s.color}`, borderRadius: 12, padding: '8px 12px', cursor: 'pointer', textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{s.count}</div>
            <div style={{ fontSize: 10, fontWeight: 600 }}>{lang !== 'en' ? s.labelUk : s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder={t('Search jobs…', 'Пошук вакансій…')}
        style={{ ...iStyle({ marginBottom: 12, background: dark ? '#1e293b' : '#fff', color: dark ? '#f1f5f9' : C.text, border: `1.5px solid ${dark ? '#334155' : C.border}` }) }}
      />

      {/* Job cards */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💼</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#f1f5f9' : C.navy, marginBottom: 6 }}>
            {t('No applications yet', 'Немає заявок')}
          </div>
          <div style={{ fontSize: 13 }}>{t('Add your first job application', 'Додай першу вакансію')}</div>
        </div>
      )}

      {filtered.map(j => {
        const st = getStatus(j.status)
        return (
          <div key={j.id} onClick={() => { setSelJob(j); setView('detail') }}
            style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, marginBottom: 10, padding: '14px 16px', cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.06)', borderLeft: `4px solid ${st.color}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f1f5f9' : C.navy }}>{j.title}</span>
                  <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    {lang !== 'en' ? st.labelUk : st.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: dark ? '#93c5fd' : C.blue, fontWeight: 600 }}>🏢 {j.company}</div>
                {j.status === 'applied' && j.date_applied && Math.ceil((Date.now() - new Date(j.date_applied).getTime()) / 86400000) >= 7 && (
                  <div style={{ display: 'inline-block', background: '#fff7ed', color: '#b45309', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, marginTop: 4 }}>
                    ⏰ {Math.ceil((Date.now() - new Date(j.date_applied).getTime()) / 86400000)} {lang !== 'en' ? 'днів — час нагадати про себе!' : 'days — time to follow up!'}
                  </div>
                )}
                {j.location && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>📍 {j.location}</div>}
                {j.salary && <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>💰 {j.salary}</div>}
                {j.date_applied && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t('Applied','Подано')}: {j.date_applied}</div>}
              </div>
              <span style={{ color: C.muted, fontSize: 20 }}>›</span>
            </div>
          </div>
        )
      })}

      {/* FAB */}
      <button onClick={() => { setSelJob(null); setForm(EMPTY); setView('add') }}
        style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, background: C.navy, color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 20px rgba(15,31,61,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>+</button>
    </div>
  )

  // ── DETAIL VIEW
  if (view === 'detail' && selJob) {
    const st = getStatus(selJob.status)
    return (
      <div>
        <button onClick={() => { setView('list'); setSelJob(null) }}
          style={{ background: dark ? '#1e293b' : C.surface, border: `1px solid ${dark ? '#334155' : C.border}`, borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: dark ? '#f1f5f9' : C.navy, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>←</span> {t('Back', 'Назад')}
        </button>

        <div style={{ background: `linear-gradient(135deg, ${st.color}, ${st.color}cc)`, borderRadius: 20, padding: '22px 20px', marginBottom: 3, color: '#fff' }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{selJob.title}</div>
          <div style={{ fontSize: 15, opacity: 0.85 }}>🏢 {selJob.company}</div>
          {selJob.location && <div style={{ fontSize: 13, opacity: 0.7, marginTop: 3 }}>📍 {selJob.location}</div>}
          {selJob.salary && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>💰 {selJob.salary}</div>}
        </div>

        <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: '0 0 20px 20px', padding: '18px 20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ background: st.bg, color: st.color, fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{lang !== 'en' ? st.labelUk : st.label}</span>
            {selJob.date_applied && <span style={{ fontSize: 12, color: C.muted }}>· {selJob.date_applied}</span>}
          </div>

          {selJob.url && (
            <a href={selJob.url} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#eff6ff', borderRadius: 10, marginBottom: 10, color: C.blue, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              🔗 {t('View Job Posting', 'Переглянути вакансію')}
            </a>
          )}

          {selJob.status === 'applied' && (
            <button onClick={() => {
              const followUpText = 'Dear Hiring Team,\n\nI hope this message finds you well. I recently applied for the ' + selJob.title + ' position at ' + selJob.company + ' and wanted to follow up on my application.\n\nI remain very interested in this opportunity and would welcome the chance to discuss how my experience could contribute to your team.\n\nThank you for your time and consideration.\n\nBest regards,\nSergii Palesika'
              navigator.clipboard.writeText(followUpText)
              alert(t('Follow-up email copied to clipboard! Paste it into your email.', 'Лист скопійовано! Встав його у пошту.'))
            }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, marginBottom: 10, color: '#b45309', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
              ✉️ {t('Copy Follow-up Email Template', 'Скопіювати шаблон follow-up листа')}
            </button>
          )}

          {selJob.notes && (
            <div style={{ background: dark ? '#0f172a' : C.bg, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>📝 {t('Notes', 'Нотатки')}</div>
              <div style={{ fontSize: 13, color: dark ? '#e2e8f0' : C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selJob.notes}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <button onClick={() => { setForm({ title: selJob.title, company: selJob.company, location: selJob.location || '', url: selJob.url || '', salary: selJob.salary || '', status: selJob.status, notes: selJob.notes || '', date_applied: selJob.date_applied || '' }); setView('add') }}
            style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1d4ed8' }}>
            ✏️ {t('Edit', 'Редагувати')}
          </button>
          <button onClick={() => setConfirmDel(selJob.id)}
            style={{ background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 12, padding: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: C.red }}>
            🗑 {t('Delete', 'Видалити')}
          </button>
        </div>

        {/* Status change */}
        <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 10 }}>{t('Change Status', 'Змінити статус')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button key={s.id} onClick={async () => {
                await sb().from('job_applications').update({ status: s.id }).eq('id', selJob.id)
                const updated = { ...selJob, status: s.id }
                setJobs(prev => prev.map(j => j.id === selJob.id ? updated : j))
                setSelJob(updated)
              }} style={{ background: selJob.status === s.id ? s.color : (dark ? '#0f172a' : C.bg), color: selJob.status === s.id ? '#fff' : s.color, border: `1.5px solid ${s.color}`, borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {lang !== 'en' ? s.labelUk : s.label}
              </button>
            ))}
          </div>
        </div>

        {confirmDel === selJob.id && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 14, padding: 18, textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, marginBottom: 14 }}>{t('Delete this application?', 'Видалити цю заявку?')}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13 }}>{t('Cancel', 'Скасувати')}</button>
              <button onClick={() => deleteJob(selJob.id)} style={{ flex: 1, background: C.red, border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>{t('Delete', 'Видалити')}</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ADD / EDIT FORM
  return (
    <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 16, padding: 24 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: dark ? '#f1f5f9' : C.navy, marginBottom: 20 }}>
        {selJob ? `✏️ ${t('Edit Application', 'Редагувати заявку')}` : `💼 ${t('Add Application', 'Додати вакансію')}`}
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{t('Job Title *', 'Назва посади *')}</div>
        <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. HVAC Engineer, Delivery Driver…" style={iStyle()} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{t('Company *', 'Компанія *')}</div>
        <input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} placeholder="Company name" style={iStyle()} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>📍 {t('Location', 'Місто')}</div>
          <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="London, Remote…" style={iStyle()} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>💰 {t('Salary', 'Зарплата')}</div>
          <input value={form.salary} onChange={e => setForm(f => ({...f, salary: e.target.value}))} placeholder="£30k / £15/hr…" style={iStyle()} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>🔗 {t('Job URL', 'Посилання на вакансію')}</div>
        <input value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} placeholder="https://indeed.com/job/…" style={iStyle()} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{t('Date Applied', 'Дата подачі')}</div>
        <input type="date" value={form.date_applied} onChange={e => setForm(f => ({...f, date_applied: e.target.value}))} style={iStyle()} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{t('Status', 'Статус')}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => setForm(f => ({...f, status: s.id}))}
              style={{ background: form.status === s.id ? s.color : C.bg, color: form.status === s.id ? '#fff' : s.color, border: `1.5px solid ${s.color}`, borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {lang !== 'en' ? s.labelUk : s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>📝 {t('Notes', 'Нотатки')}</div>
        <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3}
          placeholder={t('Interview notes, contacts, requirements…', 'Нотатки про співбесіду, контакти, вимоги…')}
          style={{ ...iStyle(), resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { setView(selJob ? 'detail' : 'list'); setForm(EMPTY) }}
          style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.muted, fontWeight: 600 }}>
          {t('Cancel', 'Скасувати')}
        </button>
        <button onClick={saveJob} disabled={!form.title || !form.company || saving}
          style={{ flex: 2, background: form.title && form.company ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
          {saving ? '⏳' : selJob ? t('Save Changes', 'Зберегти') : t('Add Application', 'Додати')}
        </button>
      </div>
    </div>
  )
}
