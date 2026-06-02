'use client'
import { useState, useRef, useEffect } from 'react'
import * as DB from '@/lib/db'
import type { JobApplication, JobApplicationFile } from '@/lib/db'

// ── Цвета статусов ────────────────────────────────────
const STATUS_CONFIG = {
  applied:     { label: 'Applied',      labelRu: 'Отправлено',    color: '#2457a4', bg: '#dbeafe' },
  interview:   { label: 'Interview',    labelRu: 'Собеседование', color: '#d97706', bg: '#fef3c7' },
  offer:       { label: 'Offer',        labelRu: 'Оффер',         color: '#16a34a', bg: '#dcfce7' },
  rejected:    { label: 'Rejected',     labelRu: 'Отказ',         color: '#dc2626', bg: '#fee2e2' },
  no_response: { label: 'No response',  labelRu: 'Нет ответа',   color: '#6b7280', bg: '#f3f4f6' },
}

const COLORS = ['#2457a4','#16a34a','#d97706','#7c3aed','#0891b2','#be185d','#1a202c']

const EMPTY: Omit<JobApplication, 'id'|'user_id'|'created_at'|'updated_at'|'job_application_files'> = {
  company: '', position: '', cv_name: '', applied_date: new Date().toISOString().slice(0,10),
  status: 'applied', notes: '', color: '#2457a4', pinned: false,
}

interface Props {
  userId: string
  dark: boolean
  lang: 'en' | 'ru' | 'uk'
}

