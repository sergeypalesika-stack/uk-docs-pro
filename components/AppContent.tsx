'use client'

// Основной компонент приложения - отделен от page.tsx для исправления компиляции SWC

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import * as DB from '@/lib/db'
import type { Address, DocPhoto, Resume, ResumeFile } from '@/lib/db'
import { CATEGORIES, DEFAULT_TODOS, NATIONALITIES, AVATARS } from '@/lib/data'
import { daysUntil, formatDate, generateId, getExpiryStatus } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

// ── ТИПЫ
interface Doc { id: string; category: string; title: string; title_ru: string; number: string; valid_from: string | null; valid_until: string | null; notes: string; notes_ru: string; pinned: boolean; member: string; document_photos?: DocPhoto[] }
interface PassportPhoto { id: string; label: string; data_url: string; added_at: string }
interface Passport { id: string; type: string; number: string; issued_by: string; issued_date: string | null; expiry_date: string | null; notes: string; passport_photos: PassportPhoto[] }
interface Profile { id: string; name: string; name_ru: string; dob: string; nationality: string; avatar: string }
interface TodoItem { id: string; text: string; textRu: string; done: boolean; week: number; category: string }

введите Lang = 'en' | 'ру' | 'Великобритания'
type Theme = 'light' | 'dark'
type MainTab = 'home' | 'docs' | 'passport' | 'todo' | 'address' | 'resume' | 'medical' | 'profile'
type View = 'list' | 'detail' | 'add' | 'edit' | 'addPassport' | 'passportDetail' | 'editProfile' | 'editAddress' | 'editTodo' | 'addTodo' | 'export' | 'addResume' | 'editResume' | 'resumeDetail'

// ── ЦВЕТА
const C = { navy: '#0f1f3d', navyM: '#1a2e50', blue: '#2457a4', accent: '#3b82f6', surface: '#ffffff', bg: '#f1f5fb', border: '#e2e8f4', muted: '#7a8aaa', text: '#1a2035', textSub: '#4a5570', red: '#dc2626', green: '#16a34a' }

const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', background: C.bg, boxSizing: 'border-box' }