export default function JobApplicationsTab({ userId, dark, lang }: Props) {
  const t = (en: string, ru: string) => lang === 'en' ? en : ru

  // ── Цвета темы ─────────────────────────────────────
  const C = {
    bg:      dark ? '#0f172a' : '#f8fafc',
    surface: dark ? '#1e293b' : '#ffffff',
    border:  dark ? '#334155' : '#e2e8f0',
    text:    dark ? '#f1f5f9' : '#1a202c',
    textSub: dark ? '#94a3b8' : '#64748b',
    muted:   dark ? '#64748b' : '#94a3b8',
    navy:    '#1a4480',
    red:     '#dc2626',
  }

  const [apps, setApps]           = useState<(JobApplication & { job_application_files: JobApplicationFile[] })[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'list'|'detail'|'add'|'edit'>('list')
  const [sel, setSel]             = useState<(JobApplication & { job_application_files: JobApplicationFile[] }) | null>(null)
  const [form, setForm]           = useState({ ...EMPTY })
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState<string>('all')
  const [saving, setSaving]       = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Загрузка ────────────────────────────────────────
  useEffect(() => {
    DB.getJobApplications(userId).then(data => { setApps(data); setLoading(false) })
  }, [userId])

  // ── Фильтрация ──────────────────────────────────────
  const filtered = apps.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.company.toLowerCase().includes(q) || a.position.toLowerCase().includes(q) || a.cv_name.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  // ── Статистика ──────────────────────────────────────
  const stats = {
    total:     apps.length,
    applied:   apps.filter(a => a.status === 'applied').length,
    interview: apps.filter(a => a.status === 'interview').length,
    offer:     apps.filter(a => a.status === 'offer').length,
    rejected:  apps.filter(a => a.status === 'rejected').length,
  }

  // ── CRUD ────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.company || !form.position) return
    setSaving(true)
    const created = await DB.addJobApplication(userId, form)
    if (created) setApps(prev => [{ ...created, job_application_files: [] }, ...prev])
    setForm({ ...EMPTY })
    setView('list')
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!sel || !form.company || !form.position) return
    setSaving(true)
    await DB.updateJobApplication(sel.id, form)
    const updated = { ...sel, ...form, updated_at: new Date().toISOString() }
    setApps(prev => prev.map(a => a.id === sel.id ? updated : a))
    setSel(updated)
    setView('detail')
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await DB.deleteJobApplication(id)
    setApps(prev => prev.filter(a => a.id !== id))
    setView('list')
    setSel(null)
    setConfirmDel(null)
  }

  const handleTogglePin = async (app: typeof sel) => {
    if (!app) return
    const newPinned = !app.pinned
    await DB.updateJobApplication(app.id, { pinned: newPinned })
    const updated = { ...app, pinned: newPinned }
    setApps(prev => prev.map(a => a.id === app.id ? updated : a))
    setSel(updated)
  }

  const handleUpdateStatus = async (app: typeof sel, status: JobApplication['status']) => {
    if (!app) return
    await DB.updateJobApplication(app.id, { status })
    const updated = { ...app, status }
    setApps(prev => prev.map(a => a.id === app.id ? updated : a))
    setSel(updated)
  }

  // ── Загрузка PDF ────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !sel) return
    if (file.type !== 'application/pdf') { alert('Only PDF files are supported'); return }
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return }
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const b64 = (ev.target?.result as string).split(',')[1]
      const created = await DB.addJobApplicationFile(sel.id, userId, file.name, file.type, file.size, b64)
      if (created) {
        const updated = { ...sel, job_application_files: [...(sel.job_application_files || []), created] }
        setApps(prev => prev.map(a => a.id === sel.id ? updated : a))
        setSel(updated)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const downloadFile = (f: JobApplicationFile) => {
    const a = document.createElement('a')
    a.href = `data:${f.mime_type};base64,${f.data_base64}`
    a.download = f.name
    a.click()
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!sel) return
    await DB.deleteJobApplicationFile(fileId)
    const updated = { ...sel, job_application_files: sel.job_application_files.filter(f => f.id !== fileId) }
    setApps(prev => prev.map(a => a.id === sel.id ? updated : a))
    setSel(updated)
  }

  const openAdd = () => { setForm({ ...EMPTY }); setView('add') }
  const openEdit = () => {
    if (!sel) return
    setForm({ company: sel.company, position: sel.position, cv_name: sel.cv_name,
      applied_date: sel.applied_date?.slice(0,10) || new Date().toISOString().slice(0,10),
      status: sel.status, notes: sel.notes, color: sel.color, pinned: sel.pinned })
    setView('edit')
  }

  const inputStyle = {
    width: '100%', background: C.surface, border: `1.5px solid ${C.border}`,
    borderRadius: 10, padding: '11px 12px', fontSize: 14, color: C.text,
    outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 4, display: 'block' as const, textTransform: 'uppercase' as const }

  // ═══════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════
  if (view === 'list') return (
    <div style={{ padding: '0 0 80px' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '12px 16px 4px' }}>
        {[
          { label: t('Total','Всего'), value: stats.total, color: '#2457a4' },
          { label: t('Interview','Собесед.'), value: stats.interview, color: '#d97706' },
          { label: t('Offer','Оффер'), value: stats.offer, color: '#16a34a' },
          { label: t('Rejected','Отказ'), value: stats.rejected, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: `1.5px solid ${C.border}` }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textSub, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('Search companies...','Поиск компаний...')}
          style={{ ...inputStyle, flex: 1 }} />
        <select value={filterStatus} onChange={e => setFilter(e.target.value)}
          style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
          <option value="all">{t('All','Все')}</option>
          {Object.entries(STATUS_CONFIG).map(([k,v]) => (
            <option key={k} value={k}>{lang === 'en' ? v.label : v.labelRu}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>⏳</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, padding: 40, fontSize: 14 }}>
            {t('No applications yet','Заявок пока нет')}
          </div>
        )}
        {filtered.map(app => {
          const st = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied
          return (
            <div key={app.id} onClick={() => { setSel(app); setView('detail') }}
              style={{ background: C.surface, borderRadius: 14, padding: '14px 16px',
                border: `1.5px solid ${app.pinned ? app.color : C.border}`,
                borderLeft: `4px solid ${app.color}`, cursor: 'pointer',
                boxShadow: app.pinned ? `0 0 0 1px ${app.color}33` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    {app.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.company}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>{app.position}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color,
                      background: st.bg, borderRadius: 20, padding: '2px 10px' }}>
                      {lang === 'en' ? st.label : st.labelRu}
                    </span>
                    {app.cv_name && (
                      <span style={{ fontSize: 11, color: C.muted }}>📄 {app.cv_name}</span>
                    )}
                    {(app.job_application_files?.length || 0) > 0 && (
                      <span style={{ fontSize: 11, color: C.muted }}>📎 {app.job_application_files.length}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', marginTop: 2 }}>
                  {app.applied_date?.slice(0,10)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add button */}
      <button onClick={openAdd}
        style={{ position: 'fixed', bottom: 72, right: 20, width: 52, height: 52, borderRadius: '50%',
          background: C.navy, color: '#fff', border: 'none', fontSize: 26, cursor: 'pointer',
          boxShadow: '0 4px 16px #0004', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        +
      </button>
    </div>
  )

  // ═══════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════
  if (view === 'detail' && sel) {
    const st = STATUS_CONFIG[sel.status] || STATUS_CONFIG.applied
    return (
      <div style={{ padding: '0 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 16px' }}>
          <button onClick={() => { setView('list'); setSel(null) }}
            style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', fontSize: 20, padding: 0 }}>
            ←
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.text, flex: 1 }}>{sel.company}</span>
          {sel.pinned && <span>📌</span>}
        </div>

        {/* Company & position */}
        <div style={{ background: C.surface, borderRadius: 16, padding: 16, border: `1.5px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ borderLeft: `4px solid ${sel.color}`, paddingLeft: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{sel.company}</div>
            <div style={{ fontSize: 14, color: C.textSub, marginTop: 3 }}>{sel.position}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 20, padding: '4px 12px' }}>
              {lang === 'en' ? st.label : st.labelRu}
            </span>
            <span style={{ fontSize: 12, color: C.muted }}>📅 {sel.applied_date?.slice(0,10)}</span>
            {sel.cv_name && <span style={{ fontSize: 12, color: C.muted }}>📄 {sel.cv_name}</span>}
          </div>
        </div>

        {/* Quick status change */}
        <div style={{ background: C.surface, borderRadius: 16, padding: 14, border: `1.5px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 10, textTransform: 'uppercase' }}>
            {t('Update Status','Изменить статус')}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => handleUpdateStatus(sel, k as JobApplication['status'])}
                style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: sel.status === k ? v.color : C.bg,
                  color: sel.status === k ? '#fff' : C.textSub,
                  border: `1.5px solid ${sel.status === k ? v.color : C.border}` }}>
                {lang === 'en' ? v.label : v.labelRu}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        {sel.notes && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 14, border: `1.5px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 6, textTransform: 'uppercase' }}>
              {t('Notes','Заметки')}
            </div>
            <span style={{ fontSize: 13, color: C.textSub, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{sel.notes}</span>
          </div>
        )}

        {/* Attached files */}
        <div style={{ background: C.surface, borderRadius: 16, padding: 14, border: `1.5px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 10, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>📎 {t('Attached CVs','Прикреплённые CV')} <span style={{ background: C.bg, borderRadius: 20, padding: '2px 8px', fontSize: 11, color: C.muted }}>{sel.job_application_files?.length || 0}</span></span>
          </div>
          {(sel.job_application_files || []).map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{(f.size_bytes / 1024).toFixed(0)} KB</div>
              </div>
              <button onClick={() => downloadFile(f)}
                style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                ⬇️
              </button>
              <button onClick={() => handleDeleteFile(f.id)}
                style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12, color: C.red }}>
                ✕
              </button>
            </div>
          ))}
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: '100%', marginTop: 10, background: C.navy, color: '#fff', border: 'none',
              borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            + {t('Attach PDF','Прикрепить PDF')}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button onClick={openEdit}
            style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            ✏️ {t('Edit','Редактировать')}
          </button>
          <button onClick={() => handleTogglePin(sel)}
            style={{ width: '100%', background: sel.pinned ? '#fef9c3' : C.surface,
              border: `1.5px solid ${sel.pinned ? '#fde047' : C.border}`,
              borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              color: sel.pinned ? '#854d0e' : C.textSub }}>
            📌 {sel.pinned ? t('Unpin','Открепить') : t('Pin','Закрепить')}
          </button>
          <button onClick={() => setConfirmDel(sel.id)}
            style={{ width: '100%', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: C.red }}>
            🗑 {t('Delete','Удалить')}
          </button>
        </div>

        {confirmDel === sel.id && (
          <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
            <div style={{ width: '100%', background: C.surface, borderRadius: '20px 20px 0 0', padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{t('Delete application?','Удалить заявку?')}</div>
              <div style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>{sel.company} — {sel.position}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12, cursor: 'pointer', color: C.text, fontSize: 14 }}>
                  {t('Cancel','Отмена')}
                </button>
                <button onClick={() => handleDelete(sel.id)} style={{ flex: 1, background: C.red, border: 'none', borderRadius: 10, padding: 12, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  {t('Delete','Удалить')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════
  // ADD / EDIT FORM
  // ═══════════════════════════════════════════════════
  if (view === 'add' || view === 'edit') return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 16px' }}>
        <button onClick={() => view === 'add' ? setView('list') : setView('detail')}
          style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', fontSize: 20, padding: 0 }}>
          ←
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>
          {view === 'add' ? `💼 ${t('New Application','Новая заявка')}` : `✏️ ${t('Edit','Редактировать')}`}
        </span>
      </div>

      {/* Color picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {COLORS.map(col => (
          <button key={col} onClick={() => setForm(f => ({ ...f, color: col }))}
            style={{ width: 28, height: 28, borderRadius: '50%', background: col, border: 'none', cursor: 'pointer',
              outline: form.color === col ? `3px solid ${col}` : 'none', outlineOffset: 2 }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>{t('Company *','Компания *')}</label>
          <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
            placeholder={t('e.g. Millhouse Window Cleaning','напр. Millhouse Window Cleaning')}
            style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>{t('Position *','Должность *')}</label>
          <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            placeholder={t('e.g. Window Cleaner','напр. Window Cleaner')}
            style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>{t('CV sent','Отправленное CV')}</label>
          <input value={form.cv_name} onChange={e => setForm(f => ({ ...f, cv_name: e.target.value }))}
            placeholder={t('e.g. cv_millhouse.pdf','напр. cv_millhouse.pdf')}
            style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>{t('Date applied','Дата отклика')}</label>
          <input type="date" value={form.applied_date} onChange={e => setForm(f => ({ ...f, applied_date: e.target.value }))}
            style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>{t('Status','Статус')}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => setForm(f => ({ ...f, status: k as JobApplication['status'] }))}
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: form.status === k ? v.color : C.bg,
                  color: form.status === k ? '#fff' : C.textSub,
                  border: `1.5px solid ${form.status === k ? v.color : C.border}` }}>
                {lang === 'en' ? v.label : v.labelRu}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t('Notes','Заметки')}</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder={t('Interview date, contact, salary discussed...','Дата собеседования, контакт, обсуждаемая зарплата...')}
            rows={4} style={{ ...inputStyle, resize: 'vertical' as const }} />
        </div>

        {/* Pin toggle */}
        <div style={{ background: form.pinned ? '#fef9c3' : C.bg, borderRadius: 10, padding: '12px 14px',
          border: `1.5px solid ${form.pinned ? '#fde047' : C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          onClick={() => setForm(f => ({ ...f, pinned: !f.pinned }))}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: form.pinned ? '#f59e0b' : 'transparent',
            border: form.pinned ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {form.pinned ? '✓' : ''}
          </div>
          <span style={{ fontSize: 13, color: form.pinned ? '#854d0e' : C.textSub, fontWeight: 600 }}>
            📌 {t('Pin this application','Закрепить эту заявку')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => view === 'add' ? setView('list') : setView('detail')}
            style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 0', fontSize: 14, cursor: 'pointer', color: C.text }}>
            {t('Cancel','Отмена')}
          </button>
          <button onClick={view === 'add' ? handleAdd : handleUpdate}
            disabled={!form.company || !form.position || saving}
            style={{ flex: 2, background: form.company && form.position ? C.navy : '#cbd5e0',
              border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 700,
              cursor: form.company && form.position ? 'pointer' : 'default', color: '#fff' }}>
            {saving ? '⏳' : view === 'add' ? t('Save','Сохранить') : t('Save Changes','Сохранить изменения')}
          </button>
        </div>
      </div>
    </div>
  )

  return null
}