// ── МЕЛКИЕ КОМПОНЕНТЫ
function ExpiryBadge({ d }) {
  const st = getExpiryStatus(d); if (!st) return null
  return <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{st.label}</span>
}
function CopyBtn({ value, lang }) {
  const [ок, setOk] = useState(false)
  return <button onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1800) }} style={{ background: ok ? '#dcfce7' : C.bg, color: ok ? '#166534' : C.blue, border: `1.5px solid ${ok ? '#86efac' : C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{ok ? '✓' : '⎘'} {ok ? (lang === 'ru' ? 'Скопировано' : 'Скопировано') : (lang === 'ru' ? 'Копировать' : 'Копировать')</button>
}
function FField({ label, children }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{label}</div>{children}</div>
}
function DRow({ label, children }) {
  return <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>{label}</div><div style={{ fontSize: 14, color: C.text, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>{children}</div></div>
}
function SLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>{children}</div>
}

// ── ГЛАВНОЕ
export default function AppContent() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [docs, setDocs] = useState([])
  const [passports, setPassports] = useState([])
  const [todos, setTodos] = useState(DEFAULT_TODOS)
  const [lang, setLang] = useState('ru')
  const [tab, setTab] = useState('docs')
  const [view, setView] = useState('list')
  const [selDoc, setSelDoc] = useState(null)
  const [selPass, setSelPass] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selAddr, setSelAddr] = useState(null)
  const [resumes, setResumes] = useState([])
  const [selResume, setSelResume] = useState(null)
  const EMPTY_RESUME = {
    заголовок:'', направление:'', компания:'', статус:'черновик',
    краткое описание:'', навыки:'', опыт:'', образование:'', примечания:'',
    color:'#1a4480', pinned:false
  }
  const [resumeForm, setResumeForm] = useState(EMPTY_RESUME)
  const [cvCopied, setCvCopied] = useState(false)
  const [qrDoc, setQrDoc] = useState(null)
  const [theme, setTheme] = useState('light')
  const [pinLocked, setPinLocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [medical, setMedical] = useState([])
  const [contacts, setContacts] = useState([])
  const [medForm, setMedForm] = useState({ type: 'gp', title: '', value: '', notes: '', valid_until: '' })
  const [contactForm, setContactForm] = useState({ name: '', relation: '', phone: '', notes: '', is_primary: false })
  const [selMed, setSelMed] = useState (нуль)
  const [selContact, setSelContact] = useState(null)
  const resumeFileRef = useRef(null)
  const [resumeFiles, setResumeFiles] = useState([])
  const [fileUploading, setFileUploading] = useState(false)
  const [addrForm, setAddrForm] = useState({ label: '', label_ru: '', line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom', notes: '', is_home: false, color: '#2457a4' })
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmDel,setConfirmDel]= useState(null)
  const [photoView, setPhotoView] = useState(null)
  const [profForm, setProfForm] = useState({})
  const [docForm, setDocForm] = useState({ category: 'immigration', title: '', title_ru: '', number: '', valid_from: '', valid_until: '', notes: '', notes_ru: '', pinned: false })
  const [passForm, setPassForm] = useState({ type: 'Украинский паспорт', number: '', issued_by: '', issued_date: '', expiry_date: '', notes: '', member: '' })
  const [photoLabel, setPhotoLabel] = useState('')
  const passPhotoRef = useRef(null)
  const passCameraRef = useRef(null)
  const docPhotoRef = useRef(null)
  const docCameraRef = useRef(null)
  const [docPhotoLabel, setDocPhotoLabel] = useState('')
  const supabase = createClient()

  const t = useCallback((en, ru, uk) => lang === 'ru' ? ru : lang === 'uk' ? (uk || ru): en, [lang])

  // Темный режим
  const dark = theme === 'dark'
  const Dd = { navy: '#e2e8f0', navyM: '#cbd5e1', blue: '#60a5fa', accent: '#3b82f6', surface: '#1e293b', bg: '#0f172a', border: '#334155', muted: '#64748b', text: '#f1f5f9', textSub: '#94a3b8', red: '#f87171', green: '#4ade80' }
  const Dl = { navy: C.navy, navyM: C.navyM, blue: C.blue, accent: C.accent, surface: C.surface, bg: C.bg, border: C.border, muted: C.muted, text: C.text, textSub: C.textSub, red: C.red, green: C.green }
  const D = dark ? Dd : Dl

  const toggleTheme = () => {
    const nt = theme === 'light' ? 'dark' : 'light'
    setTheme(nt); localStorage.setItem('uk_theme', nt)
  }

  // Функции PIN-кода
  const PIN_KEY = 'uk_pin'
  const checkPin = (input) => {
    const stored = localStorage.getItem(PIN_KEY)
    if (input === stored) { setPinLocked(false); setPinInput(''); setPinError(false) }
    else { setPinError(true); setTimeout(() => { setPinError(false); setPinInput('') }, 1000) }
  }
  const setPin = (pin) => { localStorage.setItem(PIN_KEY, pin) }
  const removePin = () => { localStorage.removeItem(PIN_KEY) }

  // Медицинские работники
  const handleAddMedical = async () => {
    if (!user || !medForm.title) return
    setSaving(true)
    const nm = await DB.addMedical(user.id, { ...medForm, valid_until: medForm.valid_until || null })
    if (nm) setMedical(prev => [...prev, nm])
    setMedForm({ type: 'gp', title: '', value: '', notes: '', valid_until: '' })
    setSaving(false)
  }
  const handleDeleteMedical = async (id) => {
    await DB.deleteMedical(id)
    setMedical(prev => prev.filter(m => m.id !== id))
    setSelMed(null)
  }

  // Обработчики контактов
  const handleAddContact = async () => {
    if (!user || !contactForm.name || !contactForm.phone) return
    setSaving(true)
    const nc = await DB.addContact(user.id, contactForm)
    if (nc) setContacts(prev => [...prev, nc])
    setContactForm({ name: '', relation: '', phone: '', notes: '', is_primary: false })
    setSaving(false)
  }
  const handleDeleteContact = async (id) => {
    await DB.deleteContact(id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setSelContact(null)
  }

  // Результаты глобального поиска
  const gq = globalSearch.toLowerCase().trim()
  const getSearchResults = () => {
    if (gq.length <= 1) return []
    const results = []
    docs.filter(d => d.title.toLowerCase().includes(gq) || (d.title_ru || '').toLowerCase().includes(gq) || (d.number || '').toLowerCase().includes(gq)).forEach(d => results.push({ type: 'doc', icon: '📄', title: d.title, sub: d.number || '', id: d.id, action: () => { setTab('docs'); setSelDoc(d); setView('detail'); setShowSearch(false); setGlobalSearch('') } }))
    passports.filter(p => p.type.toLowerCase().includes(gq) || p.number.toLowerCase().includes(gq)).forEach(p => results.push({ type: 'pass', icon: '📘', title: p.type, sub: p.number, id: p.id, action: () => { setTab('passport'); setSelPass(p); setView('passportDetail'); setShowSearch(false); setGlobalSearch('') } }))
    addresses.filter(a => a.label.toLowerCase().includes(gq) || a.city.toLowerCase().includes(gq)).forEach(a => results.push({ type: 'addr', icon: '📍', title: a.label, sub: [a.city, a.postcode].filter(Boolean).join(', '), id: a.id, action: () => { setTab('address'); setSelAddr(a); setView('detail'); setShowSearch(false); setGlobalSearch('') } }))
    resumes.filter(r => r.title.toLowerCase().includes(gq) || r.direction.toLowerCase().includes(gq)).forEach(r => results.push({ type: 'cv', icon: '📝', title: r.title, sub: r.direction, id: r.id, action: () => { setTab('resume'); setSelResume(r); setView('resumeDetail'); setShowSearch(false); setGlobalSearch('') } }))
    todos.filter(t => t.text.toLowerCase().includes(gq) || t.textRu.toLowerCase().includes(gq)).forEach(t => results.push({ type: 'todo', icon: t.done ? '✅' : '⬜', title: t.text, sub: '', id: t.id, action: () => { setTab('todo'); setShowSearch(false); setGlobalSearch('') } }))
    вернуть результаты
  }
  const searchResults = getSearchResults()
  const cat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

  // ── ЗАГРУЗИТЬ
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      если (!user) вернуть
      setUser(user)
      const [prof, docs, passes, todos, addrs, res, med, ctcts] = await Promise.all([
        DB.getProfile(user.id),
        DB.getDocsWithPhotos(user.id),
        DB.getPassports(user.id),
        DB.getTodos(user.id),
        DB.getAddresses(user.id),
        DB.getResumesWithFiles(user.id),
        DB.getMedical(user.id),
        DB.getContacts(user.id),
      ])
      setProfile(prof)
      setProfForm(prof || {})
      setDocs(docs)
      setPassports(passes)
      setTodos(todos)
      setAddresses(addrs)
      setResumes(res as (Resume & { resume_files: ResumeFile[] })[])
      setMedical(med)
      setContacts(ctcts)
      await DB.seedDefaultDocs(user.id)
      const FreshDocs = ждут DB.getDocsWithPhotos(user.id)
      setDocs(freshDocs)
      const saved = localStorage.getItem('uk_lang')
      if (saved) setLang(saved)
      const th = localStorage.getItem('uk_theme')
      if (th) setTheme(th)
      const pin = localStorage.getItem('uk_pin')
      if (pin) setPinLocked(true)
      setLoading(false)
    }
    нагрузка()
  }, [])

  // ── ФУНКЦИИ ЭКСПОРТА ───────────────────────────────────
  const exportCSV = () => {
    const rows: string[][] = [
      ['Категория', 'Название', 'Название RU', 'Номер', 'Действительно с', 'Действительно до', 'Примечания'],
    ]
    docs.forEach(d => {
      const c = CATEGORIES.find(c => c.id === d.category)
      rows.push([
        c?.label || d.category,
        d.title, d.title_ru || '',
        d.number || '',
        d.valid_from || '', d.valid_until || '',
        d.notes || '',
      ])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uk-docs-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPrint = () => {
    const name = profile?.name || user?.email || 'User'
    const dob ​​= profile?.dob ? formatDate(profile.dob) : '—'
    const expiring = docs.filter(d => { const x = daysUntil(d.valid_until || ''); return x !== null && x >= 0 && x <= 90 })
    const expired = docs.filter(d => { const x = daysUntil(d.valid_until || ''); return x !== null && x < 0 })

    const docRows = docs.map(d => {
      const c = CATEGORIES.find(c => c.id === d.category)
      const status = d.valid_until ? (daysUntil(d.valid_until || '')! < 0 ? '❌ EXPIRED' : `✓ ${daysUntil(d.valid_until || '')}d left`) : '—'
      return `<tr><td>${c?.icon || ''} ${d.title}</td><td style="font-family:monospace">${d.number || '—'}</td><td>${d.valid_until ? formatDate(d.valid_until) '—'}</td><td>${status}</td></tr>`
    }).присоединиться('')

    const addrRows = addresses.map(a =>
      `<tr><td>${a.is_home ? '🏠' : '📍'} <b>${a.label}</b></td><td>${[a.line1,a.line2,a.city,a.postcode,a.country].filter(Boolean).join(', ')}</td></tr>`
    ).присоединиться('')

    const todoRows = todos.map(t =>
      `<tr><td>${t.done ? '✅' '⬜'}</td><td style="text-decoration:${t.done?'line-through':'none'};color:${t.done?'#aaa':'#000'}">${t.text}</td></tr>`
    ).присоединиться('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Документы Великобритании — ${name}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #111; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1 { color: #0f1f3d; border-bottom: 3px solid #0f1f3d; padding-bottom: 8px; }
      h2 { color: #2457a4; margin-top: 24px; margin-bottom: 8px; font-size: 15px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #0f1f3d; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px; }
      td { padding: 7px 10px; border-bottom: 1px solid #e2e8f4; vertical-align: top; }
      tr:nth-child(even) td { background: #f8fafc; }
      .warn { background: #fff7ed !important; color: #c2410c; font-weight: bold; }
      .expired { background: #fee2e2 !important; color: #dc2626; font-weight: bold; }
      .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>🇬🇧 Документы Великобритании — ${name}</h1>
    <div class="meta">Сгенерировано: ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}  |  Дата рождения: ${dob}  |  ${user?.email}</div>

    ${expiring.length > 0 || expired.length > 0 ? `
    <h2>⚠️ Требуется внимание</h2>
    <table><tr><th>Статус документа</th><th>
    ${expired.map(d=>`<tr class="expired"><td>${d.title}</td><td>EXPIRED ${formatDate(d.valid_until || '')}</td></tr>`).join('')}
    ${expiring.map(d=>`<tr class="warn"><td>${d.title}</td><td>Срок действия истекает через ${daysUntil(d.valid_until || '')} дней — ${formatDate(d.valid_until || '')}</td></tr>`).join('')}
    </table>` : ''}

    <h2>📂 Документы (${docs.length})</h2>
    <table><tr><th>Номер/код документа</th><th>Срок действия</th><th>Статус</th></tr>${docRows}</table>

    ${addresses.length > 0 ? `<h2>📍 Адреса (${addresses.length})</h2>
    <table><tr><th>Label</th><th>Address</th></tr>${addrRows}</table>` : ''}

    <h2>✅ План действий (${todos.filter(t=>t.done).length}/${todos.length} выполнено)</h2>
    <table><tr><th style="width:30px"></th><th>Задача</th></tr>${todoRows}</table>
    </body></html>`

    const w = window.open('', '_blank', 'width=900,height=700')!
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const [copyDone, setCopyDone] = useState(false)
  const exportClipboard = () => {
    const name = profile?.name || user?.email || ''
    const lines: string[] = [
      `Документы Великобритании — ${имя}`,
      `Сгенерировано: ${new Date().toLocaleDateString('en-GB')}`,
      '',
      '=== ДОКУМЕНТЫ ===',
    ]
    docs.forEach(d => {
      lines.push(`• ${d.title}${d.number ? ' — ' + d.number : ''}${d.valid_until ? ' (until ' + formatDate(d.valid_until) + ')' : ''}`)
    })
    if (addresses.length > 0) {
      lines.push('', '=== АДРЕСА ===')
      addresses.forEach(a => {
        lines.push(`• ${a.is_home ? '[HOME] ' : ''}${a.label}: ${[a.line1,a.city,a.postcode].filter(Boolean).join(', ')}`)
      })
    }
    lines.push('', '=== ЗАДАЧИ ===')
    todos.forEach(t => lines.push(`${t.done ? '[✓]' : '[ ]'} ${t.text}`))
    navigator.clipboard.writeText(lines.join('\n'))
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2500)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  const switchLang = () => { const nl = lang === 'ru' ? 'en': lang === 'en'? 'ук': 'ру'; setLang (НЛ); localStorage.setItem('uk_lang', nl) }
  const switchTab = (tb) => { setTab(tb); setView('list'); setSelDoc(null); setSelPass(null); setSearch('') }

  // ── ОТФИЛЬТРОВАННЫЕ ДОКУМЕНТЫ
  const filteredDocs = docs.filter(d => {
    const mc = filterCat === 'all' || d.category === filterCat
    const q = search.toLowerCase()
    return mc && (!q || d.title.toLowerCase().includes(q) || d.title_ru?.toLowerCase().includes(q) || d.number?.toLowerCase().includes(q))
  })
  const pinned = filteredDocs.filter(d => d.pinned)
  const rest = filteredDocs.filter(d => !d.pinned)
  const expiring60 = docs.filter(d => { const x = daysUntil(d.valid_until || ''); return x !== null && x >= 0 && x <= 60 })
  const todoDone = todos.filter(t => t.done).length

  // ── ДЕЙСТВИЯ С ДОКУМЕНТОМ
  const handleAddDoc = async () => {
    if (!user || !docForm.title) return
    setSaving(true)
    const nd = await DB.addDoc(user.id, { ...docForm, valid_from: docForm.valid_from || null, valid_until: docForm.valid_until || null })
    if (nd) setDocs(prev => [nd, ...prev])
    setDocForm({ category: 'immigration', title: '', title_ru: '', number: '', valid_from: '', valid_until: '', notes: '', notes_ru: '', pinned: false })
    switchTab('docs'); setSaving(false)
  }
  const handleDeleteDoc = async (id) => {
    await DB.deleteDoc(id)
    setDocs(prev => prev.filter(d => d.id !== id))
    setConfirmDel(null); setSelDoc(null); setView('list')
  }
  const handleTogglePin = async (doc) => {
    await DB.updateDoc(doc.id, { pinned: !doc.pinned })
    const nd = docs.map(d => d.id === doc.id ? { ...d, pinned: !d.pinned } : d)
    setDocs(nd)
    if (selDoc?.id === doc.id) setSelDoc({ ...doc, pinned: !doc.pinned })
  }

  const handleUpdateDoc = async () => {
    if (!selDoc) return
    setSaving(true)
    await DB.updateDoc(selDoc.id, {
      title: docForm.title, title_ru: docForm.title_ru,
      номер: docForm.number,
      valid_from: docForm.valid_from || null, valid_until: docForm.valid_until || null,
      примечания: docForm.notes, notes_ru: docForm.notes_ru,
      закреплено: docForm.pinned,
    })
    const updated = { ...selDoc, ...docForm, valid_from: docForm.valid_from || null, valid_until: docForm.valid_until || null }
    setDocs(prev => prev.map(d => d.id === selDoc.id ? updated : d))
    setSelDoc(updated)
    setView('detail')
    setSaving(false)
  }

  // ── ДЕЙСТВИЯ С ПАСПОРТОМ
  const handleAddPassport = async () => {
    if (!user || !passForm.number) return
    setSaving(true)
    const np = await DB.addPassport(user.id, { ...passForm, issued_date: passForm.issued_date || null, expiry_date: passForm.expiry_date || null })
    if (np) setPassports(prev => [{ ...(np), passport_photos: [] }, ...prev])
    setPassForm({ type: 'Украинский паспорт', number: '', issued_by: '', issued_date: '', expiry_date: '', notes: '' })
    switchTab('passport'); setSaving(false)
  }
  const handleDeletePassport = async (id) => {
    await DB.deletePassport(id)
    setPassports(prev => prev.filter(p => p.id !== id))
    setConfirmDel(null); setSelPass(null); setView('list')
  }

  // ── СЖАТИЕ ИЗОБРАЖЕНИЯ → base64 (максимум 900 пикселей, ~150 КБ)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      // В случае сбоя холста: резервный вариант: необработанный base64.
      const fallback = () => {
        const r = new FileReader()
        r.onload = e => resolve(e.target?.result || '')
        r.onerror = () => resolve('')
        r.readAsDataURL(file)
      }
      пытаться {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          пытаться {
            const MAX = 900
            let { width, height } = img
            if (width > MAX || height > MAX) {
              if (width > height) { height = Math.round(height * MAX / width); width = MAX }
              else { width = Math.round(width * MAX / height); height = MAX }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) { URL.revokeObjectURL(url); fallback(); return }
            ctx.drawImage(img, 0, 0, width, height)
            URL.revokeObjectURL(url)
            const result = canvas.toDataURL('image/jpeg', 0.72)
            // Если размер все еще слишком большой, сжимайте сильнее.
            if (result.length > 1400000) {
              const c2 = document.createElement('canvas')
              const M2 = 600
              пусть w2 = ширина, h2 = высота
              if (w2 > M2) { h2 = Math.round(h2 * M2/w2); w2 = M2 }
              c2.width = w2; c2.height = h2
              c2.getContext('2d')!.drawImage(img, 0, 0, w2, h2)
              resolve(c2.toDataURL('image/jpeg', 0.60))
            } еще {
              resolve(result)
            }
          } catch { URL.revokeObjectURL(url); fallback() }
        }
        img.onerror = () => { URL.revokeObjectURL(url); fallback() }
        img.src = url
      } catch { fallback() }
    })
  }

  const handleAddPhoto = async (file) => {
    if (!user || !selPass) return
    константная метка = photoLabel || t('Страница', 'Страница', 'Сторинка')
    setSaving(true)
    пытаться {
      const dataUrl = await compressImage(file)
      const ph = ожидание DB.addPassportPhoto(selPass.id, user.id, label, dataUrl)
      если (ph) {
        const updated = passports.map(p => p.id === selPass.id
          ? { ...p, passport_photos: [...p.passport_photos, ph] }
          : п)
        setPassports(updated)
        setSelPass(updated.find(p => p.id === selPass.id) || null)
      }
      setPhotoLabel('')
    } catch(e) {
      console.error('Ошибка фото:', e)
      alert(t('Загрузка не удалась. Попробуйте еще раз.', 'Ошибка загрузки.', 'Помилка завантаження.'))
    }
    setSaving(false)
  }
  const handleDeletePhoto = async (passportId: string, photoId: string) => {
    await DB.deletePassportPhoto(photoId)
    const updated = passports.map(p => p.id === passportId ? { ...p, passport_photos: p.passport_photos.filter(ph => ph.id !== photoId) } : p)
    setPassports(updated)
    setSelPass(updated.find(p => p.id === passportId) || null)
  }

  // ── TODO
  const handleToggleTodo = async (item) => {
    если (!user) вернуть
    const nt = todos.map(t => t.id === item.id ? { ...t, done: !t.done } : t)
    setTodos(nt)
    await DB.toggleTodoDB(user.id, item.id, !item.done)
  }

  // ── ВОЗОБНОВЛЕНИЕ ДЕЙСТВИЙ ───────────────────────────────────
  const handleAddResume = async () => {
    if (!user || !resumeForm.title) return
    setSaving(true)
    const nr = await DB.addResume(user.id, resumeForm)
    if (nr) setResumes(prev => [nr, ...prev])
    setResumeForm(EMPTY_RESUME)
    switchTab('resume')
    setSaving(false)
  }

  const handleUpdateResume = async () => {
    if (!user || !selResume) return
    setSaving(true)
    await DB.updateResume(selResume.id, resumeForm)
    const updated = { ...selResume, ...resumeForm, updated_at: new Date().toISOString() }
    setResumes(prev => prev.map(r => r.id === selResume.id ? updated : r))
    setSelResume(updated)
    setView('resumeDetail')
    setSaving(false)
  }

  const handleDeleteResume = async (id) => {
    await DB.deleteResume(id)
    setResumes(prev => prev.filter(r => r.id !== id))
    setConfirmDel(null); setSelResume(null); setView('list')
  }

  // ── ЗАГРУЗКА ФАЙЛА ВОЗОБНОВЛЕНИЯ
  const handleUploadResumeFile = async (file) => {
    if (!user || !selResume) return
    const MAX_MB = 5
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(t(`Файл слишком большой. Макс ${MAX_MB}MB.`, `Файл занадто великий. Макс ${MAX_MB}МБ.`, `Файл занадто великий. Макс ${MAX_MB}МБ.`))
      возвращаться
    }
    setFileUploading(true)
    const reader = new FileReader()
    reader.onload = async e => {
      const base64 = (e.target?.result) || ''
      const rf = await DB.addResumeFile(selResume.id, user.id, file.name, file.type, file.size, base64)
      если (rf) {
        const updated = { ...selResume, resume_files: [...(selResume).resume_files || [], rf] }
        setSelResume(updated)
        setResumes(prev => prev.map(r => r.id === selResume.id ? { ...r, resume_files: [...(r).resume_files || [], rf] } : r))
      }
      setFileUploading(false)
    }
    reader.onerror = () => { setFileUploading(false) }
    reader.readAsDataURL(file)
  }

  const handleDeleteResumeFile = async (fileId) => {
    if (!selResume) return
    await DB.deleteResumeFile(fileId)
    const updated = { ...selResume, resume_files: ((selResume).resume_files || []).filter((f) => f.id !== fileId) }
    setSelResume(updated)
    setResumes(prev => prev.map(r => r.id === selResume.id ? updated : r))
  }

  const downloadResumeFile = (file) => {
    const a = document.createElement('a')
    a.href = file.data_base64
    a.download = file.name
    a.click()
  }

  const formatFileSize = (bytes) => {
    Если (байты < 1024), вернуть `${байты}B`
    Если (байты < 1024 * 1024), вернуть `${(байты / 1024).toFixed(0)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  const fileIcon = (mime) => {
    if (mime.includes('pdf')) return '📄'
    if (mime.includes('word') || mime.includes('docx') || mime.includes('doc')) return '📝'
    if (mime.includes('text')) return '📃'
    if (mime.includes('image')) return '🖼️'
    return '📎'
  }

  const handleToggleResumePin = async (r) => {
    await DB.updateResume(r.id, { pinned: !r.pinned })
    setResumes(prev => prev.map(x => x.id === r.id ? { ...x, pinned: !x.pinned } : x))
    if (selResume?.id === r.id) setSelResume({ ...r, pinned: !r.pinned })
  }

  const copyResumeToClipboard = (r) => {
    const parts = [
      р.титул,
      r.direction ? `Position: ${r.direction}` : '',
      r.company ? `Компания: ${r.company}` : '',
      '',
      r.summary ? `ОБО МНЕ\n${r.summary}` : '',
      r.skills ? `\nКЛЮЧЕВЫЕ НАВЫКИ\n${r.skills}` : '',
      r.experience ? `\nEXPERIENCE\n${r.experience}` : '',
      r.education ? `\nОБРАЗОВАНИЕ\n${r.education}` : '',
      r.notes ? `\nNOTES\n${r.notes}` : '',
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(parts)
  }

  const RESUME_STATUSES = [
    { id: 'draft', en: 'Draft', ru: 'Чернетка', uk: 'Чернетка', цвет: '#546e7a', bg: '#f1f5fb' },
    { id: 'ready', en: 'Ready', ru: 'Готово', uk: 'Готово', цвет: '#2e7d32', bg: '#f0fdf4' },
    { id: 'sent', en: 'Sent', ru: 'Відправлено', uk: 'Відправлено', color: '#1d4ed8', bg: '#eff6ff' },
    { id: 'интервью', en: 'Интервью', ru: 'Интервью', uk: 'Интервью', цвет: '#b45309', bg: '#fff7ed' },
    { id: 'rejected', en: 'Rejected', ru: 'Відмова', uk: 'Відмова', цвет: '#c62828', bg: '#fee2e2' },
  ]
  const resumeStatus = (id) => RESUME_STATUSES.find(s => s.id === id) || RESUME_STATUSES[0]


  const FAMILY = ['Сергей', 'Я сам / Сам', 'Дружина/Жена', 'Дитина/Ребёнок', 'Мама', 'Тато/Папа']
  const RESUME_COLORS = ['#1a4480','#0369a1','#2e7d32','#b45309','#c62828','#5b21b6','#0f766e','#1a2a4a']

  const handleResetTodos = async () => {
    если (!user) вернуть
    await DB.resetTodosDB(user.id)
    setTodos(DEFAULT_TODOS.map(t => ({ ...t, done: false })))
  }

  // ── ДЕЙСТВИЯ ПО УКАЗАНИЮ АДРЕСА
  const handleAddAddress = async () => {
    if (!user || !addrForm.label) return
    setSaving(true)
    if (addrForm.is_home) await DB.setHomeAddress(user.id, 'none')
    const na = await DB.addAddress(user.id, addrForm)
    если (на) {
      if (addrForm.is_home) setAddresses(prev => [na, ...prev.map(a => ({ ...a, is_home: false }))])
      иначе setAddresses(prev => [...prev, na])
    }
    setAddrForm({ label: '', label_ru: '', line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom', notes: '', is_home: false, color: '#2457a4' })
    switchTab('address'); setSaving(false)
  }
  const handleDeleteAddress = async (id) => {
    await DB.deleteAddress(id)
    setAddresses(prev => prev.filter(a => a.id !== id))
    setConfirmDel(null); setSelAddr(null); setView('list')
  }
  const handleSetHome = async (addr) => {
    если (!user) вернуть
    await DB.setHomeAddress(user.id, addr.id)
    setAddresses(prev => prev.map(a => ({ ...a, is_home: a.id === addr.id })))
    setSelAddr({ ...addr, is_home: true })
  }

  const handleUpdateAddress = async () => {
    if (!user || !selAddr) return
    setSaving(true)
    await DB.updateAddress(selAddr.id, addrForm)
    const updated = { ...selAddr, ...addrForm }
    if (addrForm.is_home) {
      await DB.setHomeAddress(user.id, selAddr.id)
      setAddresses(prev => prev.map(a => a.id === selAddr.id ? { ...updated, is_home: true } : { ...a, is_home: false }))
    } еще {
      setAddresses(prev => prev.map(a => a.id === selAddr.id ? updated : a))
    }
    setSelAddr(updated)
    setView('detail')
    setSaving(false)
  }

  // ── TODO EDIT
  const [todoForm, setTodoForm] = useState({ text: '', textRu: '', category: 'other', week: 1 })
  const [selTodo, setSelTodo] = useState(null)

  const handleAddTodo = async () => {
    if (!user || !todoForm.text) return
    const newTodo: TodoItem = { id: генерироватьId(), текст: todoForm.text, textRu: todoForm.textRu, сделано: false, неделя: todoForm.week, категория: todoForm.category }
    const nt = [...todos, newTodo]
    setTodos(nt)
    try { localStorage.setItem('uk_todos_v2', JSON.stringify(nt)) } catch(_) {}
    await DB.toggleTodoDB(user.id, newTodo.id, false)
    setTodoForm({ text: '', textRu: '', category: 'other', week: 1 })
    setView('list')
  }

  // ── Действия с фотографиями в формате DOC
  const handleAddDocPhoto = async (file) => {
    if (!user || !selDoc) return
    константная метка = docPhotoLabel || t('Фото', 'Фото', 'Фото')
    setSaving(true)
    пытаться {
      const dataUrl = await compressImage(file)
      const ph = await DB.addDocPhoto(selDoc.id, user.id, label, dataUrl)
      если (ph) {
        const updated = { ...selDoc, document_photos: [...(selDoc.document_photos || []), ph] }
        setDocs(prev => prev.map(d => d.id === selDoc.id ? updated : d))
        setSelDoc(updated)
      }
      setDocPhotoLabel('')
    } catch(e) {
      console.error('Ошибка фото:', e)
      alert(t('Загрузка не удалась. Попробуйте еще раз.', 'Ошибка загрузки.', 'Помилка завантаження.'))
    }
    setSaving(false)
  }

  const handleDeleteDocPhoto = async (photoId) => {
    if (!selDoc) return
    await DB.deleteDocPhoto(photoId)
    const updated = { ...selDoc, document_photos: (selDoc.document_photos || []).filter(p => p.id !== photoId) }
    setDocs(prev => prev.map(d => d.id === selDoc.id ? updated : d))
    setSelDoc(updated)
  }

  const handleUpdateTodo = async () => {
    if (!selTodo) return
    const nt = todos.map(t => t.id === selTodo.id ? { ...t, text: todoForm.text, textRu: todoForm.textRu, category: todoForm.category, week: todoForm.week } : t)
    setTodos(nt)
    try { localStorage.setItem('uk_todos_v2', JSON.stringify(nt)) } catch(_) {}
    setSelTodo(null)
    setView('list')
  }

  const handleDeleteTodo = async (id) => {
    если (!user) вернуть
    const nt = todos.filter(t => t.id !== id)
    setTodos(nt)
    try { localStorage.setItem('uk_todos_v2', JSON.stringify(nt)) } catch(_) {}
    await DB.resetTodosDB(user.id)
    for (const t of nt) { if (t.done) await DB.toggleTodoDB(user.id, t.id, true) }
    setConfirmDel(null)
    setSelTodo(null)
    setView('list')
  }

  // ── ПОДЕЛИТЬСЯ АДРЕСОМ
  const shareAddress = (addr, via) => {
    const full = [addr.line1, addr.line2, addr.city, addr.postcode, addr.country].filter(Boolean).join(', ')
    const label = lang !== 'en' && addr.label_ru ? addr.label_ru : addr.label
    const text = encodeURIComponent(`📍 ${label}\n${full}${addr.notes ? '\n' + addr.notes : ''}`)
    if (via === 'whatsapp') window.open(`https://wa.me/?text=${text}`, '_blank')
    else window.open(`https://t.me/share/url?url=${text}`, '_blank')
  }

  // ── СКОПИРУЙТЕ АДРЕС
  const copyAddress = (addr) => {
    const full = [addr.line1, addr.line2, addr.city, addr.postcode, addr.country].filter(Boolean).join(', ')
    navigator.clipboard.writeText(full)
  }

  // ── ЦВЕТА АДРЕСА
  const ADDR_COLORS = ['#2457a4','#0369a1','#2e7d32','#b45309','#c62828','#5b21b6','#0f766e','#1a2a4a']

  // ── ДОМАШНИЙ АДРЕС
  const homeAddr = addresses.find(a => a.is_home)

  // ── СОХРАНЕНИЕ ПРОФИЛЯ
  const handleSaveProfile = async () => {
    если (!user) вернуть
    setSaving(true)
    await DB.upsertProfile(user.id, { name: profForm.name || '', name_ru: profForm.name_ru || '', доб: profForm.dob || '', национальность: profForm.nationality || 'Украинец', аватар: profForm.avatar || '👤' })
    const fresh = await DB.getProfile(user.id)
    setProfile(fresh); setSaving(false); setView('list')
  }

  возвращаться (
    <div style={{ minHeight: '100vh', background: theme === 'dark' ? '#0f172a' : C.bg, color: theme === 'dark' ? '#f1f5f9' : C.text }}>

      {/* Загрузка */}
      {загрузка && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 16, zIndex: 500 }}>
          <div style={{ fontSize: 48 }}>🇬🇧</div>
          <div style={{ color: C.muted, fontSize: 14 }}>Загрузка ваших документов…</div>
        </div>
      )}

      {/* Экран ввода PIN-кода */}
      {pinLocked && !loading && (
        <PinScreen
          pinInput={pinInput}
          pinError={pinError}
          темный={темный}
          onKey={(k) => {
            if (k === 'del') { setPinInput(p => p.slice(0,-1)); return }
            если (k === '') return
            const np = pinInput + k
            setPinInput(np)
            if (np.length === 4) checkPin(np)
          }}
          onRemove={() => { removePin(); setPinLocked(false) }}
          label={t('Введите PIN для продолжения', 'Ввести PIN для входа', 'Ввести PIN для входа')}
          RemoveLabel={t('Забыли ПИН? Снять блокировку', 'Забули ПИН? Сняли блокировку', 'Забули ПИН? Сняли блокировку')}
        />
      )}

      {/* Модальное окно с QR-кодом */}
      {qrDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setQrDoc(null)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, textAlign: 'center', maxWidth: 320, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f1f3d', marginBottom: 4 }}>{qrDoc.title}</div>
            {qrDoc.member && <div style={{ fontSize: 12, color: '#0369a1', marginBottom: 4, fontWeight: 600 }}>👤 {qrDoc.member}</div>}
            {qrDoc.number && <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#4a5568', marginBottom: 16 }}>{qrDoc.number}</div>}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
                [
                  qrDoc.title,
                  qrDoc.member ? `Владелец: ${qrDoc.member}` : '',
                  qrDoc.number ? `No: ${qrDoc.number}` : '',
                  qrDoc.valid_until ? `Действителен до: ${formatDate(qrDoc.valid_until)}` : '',
                  qrDoc.notes ? `Примечания: ${qrDoc.notes}` : '',
                ].filter(Boolean).join('
')
              )}`}
              alt="QR Code"
              style={{ width: 220, height: 220, borderRadius: 12 }}
            />
            <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 12, lineHeight: 1.5 }}>
              {t('Сканировать, чтобы просмотреть информацию о документе', 'Сканировать для просмотра информации', 'Сканировать для просмотра информации')}
            </div>
            <button onClick={() => setQrDoc(null)} style={{ marginTop: 16, background: '#0f1f3d', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              {t('Закрыть', 'Закрити', 'Закрити')}
            </button>
          </div>
        </div>
      )}

      {/* Просмотрщик фотографий */}
      {photoView && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPhotoView(null)}>
          <img src={photoView} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <div style={{ color: 'rgba(255,255,255,0.4)', FontSize: 13, MarginTop: 16 }}>{t('Нажмите, чтобы закрыть', 'Натисни щоб закрити', 'Натисни щоб закрити')</div>
        </div>
      )}

      {/* Основное приложение (скрыто во время загрузки/заблокировано) */}
      {!loading && !pinLocked && (
      <>

      {/* ══ ВСЕГДА СКОПИРОВАННЫЕ ВХОДНЫЕ ФАЙЛЫ (исправлена ​​ошибка Android removeChild) ══ */}
      <input ref={resumeFileRef} type="file" accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleUploadResumeFile(f);if(resumeFileRef.current)resumeFileRef.current.value=''}} />
      <input ref={docPhotoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleAddDocPhoto(f);if(docPhotoRef.current)docPhotoRef.current.value=''}} />
      <input ref={docCameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleAddDocPhoto(f);if(docCameraRef.current)docCameraRef.current.value=''}} />
      <input ref={passPhotoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleAddPhoto(f);if(passPhotoRef.current)passPhotoRef.current.value=''}} />
      <input ref={passCameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleAddPhoto(f);if(passCameraRef.current)passCameraRef.current.value=''}} />

      {/* ══ ЗАГОЛОВОК ══ */}
      <div style={{ background: dark ? 'linear-gradient(135deg, #1e293b, #0f172a)' : `linear-gradient(135deg, ${C.navy}, ${C.navyM})`, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px' }}>

          {/* Верхняя панель */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🇬🇧</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{profile?.avatar || '👤'}</span>
                <span>{profile?.name || user?.email?.split('@')[0] || 'User'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{user?.email}</div>
            </div>
            {сохранение && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>сохранение…</span>}
            <button onClick={switchLang} title={lang === 'ru' ? «Переключиться на английский»: lang === «en»? 'Перейти на Українську' : 'Переключить на Русский'} style={{ background: 'rgba(255,255,255,0.12)', border: '1px Solid rgba(255,255,255,0.25)', borderRadius: 8, отступ: '5px 11px', цвет: '#fff', FontSize: 13, FontWeight: 700, курсор: «указатель» }}>
              {язык === 'ru' ? '🇬🇧 EN' : lang === 'en' ? '🇺🇦 UA' : '🇷🇺 RU'}
            </button>
            <button onClick={signOut} style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '5px 10px', color: '#fca5a5', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🚪</button>
          </div>

          {/* Статистика */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingBottom: 12 }}>
            {[
              { icon: '📄', val: docs.length, en: 'Documents', ru: 'Документов' },
              { icon: '⚠️', val: expiring60.length, en: 'Expiring', ru: 'Истекает', alert: expiring60.length > 0 },
              { icon: ' ✅', val: `${todoDone}/${todos.length}`, en: 'Tasks', ru: 'Задача' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.warn ? 'rgba(234,88,12,0.2)' : 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px', textAlign: 'center', border: s.warn ? '1px solid rgba(234,88,12,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{s.icon} {lang !== 'en' ? s.ru : s.en}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.warn ? '#fb923c' : '#fff' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Разделитель для нижней навигации */}
          <div style={{ height: 4 }} />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 120px' }}>

        {/* ══════════ Вкладка «Документы» ═══════════ */}

        {/* ══ НАЛОЖЕНИЕ ГЛОБАЛЬНОГО ПОИСКА ══ */}
        {showSearch && (
          <div style={{ position: 'fixed', inset: 0, background: dark ? 'rgba(0,0,0,0.9)' : 'rgba(15,31,61,0.8)', zIndex: 300, padding: '60px 16px 20px' }}
            onClick={() => setShowSearch(false)}>
            <div onClick={e => e.stopPropagation()}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
                <ввод
                  автофокус
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  Placeholder={t('Искать всё…', 'Пошук по всему…', 'Пошук по всему…')}
                  style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: 14, border: 'none', fontSize: 16, background: dark ? '#1e293b' : '#fff', color: D.text, outline: 'none', boxSizing: 'border-box' }}
                />
                {globalSearch && <button onClick={() => setGlobalSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: D.muted, fontSize: 20 }}>×</button>}
              </div>

              {searchResults.length > 0 && (
                <div style={{ background: dark ? '#1e293b' : '#fff', borderRadius: 14, overflow: 'hidden' }}>
                  {searchResults.slice(0, 8).map((r, i) => (
                    <div key={r.id + i} onClick={r.action} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < Math.min(searchResults.length, 8) - 1 ? `1px solid ${D.border}` : 'none', cursor: 'pointer' }}>
                      <span style={{ fontSize: 22 }}>{r.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                        {r.sub && <div style={{ fontSize: 12, color: D.muted, fontFamily: r.type === 'doc' ? 'monospace' : 'inherit' }}>{r.sub}</div>}
                      </div>
                      <span style={{ fontSize: 16, color: D.muted }}>›</span>
                    </div>
                  ))}
                </div>
              )}
              {globalSearch.length > 1 && searchResults.length === 0 && (
                <div style={{ background: dark ? '#1e293b' : '#fff', borderRadius: 14, padding: '20px', textAlign: 'center', color: D.muted, fontSize: 14 }}>
                  {t('Ничего не найдено', 'Ничого не найдено', 'Ничого не найдено')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ ГЛАВНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ ══════════════ */}
        {tab === 'home' && (
          <>
            {/* Добро пожаловать */}
            <div style={{ background: dark ? 'linear-gradient(135deg,#1e3a5f,#0f2040)' : `linear-gradient(135deg,${C.navy},${C.navyM})`, borderRadius: 20, padding: '20px 22px', marginBottom: 14, color: '#fff' }}>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>
                {new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
                {t('Привет', 'Привіт', 'Привіт')}, {profile?.name?.split(' ')[0] || 'там'} 👋
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>
                {docs.length} {t('documents', 'документів', 'документів')} · {resumes.length} CV · {todos.filter(t=>t.done).length}/{todos.length} {t('tasks', 'завдань', 'завдань')}
              </div>
            </div>

            {/* Уведомления об истечении срока действия */}
            {(() => {
              const urgent = docs.filter(d => { const x = daysUntil(d.valid_until || ''); return x !== null && x >= 0 && x <= 30 })
              const expiring = docs.filter(d => { const x = daysUntil(d.valid_until || ''); return x !== null && x > 30 && x <= 90 })
              return urgent.length > 0 || expiring.length > 0 ? (
                <div style={{ background: dark ? '#3b1515' : '#fff7ed', border: `1px solid ${dark ? '#7f1d1d' : '#fed7aa'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ FontSize: 13, FontWeight: 700, цвет: темный? '#fca5a5' : '#c2410c',marginBottom: 8 }}>⚠️ {t('Требуется действие', 'Потребно увага', 'Потребно увага')</div>
                  {urgent.map(d => (
                    <div key={d.id} onClick={() => { setTab('docs'); setSelDoc(d); setView('detail') }} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: dark ? '#fca5a5' : '#7c2d12', marginBottom: 4, cursor: 'pointer', padding: '4px 0' }}>
                      <span>🔴 {d.title_ru && lang !== 'en' ? d.title_ru : d.title</span>
                      <span style={{ fontWeight: 700 }}>{daysUntil(d.valid_until || '')}d</span>
                    </div>
                  ))}
                  {expiring.map(d => (
                    <div key={d.id} onClick={() => { setTab('docs'); setSelDoc(d); setView('detail') }} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: dark ? '#fcd34d' : '#92400e', marginBottom: 4, cursor: 'pointer', padding: '4px 0' }}>
                      <span>🟡 {d.title_ru && lang !== 'en' ? d.title_ru : d.title</span>
                      <span>{daysUntil(d.valid_until || '')}d</span>
                    </div>
                  ))}
                </div>
              ) : нулевой
            })()}

            {/* Быстрая сетка статистики */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { icon: '📂', label: t('Documents','Documenti','Documenti'), val: docs.length, color: C.navy, tab: 'docs' },
                { icon: '📘', label: t('Passports','Паспорти','Паспорти'), val: паспорта.длина, цвет: '#0369a1', вкладка: 'паспорт' },
                { icon: '📍', label: t('Адресы','Адреси','Адреси'), val: addresses.length, color: '#2e7d32', tab: 'address' },
                { icon: '📝', label: 'CV', val: resumes.length, color: '#1a4480', tab: 'resume' },
              ].map((s, i) => (
                <div key={i} onClick={() => switchTab(s.tab)} style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, padding: '16px 14px', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderLeft: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: D.muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Следующие задачи */}
            {todos.filter(t => !t.done).length > 0 && (
              <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ FontSize: 14, FontWeight: 700, Color: D.navy }}> ✅ {t('Следующие задачи', 'Наступні завдання', 'Наступні завдання')</span>
                  <button onClick={() => switchTab('todo')} style={{ background: 'none', border: 'none', color: D.blue, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('All','Всі','Всі')} →</button>
                </div>
                <div style={{ background: D.bg, borderRadius: 10, height: 6, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ background: `linear-gradient(90deg,${C.accent},#22c55e)`, height: '100%', width: `${todos.length ? todoDone/todos.length*100 : 0}%`, borderRadius: 99 }} />
                </div>
                {todos.filter(t => !t.done).slice(0, 3).map(item => (
                  <div key={item.id} onClick={() => handleToggleTodo(item)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${D.border}`, cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${D.border}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: D.text }}>{lang !== 'en' ? item.textRu || item.text : item.text</span>
                  </div>
                ))}
              </div>
            )}

            {/* Быстрый доступ к контактной информации для экстренных случаев */}
            {contacts.length > 0 && (
              <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                <div style={{ FontSize: 14, FontWeight: 700, Color: D.navy, MarginBottom: 12 }}>🆘 {t('Экстренные контакты', 'Екстрі контакты', 'Екстрі контакты')</div>
                {contacts.slice(0, 3).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${D.border}` }}>
                    <span style={{ fontSize: 20 }}>{c.is_primary ? '⭐' : '👤'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: D.muted }}>{c.relation}</div>
                    </div>
                    <a href={`tel:${c.phone}`} style={{ background: '#dcfce7', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#166534', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>📞</a>
                  </div>
                ))}
              </div>
            )}

            {/* QR-код для обмена */}
            {(() => {
              const sc = docs.find(d => d.number && d.title.toLowerCase().includes('share code') && d.title.toLowerCase().includes('work'))
              если (!sc) вернуть null
              возвращаться (
                <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
                  <div style={{ FontSize: 14, FontWeight: 700, Color: D.navy, MarginBottom: 8 }}>📱 {t('Право на работу', 'Право на роботу', 'Право на уу')</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, letterSpacing: '0.1em', color: C.blue, marginBottom: 10 }}>{sc.number}</div>
                  <CopyBtn value={sc.number} lang={lang} />
                </div>
              )
            })()}
          </>
        )}

        {tab === 'docs' && view === 'list' && (
          <>
            {expiring60.length > 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ FontSize: 13, FontWeight: 700, Color: '#c2410c', MarginBottom: 6 }}>⚠️ {t('Скоро истекает срок действия', 'Спливає скоро', 'Спливає скоро')</div>
                {expiring60.map(d => <div key={d.id} style={{ fontSize: 12, color: '#7c2d12', marginBottom: 2 }}>· {lang !== 'en' && d.title_ru ? d.title_ru : d.title} — {daysUntil(d.valid_until || '')}d</div>)}
              </div>
            )}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search…', 'Пошук…', 'Пошук…')} style={{ ...inputStyle, paddingLeft: 36 }} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>×</button>}
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 14, scrollbarWidth: 'none' }}>
              {[{ id: 'all', label: 'All', labelRu: 'Все', icon: '📂', color: C.navy }, ...CATEGORIES].map(c => (
                <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ flexShrink: 0, background: filterCat === c.id ? c.color : C.surface, color: filterCat === c.id ? '#fff' : C.textSub, border: `1.5px solid ${filterCat === c.id ? c.color : C.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {c.icon} {lang !== 'en' ? c.labelRu : c.label}
                </button>
              ))}
            </div>

            {pinned.length > 0 && (<><SLabel>📌 {t('Pinned', 'Закріплені', 'Закріплені')</SLabel>{pinned.map(d => <DocCard key={d.id} doc={d} cat={cat(d.category)} lang={lang} dark={dark} onOpen={() => { setSelDoc(d); setView('detail') }} />)</div style={{ height: 8 }} /></>)}
            {rest.map(d => <DocCard key={d.id} doc={d} cat={cat(d.category)} lang={lang} dark={dark} onOpen={() => { setSelDoc(d); setView('detail') }} />)}

            {filteredDocs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <div>{t('Нет документов', 'Немає документов', 'Немає документов')</div>
              </div>
            )}
            <button onClick={() => setView('add')} style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, background: C.navy, color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 20px rgba(15,31,61,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </>
        )}

        {/* ══ ДЕТАЛИ ДОКУМЕНТА ══ */}
        {tab === 'docs' && view === 'detail' && selDoc && (() => {
          const c = cat(selDoc.category)
          возврат (<>
            <button onClick={() => { setView('list'); setSelDoc(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>← {t('Назад', 'Назад', 'Назад')}</button>
            <div style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)`, borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff', boxShadow: `0 8px 30px ${c.color}40` }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{lang !== 'en' && selDoc.title_ru ? selDoc.title_ru : selDoc.title}</div>
            </div>
            <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '20px 22px', marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {selDoc.number && <DRow label={t('Number / Code', 'Номер / Код', 'Номер / Код')}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}><span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, letterSpacing: '0.07em', color: C.navy }}>{selDoc.number}</span><CopyBtn value={selDoc.number} lang={lang} /></div></DRow>}
              {selDoc.valid_from && <DRow label={t('Действителен с', 'Дійсний з', 'Дійсний з')}>{formatDate(selDoc.valid_from)</DRow>}
              {selDoc.valid_until && <DRow label={t('Действителен до', 'Дійсний до', 'Дійсний до')}><span>{formatDate(selDoc.valid_until)</span><ExpiryBadge d={selDoc.valid_until} /></DRow>}
              {(selDoc.notes || selDoc.notes_ru) && <DRow label={t('Notes', 'Нотатки', 'Нотатки')}><span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.65 }}>{lang !== 'en' && selDoc.notes_ru ? selDoc.notes_ru : selDoc.notes</span></DRow>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setDocForm({ category: selDoc.category, title: selDoc.title, title_ru: selDoc.title_ru, number: selDoc.number, valid_from: selDoc.valid_from || '', valid_until: selDoc.valid_until || '', notes: selDoc.notes, notes_ru: selDoc.notes_ru, pinned: selDoc.pinned }); setView('edit') }} style={{ flex: 1, фон: '#eff6ff', граница: '1.5px Solid #93c5fd', borderRadius: 10, отступ: 12, FontSize: 13, FontWeight: 600, курсор: 'pointer', цвет: '#1d4ed8' }}>✏️ {t('Edit', 'Зминити', 'Зминити')</button>
              <button onClick={() => handleTogglePin(selDoc)} style={{ flex: 1, background: selDoc.pinned ? '#fef9c3' : C.surface, color: selDoc.pinned ? '#854d0e' : C.textSub, border: `1.5px solid ${selDoc.pinned ? '#fde047' : C.border}`, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📌 {selDoc.pinned ? t('Открепить', 'Відкріпити', 'Відкріпити') : t('Закрепить', 'Закріпити', 'Закріпити')</button>
              <button onClick={() => setConfirmDel(selDoc.id)} style={{ flex: 1, background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.red }}>🗑</button>
            </div>

            {/* ── ФОТОГРАФИИ ДОКУМЕНТОВ ── */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                📸 {t('Фотографии документов', 'Фотодокумент', 'Фотодокумент')}
                <span style={{ background: C.bg, borderRadius: 20, padding: '2px 8px', fontSize: 12, color: C.muted, fontWeight: 600 }}>
                  {(selDoc.document_photos || []).length}
                </span>
              </div>

              {/* Фотосетка */}
              {(selDoc.document_photos || []).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {(selDoc.document_photos || []).map(ph => (
                    <div key={ph.id} style={{ position: 'relative' }}>
                      <img
                        src={ph.data_url} alt={ph.label}
                        onClick={() => setPhotoView(ph.data_url)}
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.border}` }}
                      />
                      <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.label}</div>
                      <кнопка
                        onClick={() => handleDeleteDocPhoto(ph.id)}
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: 99, width: 26, height: 26, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Добавить фото */}
              <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>
                  {t('Добавить фото', 'Добавить фото', 'Добавить фото')}
                </div>
                <ввод
                  значение={docPhotoLabel}
                  onChange={e => setDocPhotoLabel(e.target.value)}
                  Placeholder={t('Этикетка (напр. Лицевая сторона)', 'Підпис (напр. Лицьова сторона)', 'Підпис (напр. Лицьова сторона)')}
                  style={{ ...inputStyle, marginBottom: 10, fontSize: 13 }}
                />



                {сохранение ? (
                  <div style={{ textAlign: 'center', padding: '14px 0', color: C.muted, fontSize: 13 }}>⏳ {t('Загрузка...', 'Завантаження...', 'Завантаження...')</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <кнопка
                      onClick={() => docCameraRef.current?.click()}
                      style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 24 }}>📷</span>
                      <span>{t('Камера', 'Камера', 'Камера')</span>
                    </button>
                    <кнопка
                      onClick={() => docPhotoRef.current?.click()}
                      style={{ background: '#eff6ff', color: C.blue, border: `1.5px solid #93c5fd`, borderRadius: 10, padding: '13px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 24 }}>🖼️</span>
                      <span>{t('Галерея', 'Галерея', 'Галерея')</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {confirmDel === selDoc.id && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 14, padding: 18, textAlign: 'center' }}>
              <div style={{ FontSize: 14, Color: '#991b1b', FontWeight: 700, MarginBottom: 14 }}>{t('Удалить этот документ?', 'Удалить этот документ?')</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px Solid ${C.border}`, borderRadius: 8, отступ: 10, курсор: 'pointer', FontSize: 13 }}>{t('Cancel', 'Скачать', 'Скачать')</button>
                <button onClick={() => handleDeleteDoc(selDoc.id)} style={{ flex: 1, фон: C.red, граница: 'none', borderRadius: 8, отступ: 10, курсор: 'pointer', цвет: '#fff', FontSize: 13, FontWeight: 700 }}>{t('Delete', 'Видалити', 'Видалити')</button>
              </div>
            </div>}
          </>)
        })()}

        {/* ══ ДОБАВИТЬ ДОКУМЕНТ ══ */}
        {tab === 'docs' && view === 'add' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ FontSize: 17, FontWeight: 700, Color: C.navy, MarginBottom: 20 }}>➕ {t('Новый документ', 'Новый документ', 'Новый документ')</div>
            <FField label={t('Категория', 'Категория', 'Категория')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => <button key={c.id} onClick={() => setDocForm(f => ({ ...f, category: c.id }))} style={{ background: docForm.category === c.id ? c.color : C.bg, color: docForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${docForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '10px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 20 }}>{c.icon}</span><span>{lang !== 'en' ? c.labelRu : c.label}</span></button>)}
              </div>
            </FField>
            <FField label={t('Title (EN)', 'Название (EN)')}><input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} placeholder="eg CSCS Green Card" style={inputStyle} /></FField>
            <FField label={t('Title (RU)', 'Название (RU)')}><input value={docForm.title_ru} onChange={e => setDocForm(f => ({ ...f, title_ru: e.target.value }))} placeholder="напр. Карта CSCS" style={inputStyle} /></FField>
            <FField label={t('Number / Code', 'Номер / Код', 'Номер / Код')}><input value={docForm.number} onChange={e => setDocForm(f => ({ ...f, number: e.target.value }))} placeholder="eg WZL F8D 7A4" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16 }} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('From', 'С')}><input type="date" value={docForm.valid_from} onChange={e => setDocForm(f => ({ ...f, valid_from: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Until', 'До')}><input type="date" value={docForm.valid_until} onChange={e => setDocForm(f => ({ ...f, valid_until: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes (EN)', 'Заметки (EN)')}><textarea value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, Notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <FField label={t('Notes (RU)', 'Заметки (RU)')}><textarea value={docForm.notes_ru} onChange={e => setDocForm(f => ({ ...f, notes_ru: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }} onClick={() => setDocForm(f => ({ ...f, pinned: !f.pinned }))}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: docForm.pinned ? C.blue : 'transparent', border: docForm.pinned ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>{docForm.pinned ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: C.textSub }}>📌 {t('Закрепить этот документ', 'Закрепить')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => switchTab('docs')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleAddDoc} disabled={!docForm.title || saving} style={{ flex: 2, background: docForm.title ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: docForm.title ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

        {/* ══ РЕДАКТИРОВАТЬ ДОКУМЕНТ ══ */}
        {tab === 'docs' && view === 'edit' && selDoc && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ FontSize: 17, FontWeight: 700, Color: C.navy, MarginBottom: 20 }}>✏️ {t('Редактировать документ', 'Редактировать документ', 'Редактировать документ')</div>
            <FField label={t('Категория', 'Категория', 'Категория')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => <button key={c.id} onClick={() => setDocForm(f => ({ ...f, category: c.id }))} style={{ background: docForm.category === c.id ? c.color : C.bg, color: docForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${docForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '10px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 20 }}>{c.icon}</span><span>{lang !== 'en' ? c.labelRu : c.label}</span></button>)}
              </div>
            </FField>
            <FField label={t('Title (EN)', 'Название (EN)')}><input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Title (RU)', 'Название (RU)')}><input value={docForm.title_ru} onChange={e => setDocForm(f => ({ ...f, title_ru: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Number / Code', 'Номер / Код', 'Номер / Код')}><input value={docForm.number} onChange={e => setDocForm(f => ({ ...f, number: e.target.value }))} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16 }} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('From', 'С')}><input type="date" value={docForm.valid_from} onChange={e => setDocForm(f => ({ ...f, valid_from: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Until', 'До')}><input type="date" value={docForm.valid_until} onChange={e => setDocForm(f => ({ ...f, valid_until: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes (EN)', 'Заметки (EN)')}><textarea value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, Notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <FField label={t('Notes (RU)', 'Заметки (RU)')}><textarea value={docForm.notes_ru} onChange={e => setDocForm(f => ({ ...f, notes_ru: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }} onClick={() => setDocForm(f => ({ ...f, pinned: !f.pinned }))}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: docForm.pinned ? C.blue : 'transparent', border: docForm.pinned ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>{docForm.pinned ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: C.textSub }}>📌 {t('Pinned', 'Закреплён')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('detail')} style={{ flex: 1, фон: C.bg, граница: `1.5px Solid ${C.border}`, borderRadius: 10, отступ: 14, FontSize: 14, курсор: 'указатель', цвет: C.textSub, FontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')</button>
              <button onClick={handleUpdateDoc} disabled={!docForm.title || saving} style={{ flex: 2, background: docForm.title ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: docForm.title ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save Changes', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

        {/* ══════════ Вкладка паспорта ══════════ */}
        {tab === 'passport' && view === 'list' && (
          <>
            {passports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                <div style={{ fontSize: 50, marginBottom: 12 }}>📘</div>
                <div style={{ FontSize: 15, FontWeight: 600, MarginBottom: 6 }}>{t('Паспорти не добавлены', 'Паспорти не додані', 'Паспорти не додані')</div>
                <div style={{ fontSize: 13, MarginBottom: 20 }}>{t('Добавить паспорт с фотографиями ключевых страниц', 'Добавь паспорт с фото страниц')</div>
              </div>
            ) : (
              passports.map(p => (
                <div key={p.id} onClick={() => { setSelPass(p); setView('passportDetail') }} style={{ background: C.surface, borderRadius: 14, marginBottom: 10, padding: '16px 18px', cursor: 'pointer', boxShadow: '0 1px 6px rgba(15,31,61,0.07)', borderLeft: '4px solid #0369a1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📘</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{p.type}</div>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', color: C.textSub, fontWeight: 600 }}>{p.number}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        {p.passport_photos.length} {t('photos', 'фото')}
                        {p.expiry_date && <> · <ExpiryBadge d={p.expiry_date} /></>}
                      </div>
                    </div>
                    <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => setView('addPassport')} style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, background: '#0369a1', color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 20px rgba(3,105,161,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </>
        )}

        {/* ══ ДОБАВИТЬ ПАСПОРТ ══ */}
        {tab === 'passport' && view === 'addPassport' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ FontSize: 17, FontWeight: 700, Color: C.navy, MarginBottom: 20 }}>📘 {t('Добавить паспорт', 'Добавить паспорт', 'Добавить паспорт')</div>
            <FField label={t('Type', 'Тип')}>
              <select value={passForm.type} onChange={e => setPassForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                {['Украинский паспорт', 'Украинское удостоверение личности', 'Карта BRP Великобритании', 'Паспорт Великобритании', 'Паспорт ЕС', 'Другое'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FField>
            <FField label={t('Number', 'Номер')}><input value={passForm.number} onChange={e => setPassForm(f => ({ ...f, number: e.target.value }))} placeholder="AA123456" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.06em' }} /></FField>
            <FField label={t('Выдано', 'Ким виданий', 'Ким виданий')}><input value={passForm.issued_by} onChange={e => setPassForm(f => ({ ...f, Issued_by: e.target.value }))} Placeholder={t('МВД', 'МВД Украины')} style={inputStyle} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('Issued', 'Дата видачі', 'Дата видачі')}><input type="date" value={passForm.issued_date} onChange={e => setPassForm(f => ({ ...f, Issued_date: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Expires', 'Срок действия', 'Срок действия')}><input type="date" value={passForm.expiry_date} onChange={e => setPassForm(f => ({ ...f, expiry_date: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes', 'Нотатки', 'Нотатки')}><textarea value={passForm.notes} onChange={e => setPassForm(f => ({ ...f, Notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => switchTab('passport')} style={{ flex: 1, background: C.bg, border: `1.5px Solid ${C.border}`, borderRadius: 10, отступ: 14, FontSize: 14, курсор: 'pointer', цвет: C.textSub, FontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')</button>
              <button onClick={handleAddPassport} disabled={!passForm.number || saving} style={{ flex: 2, background: passForm.number ? '#0369a1' : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: passForm.number ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

        {/* ══ ДАННЫЕ ПАСПОРТА ══ */}
        {tab === 'passport' && view === 'passportDetail' && selPass && (
          <>
            <button onClick={() => { setView('list'); setSelPass(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>← {t('Назад', 'Назад', 'Назад')}</button>
            <div style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)', borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📘</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{selPass.type}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: '0.1em', marginTop: 4, opacity: 0.9 }}>{selPass.number}</div>
            </div>
            <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '20px 22px', marginBottom: 12 }}>
              {selPass.issued_by && <DRow label={t('Выдано', 'Ким виданий', 'Ким виданий')}>{selPass.issued_by</DRow>}
              {selPass.issued_date && <DRow label={t('Issued', 'Дата видачі', 'Дата видачі')}>{formatDate(selPass.issued_date)</DRow>}
              {selPass.expiry_date && <DRow label={t('Expires', 'Срок')}><span>{formatDate(selPass.expiry_date)}</span><ExpiryBadge d={selPass.expiry_date} /></DRow>}
              <DRow label={t('Номер паспорта', 'Номер паспорта', 'Номер паспорта')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: C.navy }}>{selPass.number}</span>
                  <CopyBtn value={selPass.number} lang={lang} />
                <button onClick={() => setQrDoc({ title: selPass.type, number: selPass.number, member: selPass.member || '', valid_until: selPass.expiry_date, notes: selPass.notes })} style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1d4ed8' }}>
                  📱 QR
                </button>
                </div>
              </DRow>
            </div>

            {/* Фотографии */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
              <div style={{ FontSize: 14, FontWeight: 700, Color: C.navy, MarginBottom: 14 }}>📸 {t('Фотографии на документ', 'Фото магазин', 'Фото магазин')} ({selPass.passport_photos.length})</div>
              {selPass.passport_photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {selPass.passport_photos.map(ph => (
                    <div key={ph.id} style={{ position: 'relative' }}>
                      <img src={ph.data_url} alt={ph.label} onClick={() => setPhotoView(ph.data_url)} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.border}` }} />
                      <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, fontWeight: 600 }}>{ph.label}</div>
                      <button onClick={() => handleDeletePhoto(selPass.id, ph.id)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 99, width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
                <div style={{ FontSize: 12, FontWeight: 600, Color: C.textSub, MarginBottom: 8 }}>{t('Добавить фото страницы', 'Добавить фото стопки', 'Добавить фото стопки')</div>
                <input value={photoLabel} onChange={e => setPhotoLabel(e.target.value)} Placeholder={t('Label (eg Main page)', 'Подпись (напр. Главная страница)')} style={{ ...inputStyle, MarginBottom: 8, FontSize: 13 }} />


                {сохранение ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: C.muted, FontSize: 13 }}>⏳ {t('Загрузка...', 'Завантаження...', 'Завантаження...')</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={() => passCameraRef.current?.click()} style={{ background: '#0369a1', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 24 }}>📷</span>
                      <span>{t('Камера', 'Камера', 'Камера')</span>
                    </button>
                    <button onClick={() => passPhotoRef.current?.click()} style={{ background: '#e0f2fe', color: '#0369a1', border: '1.5px solid #7dd3fc', borderRadius: 10, padding: '13px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 24 }}>🖼️</span>
                      <span>{t('Галерея', 'Галерея', 'Галерея')</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setConfirmDel(selPass.id)} style={{ width: '100%', фон: '#fee2e2', граница: '1.5px Solid #fca5a5', borderRadius: 10, отступ: 12, FontSize: 13, FontWeight: 600, курсор: 'pointer', цвет: C.red }}>🗑 {t('Удалить паспорт', 'Вид паспорта', 'Вид паспорта')</button>
            {confirmDel === selPass.id && (
              <div style={{ background: '#fee2e2', borderRadius: 12, padding: 16, marginTop: 10, textAlign: 'center' }}>
                <div style={{ FontSize: 14, color: '#991b1b', FontWeight: 700, MarginBottom: 12 }}>{t('Удалить этот паспорт?', 'Удалить этот паспорт?')</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px Solid ${C.border}`, borderRadius: 8, отступ: 10, курсор: 'pointer', FontSize: 13 }}>{t('Cancel', 'Скачать', 'Скачать')</button>
                  <button onClick={() => handleDeletePassport(selPass.id)} style={{ flex: 1, фон: C.red, граница: 'none', borderRadius: 8, отступ: 10, курсор: 'pointer', цвет: '#fff', FontSize: 13, FontWeight: 700 }}>{t('Delete', 'Видалити', 'Видалити')</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ ВКЛАДКА ЗАДАЧ ══════════ */}
        {/* ══════════ Вкладка «Адресная книга» ══════════ */}
        {tab === 'address' && view === 'list' && (
          <>
            {/* Герой домашнего адреса */}
            {homeAddr ? (
              <div style={{ background: `linear-gradient(135deg, ${homeAddr.color}, ${homeAddr.color}cc)`, borderRadius: 20, padding: '22px 22px 18px', marginBottom: 14, color: '#fff', cursor: 'pointer' }}
                onClick={() => { setSelAddr(homeAddr); setView('detail') }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>🏠</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, LetterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0,7 }}>{t('Home Address', 'Адреса прописки', 'Адреса прописки')</div>
                    <div style={{ FontSize: 16, FontWeight: 700 }}>{lang !== 'en' && homeAddr.label_ru ? homeAddr.label_ru : homeAddr.label</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>
                  {homeAddr.line1}{homeAddr.line2 ? `, ${homeAddr.line2}` : ''}<br />
                  {[homeAddr.city, homeAddr.postcode].filter(Boolean).join(', ')}<br />
                  {homeAddr.country}
                </div>
                {/* Кнопки "Поделиться" */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={e => { e.stopPropagation(); shareAddress(homeAddr, 'whatsapp') }} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <span style={{ fontSize: 16 }}>💬</span> WhatsApp
                  </button>
                  <button onClick={e => { e.stopPropagation(); shareAddress(homeAddr, 'telegram') }} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <span style={{ fontSize: 16 }}>✈️</span> Telegram
                  </button>
                  <button onClick={e => { e.stopPropagation(); copyAddress(homeAddr) }} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ⎘ {t('Копировать', 'Скопировать', 'Скопировать')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.surface, borderRadius: 16, padding: '20px 18px', marginBottom: 14, border: `2px dashed ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏠</div>
                <div style={{ FontSize: 14, FontWeight: 600, Color: C.navy, MarginBottom: 4 }}>{t('Не задан домашний адрес', 'Адрес прописки не добавлен')</div>
                <div style={{ fontSize: 12, color: C.muted }}>{t('Добавьте адрес и пометьте его как домашний', 'Добавьте адрес и удалите его как главный')</div>
              </div>
            )}

            {/* Другие адреса */}
            {addresses.filter(a => !a.is_home).length > 0 && (
              <>
                <SLabel>📌 {t('Сохраненные адреса', 'Важные адреса', 'Важные адреса')</SLabel>
                {addresses.filter(a => !a.is_home).map(addr => (
                  <div key={addr.id} style={{ background: C.surface, borderRadius: 14, marginBottom: 8, padding: '14px 16px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,31,61,0.06)', borderLeft: `4px solid ${addr.color}` }}
                    onClick={() => { setSelAddr(addr); setView('detail') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: addr.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📍</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{lang !== 'en' && addr.label_ru ? addr.label_ru : addr.label}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[addr.line1, addr.city, addr.postcode].filter(Boolean).join(', ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={e => { e.stopPropagation(); shareAddress(addr, 'whatsapp') }} style={{ background: '#dcfce7', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 14 }}>💬</button>
                        <button onClick={e => { e.stopPropagation(); shareAddress(addr, 'telegram') }} style={{ background: '#dbeafe', border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 14 }}>✈️</button>
                      </div>
                      <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {addresses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
                <div style={{ fontSize: 14 }}>{t('Адресов пока нет', 'Немає адрес', 'Немає адрес')</div>
              </div>
            )}

            <button onClick={() => setView('add')} style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, background: '#2e7d32', color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 20px rgba(46,125,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </>
        )}

        {/* ══ АДРЕСНЫЕ ДАННЫЕ ══ */}
        {tab === 'address' && view === 'detail' && selAddr && (
          <>
            <button onClick={() => { setView('list'); setSelAddr(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>← {t('Назад', 'Назад', 'Назад')}</button>

            {/* Герой */}
            <div style={{ background: `linear-gradient(135deg, ${selAddr.color}, ${selAddr.color}bb)`, borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 32 }}>{selAddr.is_home ? '🏠' : '📍'}</span>
                <div>
                  {selAddr.is_home && <div style={{ fontSize: 10, fontWeight: 700, LetterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, MarginBottom: 2 }}>{t('Home Address', 'Адреса прописки', 'Адреса прописки')</div>}
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{lang !== 'en' && selAddr.label_ru ? selAddr.label_ru : selAddr.label}</div>
                </div>
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.95 }}>
                {selAddr.line1 && <div>{selAddr.line1}</div>}
                {selAddr.line2 && <div>{selAddr.line2}</div>}
                {(selAddr.city || selAddr.postcode) && <div>{[selAddr.city, selAddr.postcode].filter(Boolean).join(', ')}</div>}
                <div>{selAddr.country}</div>
              </div>
            </div>

            {/* Подробности */}
            <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '18px 22px', marginBottom: 12 }}>
              {selAddr.notes && <DRow label={t('Notes', 'Нотатки', 'Нотатки')}><span style={{ fontSize: 13, color: C.textSub }}>{selAddr.notes</span></DRow>}
              <DRow label={t('Полный адрес', 'Повна адрес', 'Повна адрес')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 13, color: C.textSub, flex: 1, lineHeight: 1.5 }}>
                    {[selAddr.line1, selAddr.line2, selAddr.city, selAddr.postcode, selAddr.country].filter(Boolean).join(', ')}
                  </span>
                  <CopyBtn value={[selAddr.line1, selAddr.line2, selAddr.city, selAddr.postcode, selAddr.country].filter(Boolean).join(', ')} lang={lang} />
                </div>
              </DRow>
            </div>

            {/* Делиться */}
            <div style={{ background: C.surface, borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
              <div style={{ FontSize: 13, FontWeight: 700, Color: C.navy, MarginBottom: 12 }}>📤 {t('Поделиться адресом', 'Поділитися адресою', 'Поділитися адресою')</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => shareAddress(selAddr, 'whatsapp')} style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 28 }}>💬</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>WhatsApp</span>
                </button>
                <button onClick={() => shareAddress(selAddr, 'telegram')} style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: '14px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 28 }}>✈️</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>Телеграм</span>
                </button>
              </div>
            </div>

            {/* Действия */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setAddrForm({ label: selAddr.label, label_ru: selAddr.label_ru, line1: selAddr.line1, line2: selAddr.line2, city: selAddr.city, postcode: selAddr.postcode, country: selAddr.country, notes: selAddr.notes, is_home: selAddr.is_home, color: selAddr.color }); setView('editAddress') }} style={{ flex: 1, background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1d4ed8' }}>
                ✏️ {t('Редактировать', 'Изменить', 'Изменить')}
              </button>
              {!selAddr.is_home && (
                <button onClick={() => handleSetHome(selAddr)} style={{ flex: 1, background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#854d0e' }}>
                  🏠 {t('Установить как домашний', 'Зробить головним', 'Зробить головним')}
                </button>
              )}
              <button onClick={() => setConfirmDel(selAddr.id)} style={{ flex: 1, background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.red }}>
                🗑 {t('Удалить', 'Видалити', 'Видалити')}
              </button>
            </div>

            {confirmDel === selAddr.id && (
              <div style={{ background: '#fee2e2', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                <div style={{ FontSize: 14, Color: '#991b1b', FontWeight: 700, MarginBottom: 14 }}>{t('Удалить этот адрес?', 'Удалить этот адрес?')</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px Solid ${C.border}`, borderRadius: 8, отступ: 10, курсор: 'pointer', FontSize: 13 }}>{t('Cancel', 'Скачать', 'Скачать')</button>
                  <button onClick={() => handleDeleteAddress(selAddr.id)} style={{ flex: 1, background: C.red, border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>{t('Delete', 'Видалити', 'Видалити')}</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ ДОБАВИТЬ АДРЕС ══ */}
        {tab === 'address' && view === 'add' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ FontSize: 17, FontWeight: 700, Color: C.navy, MarginBottom: 20 }}>📍 {t('Новый адрес', 'Новый адрес')</div>

            {/* Выбор цвета */}
            <FField label={t('Цвет', 'Колір', 'Колір')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ADDR_COLORS.map(col => (
                  <button key={col} onClick={() => setAddrForm(f => ({ ...f, color: col }))} style={{ width: 36, height: 36, borderRadius: 8, background: col, border: addrForm.color === col ? '3px solid #1a202c' : '2px solid transparent', cursor: 'pointer', boxShadow: addrForm.color === col ? '0 0 0 2px #fff inset' : 'none' }} />
                ))}
              </div>
            </FField>

            <FField label={t('Label (EN)', 'Название (EN)')}><input value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} placeholder="eg Oxford Home, GP Surgery" style={inputStyle} /></FField>
            <FField label={t('Label (RU)', 'Название (RU)')}><input value={addrForm.label_ru} onChange={e => setAddrForm(f => ({ ...f, label_ru: e.target.value }))} Placeholder="напр. Дом в Оксфорде, Врач" style={inputStyle} /></FField>
            <FField label={t('Address line 1', 'Адрес строка 1')}><input value={addrForm.line1} onChange={e => setAddrForm(f => ({ ...f, line1: e.target.value }))} placeholder="eg 12 Rose Street" style={inputStyle} /></FField>
            <FField label={t('Адресная строка 2')}><input value={addrForm.line2} onChange={e => setAddrForm(f => ({ ...f, line2: e.target.value }))} Placeholder={t('Ровная, площадь (необязательно)', 'Квартира, район (необязательно)')} style={inputStyle} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('City', 'Місто', 'Місто')}><input value={addrForm.city} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} placeholder="Oxford" style={inputStyle} /></FField>
              <FField label={t('Почтовый индекс', 'Почтовый индекс')}><input value={addrForm.postcode} onChange={e => setAddrForm(f => ({ ...f, postcode: e.target.value }))} placeholder="OX1 1AB" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }} /></FField>
            </div>
            <FField label={t('Country', 'Країна', 'Країна')}><input value={addrForm.country} onChange={e => setAddrForm(f => ({ ...f, country: e.target.value }))} placeholder="United Kingdom" style={inputStyle} /></FField>
            <FField label={t('Notes', 'Нотатки', 'Нотатки')}><textarea value={addrForm.notes} onChange={e => setAddrForm(f => ({ ...f, Notes: e.target.value }))} rows={2} Placeholder={t('например, возле автобусной остановки, звонок 2', '. около остановки, звонок 2')} style={{ ...inputStyle, resize: 'vertical' }} /></FField>

            {/* Переключатель "Домой" */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: addrForm.is_home ? '#fef9c3' : C.bg, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: `1.5px solid ${addrForm.is_home ? '#fde047' : C.border}` }}
              onClick={() => setAddrForm(f => ({ ...f, is_home: !f.is_home }))}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: addrForm.is_home ? '#f59e0b' : 'transparent', border: addrForm.is_home ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{addrForm.is_home ? '✓' : ''}</div>
              <div>
                <div style={{ FontSize: 14, FontWeight: 600, цвет: addrForm.is_home? '#854d0e' : C.text }}>🏠 {t('Установить как домашний адрес', 'Сделать адресом прописки')</div>
                <div style={{ fontSize: 12, color: C.muted }}>{t('Ваш основной зарегистрированный адрес в Великобритании', 'Главный зарегистрированный адрес в Великобритании')</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => switchTab('address')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleAddAddress} disabled={!addrForm.label || !addrForm.line1 || saving} style={{ flex: 2, background: addrForm.label && addrForm.line1 ? '#2e7d32' : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: addrForm.label && addrForm.line1 ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>
                {сохранение? '⏳' : t('Сохранить адрес', 'Сохранить адрес')}
              </button>
            </div>
          </div>
        )}

        {/* ══ АДРЕС РЕДАКТИРОВАНИЯ ══ */}
        {tab === 'address' && view === 'editAddress' && selAddr && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ FontSize: 17, FontWeight: 700, Color: C.navy, MarginBottom: 20 }}>✏️ {t('Редактировать адрес', 'Редактировать адрес', 'Редактировать адрес')</div>
            <FField label={t('Цвет', 'Колір', 'Колір')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ADDR_COLORS.map(col => (
                  <button key={col} onClick={() => setAddrForm(f => ({ ...f, color: col }))} style={{ width: 36, height: 36, borderRadius: 8, background: col, border: addrForm.color === col ? '3px solid #1a202c' : '2px solid transparent', cursor: 'pointer', boxShadow: addrForm.color === col ? '0 0 0 2px #fff inset' : 'none' }} />
                ))}
              </div>
            </FField>
            <FField label={t('Label (EN)', 'Название (EN)')}><input value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Label (RU)', 'Название (RU)')}><input value={addrForm.label_ru} onChange={e => setAddrForm(f => ({ ...f, label_ru: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Address line 1', 'Адрес строка 1')}><input value={addrForm.line1} onChange={e => setAddrForm(f => ({ ...f, line1: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Address line 2', 'Адрес строка 2')}><input value={addrForm.line2} onChange={e => setAddrForm(f => ({ ...f, line2: e.target.value }))} style={inputStyle} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('City', 'Місто', 'Місто')}><input value={addrForm.city} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Почтовый индекс', 'Индекс')}><input value={addrForm.postcode} onChange={e => setAddrForm(f => ({ ...f, postcode: e.target.value }))} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }} /></FField>
            </div>
            <FField label={t('Country', 'Країна', 'Країна')}><input value={addrForm.country} onChange={e => setAddrForm(f => ({ ...f, Country: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Notes', 'Нотатки', 'Нотатки')}><textarea value={addrForm.notes} onChange={e => setAddrForm(f => ({ ...f, Notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: addrForm.is_home ? '#fef9c3' : C.bg, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: `1.5px solid ${addrForm.is_home ? '#fde047' : C.border}` }}
              onClick={() => setAddrForm(f => ({ ...f, is_home: !f.is_home }))}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: addrForm.is_home ? '#f59e0b' : 'transparent', border: addrForm.is_home ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{addrForm.is_home ? '✓' : ''}</div>
              <div>
                <div style={{ FontSize: 14, FontWeight: 600, цвет: addrForm.is_home? '#854d0e' : C.text }}>🏠 {t('Домашний адрес', 'Адреса прописки', 'Адреса прописки')</div>
                <div style={{ fontSize: 12, color: C.muted }}>{t('Ваш основной зарегистрированный адрес', 'Главный зарегистрированный адрес')</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('detail')} style={{ flex: 1, фон: C.bg, граница: `1.5px Solid ${C.border}`, borderRadius: 10, отступ: 14, FontSize: 14, курсор: 'указатель', цвет: C.textSub, FontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')</button>
              <button onClick={handleUpdateAddress} disabled={saving} style={{ flex: 2, background: saving ? '#94a3b8' : '#2e7d32', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: '#fff', fontWeight: 700 }}>
                {сохранение? '⏳' : t('Сохранить изменения', 'Сохранить изменения')}
              </button>
            </div>
          </div>
        )}


        {/* ══════════════════ ВКЛАДКА ВОЗОБНОВИТЬ ═══════════════════ */}
        {tab === 'resume' && view === 'list' && (
          <>
            {resumes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: C.muted }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>📝</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
                  {t('Резюме пока нет', 'Еще немає резюме', 'Еще немає резюме')}
                </div>
                <div style={{ fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                  {t('Сохраните несколько резюме для разных должностей и компаний', 'Сохраните резюме для различных должностей и компаний', 'Сохраните резюме для различных должностей и компаний')}
                </div>
              </div>
            ) : (
              <>
                {/* Панель статистики */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: t('Total', 'Всого', 'Всого'), val: summary.length, color: C.navy },
                    { label: t('Готово', 'Готові', 'Готові'), val: summary.filter(r=>r.status==='ready').length, color: '#2e7d32' },
                    { label: t('Отправлено', 'Надіслані', 'Надіслані'), val: summary.filter(r=>r.status==='sent'||r.status==='interview').length, color: '#1d4ed8' },
                  ].map((s,i) => (
                    <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {resumes.filter(r=>r.pinned).length > 0 && (
                  <SLabel>📌 {t('Закреплено', 'Закріплені', 'Закріплені')</SLabel>
                )}
                {[...resumes.filter(r=>r.pinned), ...resumes.filter(r=>!r.pinned)].map(r => {
                  const st = resumeStatus(r.status)
                  возвращаться (
                    <div key={r.id} onClick={() => { setSelResume(r); setView('resumeDetail') }}
                      style={{ background: C.surface, borderRadius: 14, marginBottom: 10, padding: '14px 16px',
                        cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${r.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: r.color + '18',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                          📝
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                            {r.pinned && <span style={{ fontSize: 11 }}>📌</span>}
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{r.title}</span>
                            <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                              {язык === 'Великобритания' ? st.uk: lang === 'ru'? st.ru : st.en}
                            </span>
                          </div>
                          {r.direction && <div style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>🎯 {r.direction}</div>}
                          {r.company && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>🏢 {r.company}</div>}
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'flex', gap: 10 }}>
                            <span>{t('Обновлено', 'Оновлено', 'Оновлено')} {formatDate(r.updated_at)</span>
                            {((r).resume_files?.length || 0) > 0 && (
                              <span>📎 {(r).resume_files.length}</span>
                            )}
                          </div>
                        </div>
                        <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
            <button onClick={() => { setResumeForm(EMPTY_RESUME); setView('addResume') }}
              style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28,
                background: '#1a4480', color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(26,68,128,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </>
        )}

        {/* ══ ПОДРОБНОСТИ РЕЗЮМЕ ══ */}
        {tab === 'resume' && view === 'resumeDetail' && selResume && (() => {
          const st = resumeStatus(selResume.status)
          возвращаться (
            <>
              <button onClick={() => { setView('list'); setSelResume(null) }}
                style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>
                ← {t('Назад', 'Назад', 'Назад')}
              </button>

              {/* Герой */}
              <div style={{ background: `linear-gradient(135deg, ${selResume.color}, ${selResume.color}cc)`,
                borderRadius: 20, padding: '24px 22px 20px', marginBottom: 3, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{selResume.title}</div>
                    {selResume.direction && <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 3 }}>🎯 {selResume.direction}</div>}
                    {selResume.company && <div style={{ fontSize: 13, opacity: 0.7 }}>🏢 {selResume.company}</div>}
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 20, flexShrink: 0, marginLeft: 10 }}>
                    {язык === 'Великобритания' ? st.uk: lang === 'ru'? st.ru : st.en}
                  </span>
                </div>
              </div>

              {/* Содержание */}
              <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '20px 22px', marginBottom: 12 }}>
                {selResume.summary && (
                  <DRow label={t('Обо мне', 'Про меня', 'Про меня')}>
                    <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selResume.summary}</span>
                  </DRow>
                )}
                {selResume.skills && (
                  <DRow label={t('Ключевые навыки', 'Ключевые навыки', 'Ключевые навыки')}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selResume.skills.split(/[,;\n]+/).filter(Boolean).map((sk, i) => (
                        <span key={i} style={{ background: selResume.color + '18', color: selResume.color,
                          fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>
                          {sk.trim()}
                        </span>
                      ))}
                    </div>
                  </DRow>
                )}
                {selResume.experience && (
                  <DRow label={t('Опыт', 'Доступ роботы', 'Доступ роботы')}>
                    <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{selResume.experience}</span>
                  </DRow>
                )}
                {selResume.education && (
                  <DRow label={t('Образование', 'Освіта', 'Освіта')}>
                    <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selResume.education}</span>
                  </DRow>
                )}
                {selResume.notes && (
                  <DRow label={t('Заметки', 'Ноттки', 'Ноттки')}>
                    <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>{selResume.notes}</span>
                  </DRow>
                )}
              </div>

              {/* Кнопки действий */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button onClick={() => {
                  setResumeForm({ title: selResume.title, direction: selResume.direction, company: selResume.company,
                    статус: selResume.status, краткое описание: selResume.summary, навыки: selResume.skills,
                    опыт: selResume.experience, образование: selResume.education, примечания: selResume.notes,
                    color: selResume.color, pinned: selResume.pinned })
                  setView('editResume')
                }} style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12,
                  padding: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#1d4ed8' }}>
                  ✏️ {t('Редактировать', 'Редактировать', 'Редактировать')}
                </button>
                <button onClick={() => {
                  copyResumeToClipboard(selResume)
                  setCvCopied(true)
                  setTimeout(() => setCvCopied(false), 2000)
                }} style={{ background: cvCopied ? '#f0fdf4' : C.bg,
                  border: `1.5px solid ${cvCopied ? '#86efac' : C.border}`,
                  borderRadius: 12, padding: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  color: cvCopied ? '#166534' : C.textSub }}>
                  {cvСкопировано? '✓ Скопировано!' : `⎘ ${t('Копировать резюме', 'Копировать резюме', 'Копировать резюме')}`}
                </button>
              </div>


              {/* ── ПРИКРЕПЛЕННЫЕ ФАЙЛЫ ── */}
              <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📎 {t('Прикрепленные файлы', 'Прикрепленные файлы', 'Прикрепленные файлы')} <span style={{ background: C.bg, borderRadius: 20, отступ: '2px 8px', FontSize: 12, цвет: C.muted, FontWeight: 600 }}>{((selResume).resume_files || []).length</span></span>
                </div>

                {/* Список файлов */}
                {((selResume).resume_files || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {((selResume).resume_files || []).map((rf: any) => (
                      <div key={rf.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: C.bg, borderRadius: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 28, flexShrink: 0 }}>{fileIcon(rf.mime_type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rf.name}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{formatFileSize(rf.size_bytes)} · {formatDate(rf.added_at)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => downloadResumeFile(rf)} style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>
                            ⬇️
                          </button>
                          <button onClick={() => handleDeleteResumeFile(rf.id)} style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 13, color: C.red }}>
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Кнопка загрузки */}
                {fileUploading ? (
                  <div style={{ textAlign: 'center', padding: '14px 0', color: C.muted, fontSize: 13 }}>⏳ {t('Загрузка...', 'Завантаження...', 'Завантаження...')</div>
                ) : (
                  <button onClick={() => resumeFileRef.current?.click()} style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    📎 {t('Прикрепить файл (PDF, Word и т. д.)', 'Прикрепить файл (PDF, Word…)', 'Прикрепить файл (PDF, Word…)')}
                  </button>
                )}
                <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>
                  {t('Макс 5МБ · PDF, DOCX, DOC, TXT', 'Макс 5МБ · PDF, DOCX, DOC, TXT', 'Макс 5МБ · PDF, DOCX, DOC, TXT')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <button onClick={() => handleToggleResumePin(selResume)} style={{
                  background: selResume.pinned ? '#fef9c3' : C.surface,
                  border: `1.5px solid ${selResume.pinned ? '#fde047' : C.border}`,
                  borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: selResume.pinned ? '#854d0e' : C.textSub }}>
                  📌 {selResume.pinned ? t('Открепить','Відкріпити','Відкріпити') : t('Закрепить','Закріпити','Закріпити')}
                </button>
                <button onClick={() => setConfirmDel(selResume.id)}
                  style={{ background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 12, padding: 12,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.red }}>
                  🗑 {t('Удалить', 'Видалити', 'Видалити')}
                </button>
              </div>

              {confirmDel === selResume.id && (
                <div style={{ background: '#fee2e2', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, marginBottom: 14 }}>
                    {t('Удалить это резюме?', 'Просмотреть это резюме?', 'Просмотреть это резюме?')}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px Solid ${C.border}`, borderRadius: 8, отступ: 10, курсор: 'pointer', FontSize: 13 }}>{t('Cancel', 'Скачать', 'Скачать')</button>
                    <button onClick={() => handleDeleteResume(selResume.id)} style={{ flex: 1, background: C.red, border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>{t('Delete', 'Видалити', 'Видалити')}</button>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* ══ ДОБАВИТЬ / ИЗМЕНИТЬ ФОРМУ РЕЗЮМЕ ══ */}
        {tab === 'resume' && (view === 'addResume' || view === 'editResume') && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>
              {view === 'addResume' ? `📝 ${t('New CV', 'Нове CV', 'Нове CV')}` : `✏️ ${t('Edit CV', 'Редагувати CV', 'Редагувати CV')}`}
            </div>

            {/* Color picker */}
            <FField label={t('Colour', 'Колір', 'Колір')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {RESUME_COLORS.map(col => (
                  <button key={col} onClick={() => setResumeForm(f => ({ ...f, color: col }))}
                    style={{ width: 34, height: 34, borderRadius: 8, background: col, cursor: 'pointer',
                      border: resumeForm.color === col ? '3px solid #1a202c' : '2px solid transparent',
                      boxShadow: resumeForm.color === col ? '0 0 0 2px #fff inset' : 'none' }} />
                ))}
              </div>
            </FField>

            <FField label={t('CV Title', 'Назва CV', 'Назва CV')}>
              <input value={resumeForm.title} onChange={e => setResumeForm(f=>({...f,title:e.target.value}))}
                placeholder={t('e.g. HVAC Engineer — Large Companies', 'напр. HVAC Інженер — Великі компанії', 'напр. HVAC Інженер — Великі компанії')}
                style={inputStyle} />
            </FField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('Target Role', 'Бажана посада', 'Бажана посада')}>
                <input value={resumeForm.direction} onChange={e => setResumeForm(f=>({...f,direction:e.target.value}))}
                  placeholder="HVAC Engineer" style={inputStyle} />
              </FField>
              <FField label={t('Company', 'Компанія', 'Компанія')}>
                <input value={resumeForm.company} onChange={e => setResumeForm(f=>({...f,company:e.target.value}))}
                  placeholder={t('Optional', "Необов'язково", "Необов'язково")} style={inputStyle} />
              </FField>
            </div>

            <FField label={t('Status', 'Статус', 'Статус')}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RESUME_STATUSES.map(s => (
                  <button key={s.id} onClick={() => setResumeForm(f=>({...f,status:s.id['status']}))}
                    style={{ background: resumeForm.status===s.id ? s.color : C.bg,
                      color: resumeForm.status===s.id ? '#fff' : C.textSub,
                      border: `1.5px solid ${resumeForm.status===s.id ? s.color : C.border}`,
                      borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {язык === 'Великобритания' ? s.uk: lang === 'ru'? s.ru : s.en}
                  </button>
                ))}
              </div>
            </FField>

            <FField label={t('О себе / Резюме', 'Про меня / Резюме', 'Про меня / Резюме')}>
              <textarea value={resumeForm.summary} onChange={e => setResumeForm(f=>({...f,summary:e.target.value}))}
                rows={4} Placeholder={t('Краткое профессиональное описание…', 'Короткий профессиональный опис…', 'Короткий профессиональный опис…')}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </FField>

            <FField label={t('Ключевые навыки (через запятую)', 'Ключевые навички (через кого)', 'Ключевые навички (через кого)')}>
              <textarea value={resumeForm.skills} onChange={e => setResumeForm(f=>({...f,skills:e.target.value}))}
                rows={3} placeholder="Сертифицировано по F-газу, зеленая карта CSCS, установка систем отопления, вентиляции и кондиционирования, кондиционирование воздуха…"
                style={{ ...inputStyle, resize: 'vertical' }} />
            </FField>

            <FField label={t('Опыт работы', 'Доступ к работе', 'Доступ к работе')}>
              <textarea value={resumeForm.experience} onChange={e => setResumeForm(f=>({...f,experience:e.target.value}))}
                rows={6} Placeholder={t('Должность — Компания — Даты\nОсновные достижения…', 'Посада — Компанія — Дати\nОсновні досягнення…', 'Посада — Компанія — Дати\nОсновні досягнення…')}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </FField>

            <FField label={t('Образование и квалификация', 'Освещение и квалификация', 'Освещение и квалификация')}>
              <textarea value={resumeForm.education} onChange={e => setResumeForm(f=>({...f,education:e.target.value}))}
                rows={4} Placeholder={t('Степень / Сертификат — Вуз — Год…', 'Ступінь / Серт — Заклад — Рік…', 'Ступінь / Серт — Заклад — Рік…')}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </FField>

            <FField label={t('Заметки (частные)', 'Ноты (частные)', 'Ноты (частные)')}>
              <textarea value={resumeForm.notes} onChange={e => setResumeForm(f=>({...f,notes:e.target.value}))}
                rows={2} Placeholder={t('Личные заметки об этой заявке…', 'Особые ноты о вашей заявке…', 'Особые ноты о вашей заявке…')}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </FField>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer',
              background: resumeForm.pinned ? '#fef9c3' : C.bg, borderRadius: 10, padding: '12px 14px',
              border: `1.5px solid ${resumeForm.pinned ? '#fde047' : C.border}` }}
              onClick={() => setResumeForm(f=>({...f,pinned:!f.pinned}))}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: resumeForm.pinned ? '#f59e0b' : 'transparent',
                border: resumeForm.pinned ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0 }}>
                {resumeForm.pinned ? '✓' : ''}
              </div>
              <span style={{ fontSize: 13, color: resumeForm.pinned ? '#854d0e' : C.textSub, fontWeight: 600 }}>
                📌 {t('Закрепить это резюме', 'Закрепить это резюме', 'Закрепить это резюме')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => view === 'addResume' ? switchTab('resume') : setView('resumeDetail')}
                style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10,
                  padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>
                {t('Отмена', 'Скачать', 'Скачать')}
              </button>
              <button onClick={view === 'addResume' ? handleAddResume : handleUpdateResume}
                disabled={!resumeForm.title || saving}
                style={{ flex: 2, background: resumeForm.title ? '#1a4480' : '#cbd5e0', border: 'none',
                  borderRadius: 10, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                {сохранение? '⏳': просмотр === 'addResume'? t('Сохранить резюме', 'Зберегти резюме', 'Зберегти резюме') : t('Сохранить изменения', 'Зберегти', 'Зберегти')}
              </button>
            </div>
          </div>
        )}

        {tab === 'todo' && view === 'list' && (
          <>
            {/* Индикатор выполнения */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ dis play: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, цвет: C.navy }}>{t('Progress', 'Progres', 'Progres')</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{todoDone}/{todos.length}</span>
              </div>
              <div style={{ background: C.bg, borderRadius: 99, height: 10, overflow: 'hidden' }}>
                <div style={{ background: `linear-gradient(90deg, ${C.accent}, #22c55e)`, height: '100%', borderRadius: 99, width: `${todos.length ? (todoDone / todos.length * 100) : 0}%`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 12, color: C.muted, MarginTop: 6 }}>{todos.length - todoDone} {t('remaining', 'залишилось', 'залишилось')</div>
            </div>

            {Array.from(new Set(todos.map(t => t.week))).sort((a, b) => a - b).map(w => {
              const wL = {
                0: { en: '📅 Дни 1–2 · Прибытие', ru: '📅 Дни 1–2 · Прибытие' },
                1: { en: '📅 Дни 3–5 · Критические шаги', ru: '📅 Дни 3–5 · Критически важные шаги' },
                2: { en: '📅 Неделя 2 · Жилье и школа', ru: '📅 Неделя 2 · Жилье и школа' },
                3: { en: '📅 Неделя 3 · Пособия и финансы', ru: '📅 Неделя 3 · Пособия и финансы' },
                4: { en: '📅 Неделя 3–4 · Работа', ru: '📅 Неделя 3–4 · Работа' },
                5: { en: '📅 Неделя 4–5 · Инфраструктура', ru: '📅 Неделя 4–5 · Обустройство' },
                6: { en: '📅 Неделя 6 · Итоговый контрольный список', ru: '📅 Неделя 6 · Итоговая проверка' },
                7: { en: '📅 Позже', ru: '📅 Позже' },
              }
              const items = todos.filter(t => t.week === w)
              const doneH = items.filter(t => t.done).length
              возвращаться (
                <div key={w} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.blue }}>
                      {язык !== 'эн' ? wL[w]?.ru : wL[w]?.en}
                    </div>
                    <span style={{ fontSize: 11, color: C.muted }}>{doneH}/{items.length}</span>
                  </div>
                  <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden' }}>
                    {items.map((item, i) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none', background: item.done ? '#f0fdf4' : C.surface }}>
                        {/* Флажок */}
                        <div onClick={() => handleToggleTodo(item)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: item.done ? '#22c55e' : 'transparent', border: item.done ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                          {item.done ? '✓' : ''}
                        </div>
                        {/* Текст */}
                        <div onClick={() => handleToggleTodo(item)} style={{ flex: 1, fontSize: 13, color: item.done ? '#4ade80' : C.text, textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.4, cursor: 'pointer' }}>
                          {язык !== 'эн' ? item.textRu || элемент.текст: элемент.текст}
                        </div>
                        <span style={{ fontSize: 14 }}>{CATEGORIES.find(c => c.id === item.category)?.icon || '📁'}</span>
                        {/* Кнопка редактирования */}
                        <button onClick={() => { setSelTodo(item); setTodoForm({ text: item.text, textRu: item.textRu, category: item.category, week: item.week }); setView('editTodo') }}
                          style={{ background: '#eff6ff', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: C.blue, flexShrink: 0 }}>
                          ✏️
                        </button>
                        {/* Кнопка удаления */}
                        <button onClick={() => { setConfirmDel(item.id) }}
                          style={{ background: '#fee2e2', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: C.red, flexShrink: 0 }}>
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Встроенное подтверждение удаления для списка дел */}
                  {items.some(i => i.id === confirmDel) && (
                    <div style={{ background: '#fee2e2', borderRadius: 10, padding: '12px 14px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, FontSize: 13, цвет: '#991b1b', FontWeight: 600 }}>{t('Удалить эту задачу?', 'Выдать это задание?', 'Выдать это задание?')</span>
                      <button onClick={() => setConfirmDel(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>{t('No', 'Нет')}</button>
                      <button onClick={() => { const id = confirmDel!; handleDeleteTodo(id) }} style={{ background: C.red, border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}>{t('Да', 'Да')}</button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Действия снизу */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={handleResetTodos} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.textSub }}>
                🔄 {t('Сбросить все', 'Скинути', 'Скинути')}
              </button>
              <button onClick={() => { setTodoForm({ text: '', textRu: '', category: 'other', week: 1 }); setView('addTodo') }} style={{ flex: 2, background: C.blue, border: 'none', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                + {t('Добавить пользовательскую задачу', 'Добавить задание', 'Добавить задание')}
              </button>
            </div>
          </>
        )}

        {/* ══ ДОБАВИТЬ TODO ══ */}
        {tab === 'todo' && view === 'addTodo' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ FontSize: 17, FontWeight: 700, Color: C.navy, MarginBottom: 20 }}>➕ {t('Новая задача', 'Нове завдання')</div>
            <FField label={t('Task (EN)', 'Задача (EN)')}><input value={todoForm.text} onChange={e => setTodoForm(f => ({ ...f, text: e.target.value }))} placeholder="eg Book GP appointment" style={inputStyle} /></FField>
            <FField label={t('Task (RU)', 'Задача (RU)')}><input value={todoForm.textRu} onChange={e => setTodoForm(f => ({ ...f, textRu: e.target.value }))} Placeholder="напр. Записаться к врачу" style={inputStyle} /></FField>
            <FField label={t('Неделя', 'Тиждень', 'Тиждень')}>
              <select value={todoForm.week} onChange={e => setTodoForm(f => ({ ...f, week: Number(e.target.value) }))} style={inputStyle}>
                <option value={0}>{t('Дни прибытия 1-2', 'Дни 1-2 Прибытия')</option>
                <option value={1}>{t('Дни 3–5 критических шагов', 'Дни 3–5 критически важных')</option>
                <option value={2}>{t('Неделя 2 Жилищная школа', 'Неделя 2 Жилье и школа')</option>
                <option value={3}>{t('Week 3 Benefits', 'Неделя 3 Пособия и финансы')}</option>
                <option value={4}>{t('Week 3-4 Work', 'Неделя 3-4 Работа')}</option>
                <option value={5}>{t('Week 4-5 Infrastructure', 'Неделя 4-5 Обустройство')}</option>
                <option value={6}>{t('Week 6 Final', 'Неделя 6 Итоговая проверка')}</option>
                <option value={7}>{t('Later', 'Позже')}</option>
              </select>
            </FField>
            <FField label={t('Category', 'Категорія', 'Категорія')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setTodoForm(f => ({ ...f, category: c.id }))} style={{ background: todoForm.category === c.id ? c.color : C.bg, color: todoForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${todoForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '8px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <span>{lang !== 'en' ? c.labelRu : c.label}</span>
                  </button>
                ))}
              </div>
            </FField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('list')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleAddTodo} disabled={!todoForm.text} style={{ flex: 2, background: todoForm.text ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: todoForm.text ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{t('Add Task', 'Додати завдання', 'Додати завдання')}</button>
            </div>
          </div>
        )}

        {/* ══ EDIT TODO ══ */}
        {tab === 'todo' && view === 'editTodo' && selTodo && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>✏️ {t('Edit Task', 'Редагувати завдання', 'Редагувати завдання')}</div>
            <FField label={t('Task (EN)', 'Задача (EN)')}><input value={todoForm.text} onChange={e => setTodoForm(f => ({ ...f, text: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Task (RU)', 'Задача (RU)')}><input value={todoForm.textRu} onChange={e => setTodoForm(f => ({ ...f, textRu: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Week', 'Тиждень', 'Тиждень')}>
              <select value={todoForm.week} onChange={e => setTodoForm(f => ({ ...f, week: Number(e.target.value) }))} style={inputStyle}>
                <option value={0}>{t('Days 1-2 Arrival', 'Дни 1-2 Прибытие')}</option>
                <option value={1}>{t('Days 3-5 Critical Steps', 'Дни 3-5 Критически важные')}</option>
                <option value={2}>{t('Week 2 Housing School', 'Неделя 2 Жильё и школа')}</option>
                <option value={3}>{t('Week 3 Benefits', 'Неделя 3 Пособия и финансы')}</option>
                <option value={4}>{t('Week 3-4 Work', 'Неделя 3-4 Работа')}</option>
                <option value={5}>{t('Week 4-5 Infrastructure', 'Неделя 4-5 Обустройство')}</option>
                <option value={6}>{t('Week 6 Final', 'Неделя 6 Итоговая проверка')}</option>
                <option value={7}>{t('Later', 'Позже')}</option>
              </select>
            </FField>
            <FField label={t('Category', 'Категорія', 'Категорія')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setTodoForm(f => ({ ...f, category: c.id }))} style={{ background: todoForm.category === c.id ? c.color : C.bg, color: todoForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${todoForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '8px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <span>{lang !== 'en' ? c.labelRu : c.label}</span>
                  </button>
                ))}
              </div>
            </FField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setSelTodo(null); setView('list') }} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleUpdateTodo} disabled={!todoForm.text} style={{ flex: 2, background: todoForm.text ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: todoForm.text ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{t('Save Changes', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

        {/* ══════════ PROFILE TAB ══════════ */}

        {/* ══════════════ MEDICAL / HEALTH TAB ══════════════ */}
        {tab === 'medical' && (
          <>
            {/* Emergency contacts */}
            <SLabel>🆘 {t('Emergency Contacts', 'Екстрені контакти', 'Екстрені контакти')}</SLabel>

            {contacts.length === 0 ? (
              <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 12, padding: '16px 18px', marginBottom: 14, textAlign: 'center', color: D.muted, fontSize: 13 }}>
                {t('No contacts added yet', 'Контактів ще немає', 'Контактів ще немає')}
              </div>
            ) : (
              contacts.map(c => (
                <div key={c.id} style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 12, marginBottom: 8, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.is_primary ? '#c62828' : '#546e7a'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{c.is_primary ? '⭐' : '👤'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.navy }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: D.muted }}>{c.relation}</div>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', color: D.blue, fontWeight: 600 }}>{c.phone}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={`tel:${c.phone}`} style={{ background: '#dcfce7', border: 'none', borderRadius: 10, padding: '10px 14px', color: '#166534', fontSize: 18, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>📞</a>
                      <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" style={{ background: '#dcfce7', border: 'none', borderRadius: 10, padding: '10px 14px', color: '#166534', fontSize: 18, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>💬</a>
                      <button onClick={() => handleDeleteContact(c.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: D.red, fontSize: 15 }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Добавить контактную форму */}
            <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ FontSize: 13, FontWeight: 700, Color: D.navy, MarginBottom: 12 }}>+ {t('Добавить контакт', 'Добавить контакт', 'Добавить контакт')</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><input value={contactForm.name} onChange={e=>setContactForm(f=>({...f,name:e.target.value}))} placeholder={t('Name','Імʼя','Імʼя')} style={{...inputStyle, background: D.bg, color: D.text, border: `1.5px solid ${D.border}`}} /></div>
                <div><input value={contactForm.relation} onChange={e=>setContactForm(f=>({...f,relation:e.target.value}))} placeholder={t('Relation','Хто це','Хто це')} style={{...inputStyle, background: D.bg, color: D.text, border: `1.5px solid ${D.border}`}} /></div>
              </div>
              <input value={contactForm.phone} onChange={e=>setContactForm(f=>({...f,phone:e.target.value}))} placeholder="+44 7700 900000" type="tel" style={{...inputStyle, marginBottom: 10, fontFamily: 'monospace', fontSize: 16, background: D.bg, color: D.text, border: `1.5px solid ${D.border}`}} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }} onClick={() => setContactForm(f=>({...f,is_primary:!f.is_primary}))}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: contactForm.is_primary ? '#c62828' : 'transparent', border: `2px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>{contactForm.is_primary ? '✓' : ''}</div>
                <span style={{ fontSize: 13, color: D.textSub }}>⭐ {t('Основной/Чрезвычайный','Головний/Екстрений','Головний/Екстрений')</span>
              </div>
              <button onClick={handleAddContact} disabled={!contactForm.name||!contactForm.phone||saving} style={{ width: '100%', background: contactForm.name&&contactForm.phone ? '#c62828' : '#cbd5e0', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                {сохранение? '⏳' : `+ ${t('Сохранить контакт','Зберегти контакт','Зберегти контакт')}`}
              </button>
            </div>

            {/* Медицинские записи */}
            <SLabel>🏥 {t('Медицинские записи', 'Медицинские записи', 'Медицинские записи')</SLabel>

            {medical.map(m => (
              <div key={m.id} style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 12, marginBottom: 8, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #0369a1' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: D.navy }}>{m.title}</div>
                    {m.value && <div style={{ fontSize: 13, color: D.blue, fontWeight: 600, marginTop: 4 }}>{m.value}</div>}
                    {m.notes && <div style={{ fontSize: 12, color: D.muted, marginTop: 2 }}>{m.notes}</div>}
                    {m.valid_until && <div style={{ fontSize: 11, color: D.muted, MarginTop: 4 }}>{t('Действителен до','Дійсний до','Дійсний до')} {formatDate(m.valid_until)}<ExpiryBadge d={m.valid_until} /></div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <CopyBtn value={m.value || m.title} lang={lang} />
                    <button onClick={() => handleDeleteMedical(m.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: D.red, fontSize: 14 }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Добавить форму медицинской карты */}
            <div style={{ background: dark ? '#1e293b' : C.surface, borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ FontSize: 13, FontWeight: 700, Color: D.navy, MarginBottom: 12 }}>+ {t('Добавить медицинскую запись','Додати медицинских записей','Додати медицинских записей')</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {[
                  {id:'gp', en:'GP Doctor', uk:'Лікар GP'},
                  {id:'nhs', en:'NHS Number', uk:'NHS номер'},
                  {id:'allergy', en:'Allergy', uk:'Алергія'},
                  {id:'med', en:'Medication', uk:'Ліки'},
                  {id:'blood', en:'Blood Type', uk:'Група крові'},
                  {id:'other', en:'Other', uk:'Інше'},
                ].map(tp => (
                  <button key={tp.id} onClick={() => setMedForm(f=>({...f,type:tp.id}))} style={{ background: medForm.type===tp.id ? '#0369a1' : D.bg, color: medForm.type===tp.id ? '#fff' : D.textSub, border: `1.5px solid ${medForm.type===tp.id ? '#0369a1' : D.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {lang !== 'en' ? tp.uk : tp.en}
                  </button>
                ))}
              </div>
              <input value={medForm.title} onChange={e=>setMedForm(f=>({...f,title:e.target.value}))} placeholder={t('Title (e.g. Dr Smith, NHS Number…)','Назва (напр. Лікар Сміт, NHS номер…)','Назва (напр. Лікар Сміт, NHS номер…)')} style={{...inputStyle, marginBottom: 8, background: D.bg, color: D.text, border: `1.5px solid ${D.border}`}} />
              <input value={medForm.value} onChange={e=>setMedForm(f=>({...f,value:e.target.value}))} placeholder={t('Value / Number / Phone','Значення / Номер / Телефон','Значення / Номер / Телефон')} style={{...inputStyle, marginBottom: 8, fontFamily: 'monospace', background: D.bg, color: D.text, border: `1.5px solid ${D.border}`}} />
              <textarea value={medForm.notes} onChange={e=>setMedForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder={t('Notes…','Нотатки…','Нотатки…')} style={{...inputStyle, marginBottom: 8, resize: 'vertical', background: D.bg, color: D.text, border: `1.5px solid ${D.border}`}} />
              <button onClick={handleAddMedical} disabled={!medForm.title||saving} style={{ width: '100%', background: medForm.title ? '#0369a1' : '#cbd5e0', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                {saving ? '⏳' : `+ ${t('Save Record','Зберегти запис','Зберегти запис')}`}
              </button>
            </div>
          </>
        )}

        {tab === 'profile' && view === 'list' && (
          <>
            <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyM})`, borderRadius: 20, padding: '28px 24px 24px', marginBottom: 12, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 10 }}>{profile?.avatar || '👤'}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{profile?.name || user?.email?.split('@')[0]}</div>
              {profile?.name_ru && <div style={{ fontSize: 14, opacity: 0.6, marginTop: 2 }}>{profile.name_ru}</div>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14 }}>
                {profile?.dob && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, opacity: 0.5 }}>{t('DOB', 'Дата народження', 'Дата народження')</div><div style={{ FontWeight: 600, FontSize: 14 }}>{formatDate(profile.dob)</div></div>}
                {profile?.nationality && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, opacity: 0.5 }}>{t('Nationality', 'Громадянство', 'Громадянство')</div><div style={{ FontWeight: 600, FontSize: 14 }}>{profile.nationality</div></div>}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.4 }}>{user?.email}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setProfForm(profile || {}); setView('editProfile') }} style={{ background: dark ? '#1e293b' : C.surface, граница: `1.5px Solid ${D.border}`, borderRadius: 12, отступы: 14, FontSize: 14, FontWeight: 600, курсор: 'pointer', цвет: D.navy }}>✏️ {t('Редактировать профиль', 'Изменить', 'Редактировать')</button>
              <button onClick={signOut} style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: C.red }}>🚪 {t('Sign Out', 'Вийти', 'Вийти')}</button>
            </div>

            {/* Строка настроек */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <button onClick={toggleTheme} style={{ background: dark ? '#1e293b' : C.surface, border: `1.5px solid ${D.border}`, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: D.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 22 }}>{dark ? '☀️' : '🌙'}</span>
                <span>{темно? t('Светлый','Светла','Светла') : t('Темный','Темна','Темна')</span>
              </button>
              <button onClick={() => {
                const pin = Prompt(t('Установить 4-значный PIN-код (для удаления оставьте пустым):','Ввести 4-значный PIN-код (порожньо — видалити):','Ввести 4-значный PIN-код (порожно — посмотреть):'))
                if (pin === null) return
                если (pin === '') {removePin(); alert(t('ПИН-код удален','ПИН-код виделено','ПИН-код видалено')) }
                иначе, если (pin.length === 4 && /^\d{4}$/.test(pin)) { setPin(pin); alert(t('ПИН-код установлен!','ПИН-код установлен!','ПИН-код установлен!')) }
                else alert(t('PIN должен состоять из 4 цифр', 'PIN может состоять из 4 цифр', 'PIN может состоять из 4 цифр'))
              }} style={{ background: dark ? '#1e293b' : C.surface, border: `1.5px solid ${D.border}`, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: D.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 22 }}>🔐</span>
                <span>ПИН-код</span>
              </button>
              <button onClick={() => switchTab('medical')} style={{ background: dark ? '#1e293b' : C.surface, border: `1.5px solid ${D.border}`, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: D.navy, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 22 }}>🏥</span>
                <span>{t('Health','Здоровья','Здоровья')</span>
              </button>
            </div>
            <button onClick={() => setView('export')} style={{ width: '100%', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#166534', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              📤 {t('Экспортировать мои данные', 'Экспортировать данные', 'Экспортировать данные')}
            </button>

            <div style={{ background: C.surface, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ FontSize: 13, FontWeight: 700, Color: C.navy, MarginBottom: 12 }}>🔒 {t('Конфиденциальность и безопасность', 'Конфиденційність', 'Конфіденційність')</div>
              {[
                { icon: '🔐', en: 'Сквозное зашифрование данных', ru: 'Данные защищены шифрованием' },
                { icon: '👁', en: 'Только вы можете видеть ваши документы', ru: 'Только ты видишь свои документы' },
                { icon: '☁️', en: 'Надежно хранится в облаке Supabase', ru: 'Хранится в защищённом облаке Supabase' },
                { icon: '🗑', en: 'При удалении учетной записи удаляются все данные', ru: 'Удаление аккаунта = удаление всех данных' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.4 }}>{lang === 'ru' ? item.ru : item.en}</span>
                </div>
              ))}
            </div>
          </>
        )}


        {/* ══ ЭКСПОРТ ВИД ══ */}
        {tab === 'profile' && view === 'export' && (
          <>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>← {t('Назад', 'Назад', 'Назад')}</button>

            <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 6 }}>
                📤 {t('Экспорт данных', 'Экспорт даних', 'Экспорт даних')}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                {t('Загрузите данные в виде файла', 'Загрузите данные в просмотренный файл', 'Загрузите данные в просмотренный файл')}
              </div>

              {/* Статистика */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { icon: '📄', count: docs.length, label: t('Documents','Documenti','Documenti') },
                  { icon: '📍', count: addresses.length, label: t('Addresses','Адреси','Адреси') },
                  { icon: ' ✅', count: todos.filter(t=>t.done).length + '/' + todos.length, label: t('Tasks','Завдання','Завдання') },
                ].map((s,i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>{s.count}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Кнопки экспорта */}
              {[
                {
                  значок: '📊',
                  title: t('Документы — CSV», «Документы — CSV», «Документы — CSV»),
                  desc: t('Открыть в Excel/Google Sheets', 'Открыть в Excel/Google Sheets', 'Открыть в Excel/Google Sheets'),
                  цвет: '#166534', фон: '#f0fdf4', граница: '#86efac',
                  действие: () => exportCSV(),
                },
                {
                  icon: '🖨️',
                  title: t('Распечатать / Сохранить как PDF', 'Друк / Зберегти в PDF', 'Друк / Зберегти в PDF'),
                  desc: t('Полное изложение — распечатайте или сохраните PDF', 'Полное изложение — распечатать или сохранить PDF'), 'Полное издание — разобрать или сохранить PDF'),
                  color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd',
                  действие: () => exportPrint(),
                },
                {
                  icon: copyDone ? '✅' : '📋',
                  заголовок: copyDone ? t('Скопировано!', 'Скопировано!', 'Скопировано!') : t('Скопировать все в буфер обмена', 'Скопировать все в буфер', 'Скопировать все в буфер'),
                  desc: t('Вставить в любое приложение', 'Вставить в будь-який додаток', 'Вставить в будь-який додаток'),
                  color: copyDone ? '#166534' : '#7c3aed', bg: copyDone ? '#f0fdf4' : '#f5f3ff', border: copyDone ? '#86efac' : '#c4b5fd',
                  действие: () => exportClipboard(),
                },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action} style={{
                  ширина: '100%', фон: btn.bg, граница: `1.5px solid ${btn.border}`,
                  borderRadius: 14, padding: '16px 18px', cursor: 'pointer', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{btn.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: btn.color, marginBottom: 3 }}>{btn.title}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{btn.desc}</div>
                  </div>
                </button>
              ))}

              <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px', marginTop: 6 }}>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  🔒 {t(
                    «Экспорт содержит только ваши персональные данные. Никогда не публикуйте файлы, содержащие конфиденциальные документы».
                    «Экспорт может быть лучше ваших личностей. Не делите файлы с конфиденциальными документами публично.',
                    «Экспорт может быть лучше ваших личностей. Не делите файлы с конфиденциальными документами публично.
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ РЕДАКТИРОВАТЬ ПРОФИЛЬ ══ */}
        {tab === 'профиль' && view === 'editProfile' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ FontSize: 17, FontWeight: 700, Color: C.navy, MarginBottom: 20 }}>✏️ {t('Редактировать профиль', 'Редактировать профиль', 'Редактировать профиль')</div>
            <FField label={t('Аватар', 'Аватар', 'Аватар')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVATARS.map(a => <button key={a} onClick={() => setProfForm(f => ({ ...f, avatar: a }))} style={{ width: 44, height: 44, borderRadius: 10, fontSize: 24, border: `2px solid ${profForm.avatar === a ? C.navy : C.border}`, background: profForm.avatar === a ? C.bg : 'transparent', cursor: 'pointer' }}>{a}</button>)}
              </div>
            </FField>
            <FField label={t('Полное имя (EN)', 'Имя (EN)')}><input value={profForm.name || ''} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} placeholder="Сергий Палесика" style={inputStyle} /></FField>
            <FField label={t('Полное имя (RU)', 'Имя (RU)')}><input value={profForm.name_ru || ''} onChange={e => setProfForm(f => ({ ...f, name_ru: e.target.value }))} Placeholder="Сергей Палесика" style={inputStyle} /></FField>
            <FField label={t('Дата рождения', 'Дата народження', 'Дата народження')}><input type="date" value={profForm.dob || ''} onChange={e => setProfForm(f => ({ ...f, dob: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Национальность', 'Громадянство', 'Громадянство')}>
              <select value={profForm.nationality || 'Украинец'} onChange={e => setProfForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle}>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </FField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('list')} style={{ flex: 1, background: C.bg, border: `1.5px Solid ${C.border}`, borderRadius: 10, отступ: 14, FontSize: 14, курсор: 'pointer', цвет: C.textSub, FontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')</button>
              <button onClick={handleSaveProfile} disabled={saving} style={{ flex: 2, background: saving ? '#94a3b8' : C.navy, border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

      </div>
      {/* ══ НИЖНЯЯ ПАНЕЛЬ ВКЛАДОК ══ */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: dark ? '#1e293b' : '#fff', borderTop: `1px solid ${D.border}`, boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', zIndex: 90, display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavBtn id="home" icon="🏠" en="Home" ru="Головна" uk="Головна" tab={tab} dark={dark} lang={lang} switchTab={switchTab} />
          <NavBtn id="docs" icon="📂" en="Docs" ru="Доки" uk="Доки" tab={tab} dark={dark} lang={lang} switchTab={switchTab} />
          <NavBtn id="resume" icon="📝" en="CV" ru="CV" uk="CV" tab={tab} dark={dark} lang={lang} switchTab={switchTab} />
          <NavBtn id="medical" icon="🏥" en="Health" ru="Здоровʼя" uk="Здоровʼя" tab={tab} dark={dark} lang={lang} switchTab={switchTab} />
          <NavBtn id="profile" icon="👤" en="Profile" ru="Профіль" uk="Профіль" tab={tab} dark={dark} lang={lang} switchTab={switchTab} />
      </div>
      </>
    )}
  </div>
  )
}


function NavBtn({ id, icon, en, ru, uk, tab, dark, lang, switchTab }) {
  const active = tab === id
  const label = lang === 'uk' ? Великобритания: lang === 'ru'? ру: эн
  const color = active ? (dark ? '#60a5fa' : '#0f1f3d') : (dark ? '#475569' : '#a0aec0')
  возвращаться (
    <button onClick={function(){ switchTab(id) }} style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px 4px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: color }}>
      <div style={{ fontSize: 22, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</div>
      {active && <div style={{ width: 20, height: 3, borderRadius: 2, background: dark ? '#60a5fa' : '#0f1f3d', marginTop: 1 }} />}
    </button>
  )
}

// ── PIN SCREEN COMPONENT (extracted to avoid SWC JSX parse issues)
function PinScreen({ pinInput, pinError, dark, onKey, onRemove, label, removeLabel }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','del']
  return (
    <div style={{ minHeight: '100vh', background: dark ? '#0f172a' : '#0f1f3d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>UK Docs</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>{label}</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[0,1,2,3].map(idx => (
          <div key={idx} style={{ width: 16, height: 16, borderRadius: '50%', background: pinInput.length > idx ? (pinError ? '#ef4444' : '#fff') : 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%', maxWidth: 260 }}>
        {keys.map((k, idx) => (
          <button key={idx} onClick={() => onKey(k)} style={{
            background: k === '' ? 'transparent' : 'rgba(255,255,255,0.1)',
            border: k === '' ? 'none' : '1px solid rgba(255,255,255,0.2)',
            borderRadius: 16, padding: '20px 0',
            fontSize: k === 'del' ? 20 : 24,
            fontWeight: 600, color: '#fff',
            cursor: k === '' ? 'default' : 'pointer',
          }}>{k === 'del' ? '⌫' : k}</button>
        ))}
      </div>
      <button onClick={onRemove} style={{ marginTop: 24, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13 }}>
        {removeLabel}
      </button>
    </div>
  )
}

function DocCard({ doc, cat, lang, onOpen, dark }) {
  const title = lang === 'ru' && doc.title_ru ? doc.title_ru : doc.title
  return (
    <div onClick={onOpen} style={{ background: '#fff', borderRadius: 14, marginBottom: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,31,61,0.06)', borderLeft: `4px solid ${cat.color}` }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a202c', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {doc.pinned && <span style={{ fontSize: 10 }}>📌</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          {doc.valid_until && <ExpiryBadge d={doc.valid_until} />}
        </div>
        {doc.number && <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#4a5568', fontWeight: 600, letterSpacing: '0.04em' }}>{doc.number}</div>}
        {doc.valid_until && <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{lang !== 'en' ? 'до' : 'until'} {formatDate(doc.valid_until)}</div>}
        {(doc.document_photos?.length || 0) > 0 && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>📸 {doc.document_photos!.length} {lang !== 'en' ? 'фото' : 'photo(s)'}</div>
        )}
      </div>
      <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
    </div>
  )
}
