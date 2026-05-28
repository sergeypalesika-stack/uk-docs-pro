'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import * as DB from '@/lib/db'
import type { Address, DocPhoto } from '@/lib/db'
import { CATEGORIES, DEFAULT_TODOS, NATIONALITIES, AVATARS } from '@/lib/data'
import { daysUntil, formatDate, generateId, getExpiryStatus } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

// ── TYPES
interface Doc { id: string; category: string; title: string; title_ru: string; number: string; valid_from: string | null; valid_until: string | null; notes: string; notes_ru: string; pinned: boolean; document_photos?: DocPhoto[] }
interface DocPhoto { id: string; document_id: string; label: string; data_url: string; added_at: string }
interface PassportPhoto { id: string; label: string; data_url: string; added_at: string }
interface Passport { id: string; type: string; number: string; issued_by: string; issued_date: string | null; expiry_date: string | null; notes: string; passport_photos: PassportPhoto[] }
interface Profile { id: string; name: string; name_ru: string; dob: string; nationality: string; avatar: string }
interface TodoItem { id: string; text: string; textRu: string; done: boolean; week: number; category: string }

type Lang    = 'en' | 'ru' | 'uk'
type MainTab = 'docs' | 'passport' | 'todo' | 'address' | 'profile'
type View    = 'list' | 'detail' | 'add' | 'edit' | 'addPassport' | 'passportDetail' | 'editProfile' | 'editAddress' | 'editTodo' | 'addTodo'

// ── COLORS
const C = { navy: '#0f1f3d', navyM: '#1a2e50', blue: '#2457a4', accent: '#3b82f6', surface: '#ffffff', bg: '#f1f5fb', border: '#e2e8f4', muted: '#7a8aaa', text: '#1a2035', textSub: '#4a5570', red: '#dc2626', green: '#16a34a' }

const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', background: C.bg, boxSizing: 'border-box' }

// ── SMALL COMPONENTS
function ExpiryBadge({ d }: { d: string }) {
  const st = getExpiryStatus(d); if (!st) return null
  return <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{st.label}</span>
}
function CopyBtn({ value, lang }: { value: string; lang: Lang }) {
  const [ok, setOk] = useState(false)
  return <button onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1800) }} style={{ background: ok ? '#dcfce7' : C.bg, color: ok ? '#166534' : C.blue, border: `1.5px solid ${ok ? '#86efac' : C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{ok ? '✓' : '⎘'} {ok ? (lang === 'ru' ? 'Скопировано' : 'Copied') : (lang === 'ru' ? 'Копировать' : 'Copy')}</button>
}
function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{label}</div>{children}</div>
}
function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 5 }}>{label}</div><div style={{ fontSize: 14, color: C.text, display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 6 }}>{children}</div></div>
}
function SLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: C.muted, marginBottom: 8 }}>{children}</div>
}

// ── MAIN
export default function Page() {
  const [user,      setUser]      = useState<User | null>(null)
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [docs,      setDocs]      = useState<Doc[]>([])
  const [passports, setPassports] = useState<Passport[]>([])
  const [todos,     setTodos]     = useState<TodoItem[]>(DEFAULT_TODOS)
  const [lang,      setLang]      = useState<Lang>('ru')
  const [tab,       setTab]       = useState<MainTab>('docs')
  const [view,      setView]      = useState<View>('list')
  const [selDoc,    setSelDoc]    = useState<Doc | null>(null)
  const [selPass,   setSelPass]   = useState<Passport | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selAddr,   setSelAddr]   = useState<Address | null>(null)
  const [addrForm,  setAddrForm]  = useState({ label: '', label_ru: '', line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom', notes: '', is_home: false, color: '#2457a4' })
  const [filterCat, setFilterCat] = useState('all')
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [confirmDel,setConfirmDel]= useState<string | null>(null)
  const [photoView, setPhotoView] = useState<string | null>(null)
  const [profForm,  setProfForm]  = useState<Partial<Profile>>({})
  const [docForm,   setDocForm]   = useState({ category: 'immigration', title: '', title_ru: '', number: '', valid_from: '', valid_until: '', notes: '', notes_ru: '', pinned: false })
  const [passForm,  setPassForm]  = useState({ type: 'Ukrainian Passport', number: '', issued_by: '', issued_date: '', expiry_date: '', notes: '' })
  const [photoLabel, setPhotoLabel] = useState('')
  const passPhotoRef = useRef<HTMLInputElement>(null)
  const docPhotoRef  = useRef<HTMLInputElement>(null)
  const [docPhotoLabel, setDocPhotoLabel] = useState('')
  const supabase = createClient()

  const t = useCallback((en: string, ru: string, uk?: string) => lang === 'ru' ? ru : lang === 'uk' ? (uk ?? ru) : en, [lang])
  const cat = (id: string) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]

  // ── LOAD
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const [prof, docs, passes, todos, addrs] = await Promise.all([
        DB.getProfile(user.id),
        DB.getDocsWithPhotos(user.id),
        DB.getPassports(user.id),
        DB.getTodos(user.id),
        DB.getAddresses(user.id),
      ])
      setProfile(prof)
      setProfForm(prof ?? {})
      setDocs(docs)
      setPassports(passes as Passport[])
      setTodos(todos)
      setAddresses(addrs)
      await DB.seedDefaultDocs(user.id)
      const freshDocs = await DB.getDocs(user.id)
      setDocs(freshDocs)
      const saved = localStorage.getItem('uk_lang') as Lang
      if (saved) setLang(saved)
      setLoading(false)
    }
    load()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  const switchLang = () => { const nl = lang === 'ru' ? 'en' : lang === 'en' ? 'uk' : 'ru'; setLang(nl); localStorage.setItem('uk_lang', nl) }
  const switchTab  = (tb: MainTab) => { setTab(tb); setView('list'); setSelDoc(null); setSelPass(null); setSearch('') }

  // ── FILTERED DOCS
  const filteredDocs = docs.filter(d => {
    const mc = filterCat === 'all' || d.category === filterCat
    const q  = search.toLowerCase()
    return mc && (!q || d.title.toLowerCase().includes(q) || d.title_ru?.toLowerCase().includes(q) || d.number?.toLowerCase().includes(q))
  })
  const pinned = filteredDocs.filter(d => d.pinned)
  const rest   = filteredDocs.filter(d => !d.pinned)
  const expiring60 = docs.filter(d => { const x = daysUntil(d.valid_until ?? ''); return x !== null && x >= 0 && x <= 60 })
  const todoDone   = todos.filter(t => t.done).length

  // ── DOC ACTIONS
  const handleAddDoc = async () => {
    if (!user || !docForm.title) return
    setSaving(true)
    const nd = await DB.addDoc(user.id, { ...docForm, valid_from: docForm.valid_from || null, valid_until: docForm.valid_until || null })
    if (nd) setDocs(prev => [nd as Doc, ...prev])
    setDocForm({ category: 'immigration', title: '', title_ru: '', number: '', valid_from: '', valid_until: '', notes: '', notes_ru: '', pinned: false })
    switchTab('docs'); setSaving(false)
  }
  const handleDeleteDoc = async (id: string) => {
    await DB.deleteDoc(id)
    setDocs(prev => prev.filter(d => d.id !== id))
    setConfirmDel(null); setSelDoc(null); setView('list')
  }
  const handleTogglePin = async (doc: Doc) => {
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
      number: docForm.number,
      valid_from: docForm.valid_from || null, valid_until: docForm.valid_until || null,
      notes: docForm.notes, notes_ru: docForm.notes_ru,
      pinned: docForm.pinned,
    })
    const updated = { ...selDoc, ...docForm, valid_from: docForm.valid_from || null, valid_until: docForm.valid_until || null }
    setDocs(prev => prev.map(d => d.id === selDoc.id ? updated : d))
    setSelDoc(updated)
    setView('detail')
    setSaving(false)
  }

  // ── PASSPORT ACTIONS
  const handleAddPassport = async () => {
    if (!user || !passForm.number) return
    setSaving(true)
    const np = await DB.addPassport(user.id, { ...passForm, issued_date: passForm.issued_date || null, expiry_date: passForm.expiry_date || null })
    if (np) setPassports(prev => [{ ...(np as Passport), passport_photos: [] }, ...prev])
    setPassForm({ type: 'Ukrainian Passport', number: '', issued_by: '', issued_date: '', expiry_date: '', notes: '' })
    switchTab('passport'); setSaving(false)
  }
  const handleDeletePassport = async (id: string) => {
    await DB.deletePassport(id)
    setPassports(prev => prev.filter(p => p.id !== id))
    setConfirmDel(null); setSelPass(null); setView('list')
  }
  const handleAddPhoto = async (file: File) => {
    if (!user || !selPass) return
    const label = photoLabel || t('Page', 'Страница')
    const reader = new FileReader()
    reader.onload = async e => {
      const dataUrl = e.target?.result as string
      setSaving(true)
      const ph = await DB.addPassportPhoto(selPass.id, user.id, label, dataUrl)
      if (ph) {
        const updated = passports.map(p => p.id === selPass.id ? { ...p, passport_photos: [...p.passport_photos, ph as PassportPhoto] } : p)
        setPassports(updated)
        setSelPass(updated.find(p => p.id === selPass.id) ?? null)
      }
      setPhotoLabel('')
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }
  const handleDeletePhoto = async (passportId: string, photoId: string) => {
    await DB.deletePassportPhoto(photoId)
    const updated = passports.map(p => p.id === passportId ? { ...p, passport_photos: p.passport_photos.filter(ph => ph.id !== photoId) } : p)
    setPassports(updated)
    setSelPass(updated.find(p => p.id === passportId) ?? null)
  }

  // ── TODO
  const handleToggleTodo = async (item: TodoItem) => {
    if (!user) return
    const nt = todos.map(t => t.id === item.id ? { ...t, done: !t.done } : t)
    setTodos(nt)
    await DB.toggleTodoDB(user.id, item.id, !item.done)
  }
  const handleResetTodos = async () => {
    if (!user) return
    await DB.resetTodosDB(user.id)
    setTodos(DEFAULT_TODOS.map(t => ({ ...t, done: false })))
  }

  // ── ADDRESS ACTIONS
  const handleAddAddress = async () => {
    if (!user || !addrForm.label) return
    setSaving(true)
    if (addrForm.is_home) await DB.setHomeAddress(user.id, 'none')
    const na = await DB.addAddress(user.id, addrForm)
    if (na) {
      if (addrForm.is_home) setAddresses(prev => [na, ...prev.map(a => ({ ...a, is_home: false }))])
      else setAddresses(prev => [...prev, na])
    }
    setAddrForm({ label: '', label_ru: '', line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom', notes: '', is_home: false, color: '#2457a4' })
    switchTab('address'); setSaving(false)
  }
  const handleDeleteAddress = async (id: string) => {
    await DB.deleteAddress(id)
    setAddresses(prev => prev.filter(a => a.id !== id))
    setConfirmDel(null); setSelAddr(null); setView('list')
  }
  const handleSetHome = async (addr: Address) => {
    if (!user) return
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
    } else {
      setAddresses(prev => prev.map(a => a.id === selAddr.id ? updated : a))
    }
    setSelAddr(updated)
    setView('detail')
    setSaving(false)
  }

  // ── TODO EDIT
  const [todoForm, setTodoForm] = useState({ text: '', textRu: '', category: 'other', week: 1 })
  const [selTodo, setSelTodo] = useState<TodoItem | null>(null)

  const handleAddTodo = async () => {
    if (!user || !todoForm.text) return
    const newTodo: TodoItem = { id: generateId(), text: todoForm.text, textRu: todoForm.textRu, done: false, week: todoForm.week, category: todoForm.category }
    const nt = [...todos, newTodo]
    setTodos(nt)
    try { localStorage.setItem('uk_todos_v2', JSON.stringify(nt)) } catch(_) {}
    await DB.toggleTodoDB(user.id, newTodo.id, false)
    setTodoForm({ text: '', textRu: '', category: 'other', week: 1 })
    setView('list')
  }

  // ── DOC PHOTO ACTIONS
  const handleAddDocPhoto = async (file: File) => {
    if (!user || !selDoc) return
    const label = docPhotoLabel || t('Photo', 'Фото', 'Фото')
    const reader = new FileReader()
    reader.onload = async e => {
      const dataUrl = e.target?.result as string
      setSaving(true)
      const ph = await DB.addDocPhoto(selDoc.id, user.id, label, dataUrl)
      if (ph) {
        const updated = { ...selDoc, document_photos: [...(selDoc.document_photos ?? []), ph] }
        setDocs(prev => prev.map(d => d.id === selDoc.id ? updated : d))
        setSelDoc(updated)
      }
      setDocPhotoLabel('')
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteDocPhoto = async (photoId: string) => {
    if (!selDoc) return
    await DB.deleteDocPhoto(photoId)
    const updated = { ...selDoc, document_photos: (selDoc.document_photos ?? []).filter(p => p.id !== photoId) }
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

  const handleDeleteTodo = async (id: string) => {
    if (!user) return
    const nt = todos.filter(t => t.id !== id)
    setTodos(nt)
    try { localStorage.setItem('uk_todos_v2', JSON.stringify(nt)) } catch(_) {}
    await DB.resetTodosDB(user.id)
    for (const t of nt) { if (t.done) await DB.toggleTodoDB(user.id, t.id, true) }
    setConfirmDel(null)
    setSelTodo(null)
    setView('list')
  }

  // ── SHARE ADDRESS
  const shareAddress = (addr: Address, via: 'whatsapp' | 'telegram') => {
    const full = [addr.line1, addr.line2, addr.city, addr.postcode, addr.country].filter(Boolean).join(', ')
    const label = lang !== 'en' && addr.label_ru ? addr.label_ru : addr.label
    const text = encodeURIComponent(`📍 ${label}\n${full}${addr.notes ? '\n' + addr.notes : ''}`)
    if (via === 'whatsapp') window.open(`https://wa.me/?text=${text}`, '_blank')
    else window.open(`https://t.me/share/url?url=${text}`, '_blank')
  }

  // ── COPY ADDRESS
  const copyAddress = (addr: Address) => {
    const full = [addr.line1, addr.line2, addr.city, addr.postcode, addr.country].filter(Boolean).join(', ')
    navigator.clipboard.writeText(full)
  }

  // ── ADDRESS COLORS
  const ADDR_COLORS = ['#2457a4','#0369a1','#2e7d32','#b45309','#c62828','#5b21b6','#0f766e','#1a2a4a']

  // ── HOME ADDRESS
  const homeAddr = addresses.find(a => a.is_home)

  // ── PROFILE SAVE
  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    await DB.upsertProfile(user.id, { name: profForm.name ?? '', name_ru: profForm.name_ru ?? '', dob: profForm.dob ?? '', nationality: profForm.nationality ?? 'Ukrainian', avatar: profForm.avatar ?? '👤' })
    const fresh = await DB.getProfile(user.id)
    setProfile(fresh); setSaving(false); setView('list')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🇬🇧</div>
      <div style={{ color: C.muted, fontSize: 14 }}>Loading your documents…</div>
    </div>
  )

  if (photoView) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPhotoView(null)}>
      <img src={photoView} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 16 }}>{t('Tap to close', 'Натисни щоб закрити', 'Натисни щоб закрити')}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>

      {/* ══ HEADER ══ */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyM})`, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🇬🇧</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{profile?.avatar ?? '👤'}</span>
                <span>{profile?.name || user?.email?.split('@')[0] || 'User'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{user?.email}</div>
            </div>
            {saving && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>saving…</span>}
            <button onClick={switchLang} title={lang === 'ru' ? 'Switch to English' : lang === 'en' ? 'Перейти на Українську' : 'Переключить на Русский'} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '5px 11px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {lang === 'ru' ? '🇬🇧 EN' : lang === 'en' ? '🇺🇦 UA' : '🇷🇺 RU'}
            </button>
            <button onClick={signOut} style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '5px 10px', color: '#fca5a5', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🚪</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingBottom: 12 }}>
            {[
              { icon: '📄', val: docs.length, en: 'Documents', ru: 'Документов' },
              { icon: '⚠️', val: expiring60.length, en: 'Expiring', ru: 'Истекает', warn: expiring60.length > 0 },
              { icon: '✅', val: `${todoDone}/${todos.length}`, en: 'Tasks', ru: 'Задач' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.warn ? 'rgba(234,88,12,0.2)' : 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' as const, border: s.warn ? '1px solid rgba(234,88,12,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{s.icon} {lang !== 'en' ? s.ru : s.en}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.warn ? '#fb923c' : '#fff' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Spacer for bottom nav */}
          <div style={{ height: 4 }} />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 120px' }}>

        {/* ══════════ DOCS TAB ══════════ */}
        {tab === 'docs' && view === 'list' && (
          <>
            {expiring60.length > 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>⚠️ {t('Expiring soon', 'Спливає скоро', 'Спливає скоро')}</div>
                {expiring60.map(d => <div key={d.id} style={{ fontSize: 12, color: '#7c2d12', marginBottom: 2 }}>· {lang !== 'en' && d.title_ru ? d.title_ru : d.title} — {daysUntil(d.valid_until ?? '')}d</div>)}
              </div>
            )}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search…', 'Пошук…', 'Пошук…')} style={{ ...inputStyle, paddingLeft: 36 }} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>×</button>}
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 14, scrollbarWidth: 'none' as const }}>
              {[{ id: 'all', label: 'All', labelRu: 'Все', icon: '📂', color: C.navy }, ...CATEGORIES].map(c => (
                <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ flexShrink: 0, background: filterCat === c.id ? c.color : C.surface, color: filterCat === c.id ? '#fff' : C.textSub, border: `1.5px solid ${filterCat === c.id ? c.color : C.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {c.icon} {lang !== 'en' ? c.labelRu : c.label}
                </button>
              ))}
            </div>

            {pinned.length > 0 && (<><SLabel>📌 {t('Pinned', 'Закріплені', 'Закріплені')}</SLabel>{pinned.map(d => <DocCard key={d.id} doc={d} cat={cat(d.category)} lang={lang} onOpen={() => { setSelDoc(d); setView('detail') }} />)}<div style={{ height: 8 }} /></>)}
            {rest.map(d => <DocCard key={d.id} doc={d} cat={cat(d.category)} lang={lang} onOpen={() => { setSelDoc(d); setView('detail') }} />)}

            {filteredDocs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <div>{t('No documents', 'Немає документів', 'Немає документів')}</div>
              </div>
            )}
            <button onClick={() => setView('add')} style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, background: C.navy, color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 20px rgba(15,31,61,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </>
        )}

        {/* ══ DOC DETAIL ══ */}
        {tab === 'docs' && view === 'detail' && selDoc && (() => {
          const c = cat(selDoc.category)
          return (<>
            <button onClick={() => { setView('list'); setSelDoc(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>← {t('Back', 'Назад', 'Назад')}</button>
            <div style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)`, borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff', boxShadow: `0 8px 30px ${c.color}40` }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{lang !== 'en' && selDoc.title_ru ? selDoc.title_ru : selDoc.title}</div>
            </div>
            <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '20px 22px', marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {selDoc.number && <DRow label={t('Number / Code', 'Номер / Код', 'Номер / Код')}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}><span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, letterSpacing: '0.07em', color: C.navy }}>{selDoc.number}</span><CopyBtn value={selDoc.number} lang={lang} /></div></DRow>}
              {selDoc.valid_from  && <DRow label={t('Valid from', 'Дійсний з', 'Дійсний з')}>{formatDate(selDoc.valid_from)}</DRow>}
              {selDoc.valid_until && <DRow label={t('Valid until', 'Дійсний до', 'Дійсний до')}><span>{formatDate(selDoc.valid_until)}</span><ExpiryBadge d={selDoc.valid_until} /></DRow>}
              {(selDoc.notes || selDoc.notes_ru) && <DRow label={t('Notes', 'Нотатки', 'Нотатки')}><span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.65 }}>{lang !== 'en' && selDoc.notes_ru ? selDoc.notes_ru : selDoc.notes}</span></DRow>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setDocForm({ category: selDoc.category, title: selDoc.title, title_ru: selDoc.title_ru, number: selDoc.number, valid_from: selDoc.valid_from ?? '', valid_until: selDoc.valid_until ?? '', notes: selDoc.notes, notes_ru: selDoc.notes_ru, pinned: selDoc.pinned }); setView('edit') }} style={{ flex: 1, background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1d4ed8' }}>✏️ {t('Edit', 'Змінити', 'Змінити')}</button>
              <button onClick={() => handleTogglePin(selDoc)} style={{ flex: 1, background: selDoc.pinned ? '#fef9c3' : C.surface, color: selDoc.pinned ? '#854d0e' : C.textSub, border: `1.5px solid ${selDoc.pinned ? '#fde047' : C.border}`, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📌 {selDoc.pinned ? t('Unpin', 'Відкріпити', 'Відкріпити') : t('Pin', 'Закріпити', 'Закріпити')}</button>
              <button onClick={() => setConfirmDel(selDoc.id)} style={{ flex: 1, background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.red }}>🗑</button>
            </div>

            {/* ── DOCUMENT PHOTOS ── */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                📸 {t('Document Photos', 'Фото документа', 'Фото документа')}
                <span style={{ background: C.bg, borderRadius: 20, padding: '2px 8px', fontSize: 12, color: C.muted, fontWeight: 600 }}>
                  {(selDoc.document_photos ?? []).length}
                </span>
              </div>

              {/* Photo grid */}
              {(selDoc.document_photos ?? []).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {(selDoc.document_photos ?? []).map(ph => (
                    <div key={ph.id} style={{ position: 'relative' }}>
                      <img
                        src={ph.data_url} alt={ph.label}
                        onClick={() => setPhotoView(ph.data_url)}
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.border}` }}
                      />
                      <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{ph.label}</div>
                      <button
                        onClick={() => handleDeleteDocPhoto(ph.id)}
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: 99, width: 26, height: 26, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add photo */}
              <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>
                  {t('Add photo', 'Додати фото', 'Додати фото')}
                </div>
                <input
                  value={docPhotoLabel}
                  onChange={e => setDocPhotoLabel(e.target.value)}
                  placeholder={t('Label (e.g. Front side)', 'Підпис (напр. Лицьова сторона)', 'Підпис (напр. Лицьова сторона)')}
                  style={{ ...inputStyle, marginBottom: 10, fontSize: 13 }}
                />
                <input
                  ref={docPhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleAddDocPhoto(file)
                    if (docPhotoRef.current) docPhotoRef.current.value = ''
                  }}
                />
                <button
                  onClick={() => docPhotoRef.current?.click()}
                  disabled={saving}
                  style={{ width: '100%', background: saving ? '#94a3b8' : C.navy, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {saving ? '⏳ Uploading…' : `📷 ${t('Take / Choose Photo', 'Сфотографувати / Вибрати', 'Сфотографувати / Вибрати')}`}
                </button>
              </div>
            </div>

            {confirmDel === selDoc.id && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 14, padding: 18, textAlign: 'center' as const }}>
              <div style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, marginBottom: 14 }}>{t('Delete this document?', 'Удалить этот документ?')}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
                <button onClick={() => handleDeleteDoc(selDoc.id)} style={{ flex: 1, background: C.red, border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>{t('Delete', 'Видалити', 'Видалити')}</button>
              </div>
            </div>}
          </>)
        })()}

        {/* ══ ADD DOC ══ */}
        {tab === 'docs' && view === 'add' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>➕ {t('New Document', 'Новий документ', 'Новий документ')}</div>
            <FField label={t('Category', 'Категорія', 'Категорія')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => <button key={c.id} onClick={() => setDocForm(f => ({ ...f, category: c.id }))} style={{ background: docForm.category === c.id ? c.color : C.bg, color: docForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${docForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '10px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3 }}><span style={{ fontSize: 20 }}>{c.icon}</span><span>{lang !== 'en' ? c.labelRu : c.label}</span></button>)}
              </div>
            </FField>
            <FField label={t('Title (EN)', 'Название (EN)')}><input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. CSCS Green Card" style={inputStyle} /></FField>
            <FField label={t('Title (RU)', 'Название (RU)')}><input value={docForm.title_ru} onChange={e => setDocForm(f => ({ ...f, title_ru: e.target.value }))} placeholder="напр. Карта CSCS" style={inputStyle} /></FField>
            <FField label={t('Number / Code', 'Номер / Код', 'Номер / Код')}><input value={docForm.number} onChange={e => setDocForm(f => ({ ...f, number: e.target.value }))} placeholder="e.g. WZL F8D 7A4" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16 }} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('From', 'С')}><input type="date" value={docForm.valid_from} onChange={e => setDocForm(f => ({ ...f, valid_from: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Until', 'До')}><input type="date" value={docForm.valid_until} onChange={e => setDocForm(f => ({ ...f, valid_until: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes (EN)', 'Заметки (EN)')}><textarea value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></FField>
            <FField label={t('Notes (RU)', 'Заметки (RU)')}><textarea value={docForm.notes_ru} onChange={e => setDocForm(f => ({ ...f, notes_ru: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></FField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }} onClick={() => setDocForm(f => ({ ...f, pinned: !f.pinned }))}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: docForm.pinned ? C.blue : 'transparent', border: docForm.pinned ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>{docForm.pinned ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: C.textSub }}>📌 {t('Pin this document', 'Закрепить')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => switchTab('docs')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleAddDoc} disabled={!docForm.title || saving} style={{ flex: 2, background: docForm.title ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: docForm.title ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

        {/* ══ EDIT DOC ══ */}
        {tab === 'docs' && view === 'edit' && selDoc && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>✏️ {t('Edit Document', 'Редагувати документ', 'Редагувати документ')}</div>
            <FField label={t('Category', 'Категорія', 'Категорія')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => <button key={c.id} onClick={() => setDocForm(f => ({ ...f, category: c.id }))} style={{ background: docForm.category === c.id ? c.color : C.bg, color: docForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${docForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '10px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3 }}><span style={{ fontSize: 20 }}>{c.icon}</span><span>{lang !== 'en' ? c.labelRu : c.label}</span></button>)}
              </div>
            </FField>
            <FField label={t('Title (EN)', 'Название (EN)')}><input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Title (RU)', 'Название (RU)')}><input value={docForm.title_ru} onChange={e => setDocForm(f => ({ ...f, title_ru: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Number / Code', 'Номер / Код', 'Номер / Код')}><input value={docForm.number} onChange={e => setDocForm(f => ({ ...f, number: e.target.value }))} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16 }} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('From', 'С')}><input type="date" value={docForm.valid_from} onChange={e => setDocForm(f => ({ ...f, valid_from: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Until', 'До')}><input type="date" value={docForm.valid_until} onChange={e => setDocForm(f => ({ ...f, valid_until: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes (EN)', 'Заметки (EN)')}><textarea value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></FField>
            <FField label={t('Notes (RU)', 'Заметки (RU)')}><textarea value={docForm.notes_ru} onChange={e => setDocForm(f => ({ ...f, notes_ru: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></FField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }} onClick={() => setDocForm(f => ({ ...f, pinned: !f.pinned }))}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: docForm.pinned ? C.blue : 'transparent', border: docForm.pinned ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>{docForm.pinned ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: C.textSub }}>📌 {t('Pinned', 'Закреплён')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('detail')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleUpdateDoc} disabled={!docForm.title || saving} style={{ flex: 2, background: docForm.title ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: docForm.title ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save Changes', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

        {/* ══════════ PASSPORT TAB ══════════ */}
        {tab === 'passport' && view === 'list' && (
          <>
            {passports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                <div style={{ fontSize: 50, marginBottom: 12 }}>📘</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t('No passports added', 'Паспорти не додані', 'Паспорти не додані')}</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>{t('Add passport with photos of key pages', 'Добавь паспорт с фото страниц')}</div>
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

        {/* ══ ADD PASSPORT ══ */}
        {tab === 'passport' && view === 'addPassport' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📘 {t('Add Passport', 'Додати паспорт', 'Додати паспорт')}</div>
            <FField label={t('Type', 'Тип')}>
              <select value={passForm.type} onChange={e => setPassForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                {['Ukrainian Passport', 'Ukrainian ID Card', 'UK BRP Card', 'UK Passport', 'EU Passport', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FField>
            <FField label={t('Number', 'Номер')}><input value={passForm.number} onChange={e => setPassForm(f => ({ ...f, number: e.target.value }))} placeholder="AA123456" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.06em' }} /></FField>
            <FField label={t('Issued by', 'Ким виданий', 'Ким виданий')}><input value={passForm.issued_by} onChange={e => setPassForm(f => ({ ...f, issued_by: e.target.value }))} placeholder={t('Ministry of Internal Affairs', 'МВД Украины')} style={inputStyle} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('Issued', 'Дата видачі', 'Дата видачі')}><input type="date" value={passForm.issued_date} onChange={e => setPassForm(f => ({ ...f, issued_date: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Expires', 'Термін дії', 'Термін дії')}><input type="date" value={passForm.expiry_date} onChange={e => setPassForm(f => ({ ...f, expiry_date: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes', 'Нотатки', 'Нотатки')}><textarea value={passForm.notes} onChange={e => setPassForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></FField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => switchTab('passport')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleAddPassport} disabled={!passForm.number || saving} style={{ flex: 2, background: passForm.number ? '#0369a1' : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: passForm.number ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

        {/* ══ PASSPORT DETAIL ══ */}
        {tab === 'passport' && view === 'passportDetail' && selPass && (
          <>
            <button onClick={() => { setView('list'); setSelPass(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>← {t('Back', 'Назад', 'Назад')}</button>
            <div style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)', borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📘</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{selPass.type}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: '0.1em', marginTop: 4, opacity: 0.9 }}>{selPass.number}</div>
            </div>
            <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '20px 22px', marginBottom: 12 }}>
              {selPass.issued_by   && <DRow label={t('Issued by', 'Ким виданий', 'Ким виданий')}>{selPass.issued_by}</DRow>}
              {selPass.issued_date && <DRow label={t('Issued', 'Дата видачі', 'Дата видачі')}>{formatDate(selPass.issued_date)}</DRow>}
              {selPass.expiry_date && <DRow label={t('Expires', 'Срок')}><span>{formatDate(selPass.expiry_date)}</span><ExpiryBadge d={selPass.expiry_date} /></DRow>}
              <DRow label={t('Passport number', 'Номер паспорта', 'Номер паспорта')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: C.navy }}>{selPass.number}</span>
                  <CopyBtn value={selPass.number} lang={lang} />
                </div>
              </DRow>
            </div>

            {/* Photos */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>📸 {t('Document Photos', 'Фото сторінок', 'Фото сторінок')} ({selPass.passport_photos.length})</div>
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
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>{t('Add page photo', 'Додати фото сторінки', 'Додати фото сторінки')}</div>
                <input value={photoLabel} onChange={e => setPhotoLabel(e.target.value)} placeholder={t('Label (e.g. Main page)', 'Подпись (напр. Главная страница)')} style={{ ...inputStyle, marginBottom: 8, fontSize: 13 }} />
                <input ref={passPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAddPhoto(f); if (passPhotoRef.current) passPhotoRef.current.value = '' }} />
                <button onClick={() => passPhotoRef.current?.click()} disabled={saving} style={{ width: '100%', background: saving ? '#94a3b8' : '#0369a1', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? '⏳ Uploading…' : `📷 ${t('Take / Choose Photo', 'Сфотографувати / Вибрати', 'Сфотографувати / Вибрати')}`}
                </button>
              </div>
            </div>

            <button onClick={() => setConfirmDel(selPass.id)} style={{ width: '100%', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.red }}>🗑 {t('Delete Passport', 'Видалити паспорт', 'Видалити паспорт')}</button>
            {confirmDel === selPass.id && (
              <div style={{ background: '#fee2e2', borderRadius: 12, padding: 16, marginTop: 10, textAlign: 'center' as const }}>
                <div style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, marginBottom: 12 }}>{t('Delete this passport?', 'Удалить этот паспорт?')}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
                  <button onClick={() => handleDeletePassport(selPass.id)} style={{ flex: 1, background: C.red, border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>{t('Delete', 'Видалити', 'Видалити')}</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ TODO TAB ══════════ */}
        {/* ══════════ ADDRESS BOOK TAB ══════════ */}
        {tab === 'address' && view === 'list' && (
          <>
            {/* Home address hero */}
            {homeAddr ? (
              <div style={{ background: `linear-gradient(135deg, ${homeAddr.color}, ${homeAddr.color}cc)`, borderRadius: 20, padding: '22px 22px 18px', marginBottom: 14, color: '#fff', cursor: 'pointer' }}
                onClick={() => { setSelAddr(homeAddr); setView('detail') }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>🏠</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, opacity: 0.7 }}>{t('Home Address', 'Адреса прописки', 'Адреса прописки')}</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{lang !== 'en' && homeAddr.label_ru ? homeAddr.label_ru : homeAddr.label}</div>
                  </div>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9 }}>
                  {homeAddr.line1}{homeAddr.line2 ? `, ${homeAddr.line2}` : ''}<br />
                  {[homeAddr.city, homeAddr.postcode].filter(Boolean).join(', ')}<br />
                  {homeAddr.country}
                </div>
                {/* Share buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={e => { e.stopPropagation(); shareAddress(homeAddr, 'whatsapp') }} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <span style={{ fontSize: 16 }}>💬</span> WhatsApp
                  </button>
                  <button onClick={e => { e.stopPropagation(); shareAddress(homeAddr, 'telegram') }} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <span style={{ fontSize: 16 }}>✈️</span> Telegram
                  </button>
                  <button onClick={e => { e.stopPropagation(); copyAddress(homeAddr) }} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ⎘ {t('Copy', 'Скопіювати', 'Скопіювати')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: C.surface, borderRadius: 16, padding: '20px 18px', marginBottom: 14, border: `2px dashed ${C.border}`, textAlign: 'center' as const }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🏠</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 4 }}>{t('No home address set', 'Адрес прописки не добавлен')}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{t('Add an address and mark it as home', 'Добавь адрес и отметь его как главный')}</div>
              </div>
            )}

            {/* Other addresses */}
            {addresses.filter(a => !a.is_home).length > 0 && (
              <>
                <SLabel>📌 {t('Saved Addresses', 'Важливі адреси', 'Важливі адреси')}</SLabel>
                {addresses.filter(a => !a.is_home).map(addr => (
                  <div key={addr.id} style={{ background: C.surface, borderRadius: 14, marginBottom: 8, padding: '14px 16px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,31,61,0.06)', borderLeft: `4px solid ${addr.color}` }}
                    onClick={() => { setSelAddr(addr); setView('detail') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: addr.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📍</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{lang !== 'en' && addr.label_ru ? addr.label_ru : addr.label}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
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
                <div style={{ fontSize: 14 }}>{t('No addresses yet', 'Немає адрес', 'Немає адрес')}</div>
              </div>
            )}

            <button onClick={() => setView('add')} style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, background: '#2e7d32', color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer', boxShadow: '0 4px 20px rgba(46,125,50,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </>
        )}

        {/* ══ ADDRESS DETAIL ══ */}
        {tab === 'address' && view === 'detail' && selAddr && (
          <>
            <button onClick={() => { setView('list'); setSelAddr(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>← {t('Back', 'Назад', 'Назад')}</button>

            {/* Hero */}
            <div style={{ background: `linear-gradient(135deg, ${selAddr.color}, ${selAddr.color}bb)`, borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 32 }}>{selAddr.is_home ? '🏠' : '📍'}</span>
                <div>
                  {selAddr.is_home && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, opacity: 0.7, marginBottom: 2 }}>{t('Home Address', 'Адреса прописки', 'Адреса прописки')}</div>}
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

            {/* Details */}
            <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '18px 22px', marginBottom: 12 }}>
              {selAddr.notes && <DRow label={t('Notes', 'Нотатки', 'Нотатки')}><span style={{ fontSize: 13, color: C.textSub }}>{selAddr.notes}</span></DRow>}
              <DRow label={t('Full address', 'Повна адреса', 'Повна адреса')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 13, color: C.textSub, flex: 1, lineHeight: 1.5 }}>
                    {[selAddr.line1, selAddr.line2, selAddr.city, selAddr.postcode, selAddr.country].filter(Boolean).join(', ')}
                  </span>
                  <CopyBtn value={[selAddr.line1, selAddr.line2, selAddr.city, selAddr.postcode, selAddr.country].filter(Boolean).join(', ')} lang={lang} />
                </div>
              </DRow>
            </div>

            {/* Share */}
            <div style={{ background: C.surface, borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12 }}>📤 {t('Share Address', 'Поділитися адресою', 'Поділитися адресою')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => shareAddress(selAddr, 'whatsapp')} style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 28 }}>💬</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>WhatsApp</span>
                </button>
                <button onClick={() => shareAddress(selAddr, 'telegram')} style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 12, padding: '14px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 28 }}>✈️</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>Telegram</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setAddrForm({ label: selAddr.label, label_ru: selAddr.label_ru, line1: selAddr.line1, line2: selAddr.line2, city: selAddr.city, postcode: selAddr.postcode, country: selAddr.country, notes: selAddr.notes, is_home: selAddr.is_home, color: selAddr.color }); setView('editAddress') }} style={{ flex: 1, background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1d4ed8' }}>
                ✏️ {t('Edit', 'Змінити', 'Змінити')}
              </button>
              {!selAddr.is_home && (
                <button onClick={() => handleSetHome(selAddr)} style={{ flex: 1, background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#854d0e' }}>
                  🏠 {t('Set as Home', 'Зробити головним', 'Зробити головним')}
                </button>
              )}
              <button onClick={() => setConfirmDel(selAddr.id)} style={{ flex: 1, background: '#fff', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.red }}>
                🗑 {t('Delete', 'Видалити', 'Видалити')}
              </button>
            </div>

            {confirmDel === selAddr.id && (
              <div style={{ background: '#fee2e2', borderRadius: 14, padding: 18, textAlign: 'center' as const }}>
                <div style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, marginBottom: 14 }}>{t('Delete this address?', 'Удалить этот адрес?')}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
                  <button onClick={() => handleDeleteAddress(selAddr.id)} style={{ flex: 1, background: C.red, border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700 }}>{t('Delete', 'Видалити', 'Видалити')}</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ ADD ADDRESS ══ */}
        {tab === 'address' && view === 'add' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📍 {t('New Address', 'Нова адреса', 'Нова адреса')}</div>

            {/* Color picker */}
            <FField label={t('Colour', 'Колір', 'Колір')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {ADDR_COLORS.map(col => (
                  <button key={col} onClick={() => setAddrForm(f => ({ ...f, color: col }))} style={{ width: 36, height: 36, borderRadius: 8, background: col, border: addrForm.color === col ? '3px solid #1a202c' : '2px solid transparent', cursor: 'pointer', boxShadow: addrForm.color === col ? '0 0 0 2px #fff inset' : 'none' }} />
                ))}
              </div>
            </FField>

            <FField label={t('Label (EN)', 'Название (EN)')}><input value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Oxford Home, GP Surgery" style={inputStyle} /></FField>
            <FField label={t('Label (RU)', 'Название (RU)')}><input value={addrForm.label_ru} onChange={e => setAddrForm(f => ({ ...f, label_ru: e.target.value }))} placeholder="напр. Дом в Оксфорде, Врач" style={inputStyle} /></FField>
            <FField label={t('Address line 1', 'Адрес строка 1')}><input value={addrForm.line1} onChange={e => setAddrForm(f => ({ ...f, line1: e.target.value }))} placeholder="e.g. 12 Rose Street" style={inputStyle} /></FField>
            <FField label={t('Address line 2', 'Адрес строка 2')}><input value={addrForm.line2} onChange={e => setAddrForm(f => ({ ...f, line2: e.target.value }))} placeholder={t('Flat, area (optional)', 'Квартира, район (необязательно)')} style={inputStyle} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('City', 'Місто', 'Місто')}><input value={addrForm.city} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} placeholder="Oxford" style={inputStyle} /></FField>
              <FField label={t('Postcode', 'Почтовый индекс')}><input value={addrForm.postcode} onChange={e => setAddrForm(f => ({ ...f, postcode: e.target.value }))} placeholder="OX1 1AB" style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' as const }} /></FField>
            </div>
            <FField label={t('Country', 'Країна', 'Країна')}><input value={addrForm.country} onChange={e => setAddrForm(f => ({ ...f, country: e.target.value }))} placeholder="United Kingdom" style={inputStyle} /></FField>
            <FField label={t('Notes', 'Нотатки', 'Нотатки')}><textarea value={addrForm.notes} onChange={e => setAddrForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder={t('e.g. near bus stop, ring bell 2', 'напр. возле остановки, звонок 2')} style={{ ...inputStyle, resize: 'vertical' as const }} /></FField>

            {/* Home toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: addrForm.is_home ? '#fef9c3' : C.bg, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: `1.5px solid ${addrForm.is_home ? '#fde047' : C.border}` }}
              onClick={() => setAddrForm(f => ({ ...f, is_home: !f.is_home }))}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: addrForm.is_home ? '#f59e0b' : 'transparent', border: addrForm.is_home ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{addrForm.is_home ? '✓' : ''}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: addrForm.is_home ? '#854d0e' : C.text }}>🏠 {t('Set as Home Address', 'Сделать адресом прописки')}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{t('Your main registered address in UK', 'Главный зарегистрированный адрес в UK')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => switchTab('address')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleAddAddress} disabled={!addrForm.label || !addrForm.line1 || saving} style={{ flex: 2, background: addrForm.label && addrForm.line1 ? '#2e7d32' : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: addrForm.label && addrForm.line1 ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>
                {saving ? '⏳' : t('Save Address', 'Сохранить адрес')}
              </button>
            </div>
          </div>
        )}

        {/* ══ EDIT ADDRESS ══ */}
        {tab === 'address' && view === 'editAddress' && selAddr && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>✏️ {t('Edit Address', 'Редагувати адресу', 'Редагувати адресу')}</div>
            <FField label={t('Colour', 'Колір', 'Колір')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
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
              <FField label={t('Postcode', 'Индекс')}><input value={addrForm.postcode} onChange={e => setAddrForm(f => ({ ...f, postcode: e.target.value }))} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' as const }} /></FField>
            </div>
            <FField label={t('Country', 'Країна', 'Країна')}><input value={addrForm.country} onChange={e => setAddrForm(f => ({ ...f, country: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Notes', 'Нотатки', 'Нотатки')}><textarea value={addrForm.notes} onChange={e => setAddrForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} /></FField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: addrForm.is_home ? '#fef9c3' : C.bg, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', border: `1.5px solid ${addrForm.is_home ? '#fde047' : C.border}` }}
              onClick={() => setAddrForm(f => ({ ...f, is_home: !f.is_home }))}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: addrForm.is_home ? '#f59e0b' : 'transparent', border: addrForm.is_home ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{addrForm.is_home ? '✓' : ''}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: addrForm.is_home ? '#854d0e' : C.text }}>🏠 {t('Home Address', 'Адреса прописки', 'Адреса прописки')}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{t('Your main registered address', 'Главный зарегистрированный адрес')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('detail')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleUpdateAddress} disabled={saving} style={{ flex: 2, background: saving ? '#94a3b8' : '#2e7d32', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: '#fff', fontWeight: 700 }}>
                {saving ? '⏳' : t('Save Changes', 'Сохранить изменения')}
              </button>
            </div>
          </div>
        )}

        {tab === 'todo' && view === 'list' && (
          <>
            {/* Progress bar */}
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{t('Progress', 'Прогрес', 'Прогрес')}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{todoDone}/{todos.length}</span>
              </div>
              <div style={{ background: C.bg, borderRadius: 99, height: 10, overflow: 'hidden' }}>
                <div style={{ background: `linear-gradient(90deg, ${C.accent}, #22c55e)`, height: '100%', borderRadius: 99, width: `${todos.length ? (todoDone / todos.length * 100) : 0}%`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{todos.length - todoDone} {t('remaining', 'залишилось', 'залишилось')}</div>
            </div>

            {Array.from(new Set(todos.map(t => t.week))).sort((a, b) => a - b).map(w => {
              const wL: Record<number, { en: string; ru: string }> = {
                0: { en: '📅 Days 1–2 · Arrival', ru: '📅 Дни 1–2 · Прибытие' },
                1: { en: '📅 Days 3–5 · Critical Steps', ru: '📅 Дни 3–5 · Критически важные шаги' },
                2: { en: '📅 Week 2 · Housing & School', ru: '📅 Неделя 2 · Жильё и школа' },
                3: { en: '📅 Week 3 · Benefits & Finances', ru: '📅 Неделя 3 · Пособия и финансы' },
                4: { en: '📅 Week 3–4 · Work', ru: '📅 Неделя 3–4 · Работа' },
                5: { en: '📅 Week 4–5 · Infrastructure', ru: '📅 Неделя 4–5 · Обустройство' },
                6: { en: '📅 Week 6 · Final Checklist', ru: '📅 Неделя 6 · Итоговая проверка' },
                7: { en: '📅 Later', ru: '📅 Позже' },
              }
              const items = todos.filter(t => t.week === w)
              const doneH = items.filter(t => t.done).length
              return (
                <div key={w} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.blue }}>
                      {lang !== 'en' ? wL[w]?.ru : wL[w]?.en}
                    </div>
                    <span style={{ fontSize: 11, color: C.muted }}>{doneH}/{items.length}</span>
                  </div>
                  <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden' }}>
                    {items.map((item, i) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none', background: item.done ? '#f0fdf4' : C.surface }}>
                        {/* Checkbox */}
                        <div onClick={() => handleToggleTodo(item)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: item.done ? '#22c55e' : 'transparent', border: item.done ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                          {item.done ? '✓' : ''}
                        </div>
                        {/* Text */}
                        <div onClick={() => handleToggleTodo(item)} style={{ flex: 1, fontSize: 13, color: item.done ? '#4ade80' : C.text, textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.4, cursor: 'pointer' }}>
                          {lang !== 'en' ? item.textRu || item.text : item.text}
                        </div>
                        <span style={{ fontSize: 14 }}>{CATEGORIES.find(c => c.id === item.category)?.icon ?? '📁'}</span>
                        {/* Edit button */}
                        <button onClick={() => { setSelTodo(item); setTodoForm({ text: item.text, textRu: item.textRu, category: item.category, week: item.week }); setView('editTodo') }}
                          style={{ background: '#eff6ff', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: C.blue, flexShrink: 0 }}>
                          ✏️
                        </button>
                        {/* Delete button */}
                        <button onClick={() => { setConfirmDel(item.id) }}
                          style={{ background: '#fee2e2', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', fontSize: 12, color: C.red, flexShrink: 0 }}>
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Inline confirm delete for todo */}
                  {items.some(i => i.id === confirmDel) && (
                    <div style={{ background: '#fee2e2', borderRadius: 10, padding: '12px 14px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, color: '#991b1b', fontWeight: 600 }}>{t('Delete this task?', 'Видалити це завдання?', 'Видалити це завдання?')}</span>
                      <button onClick={() => setConfirmDel(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>{t('No', 'Нет')}</button>
                      <button onClick={() => { const id = confirmDel!; handleDeleteTodo(id) }} style={{ background: C.red, border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700 }}>{t('Yes', 'Да')}</button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Bottom actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={handleResetTodos} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.textSub }}>
                🔄 {t('Reset all', 'Скинути', 'Скинути')}
              </button>
              <button onClick={() => { setTodoForm({ text: '', textRu: '', category: 'other', week: 1 }); setView('addTodo') }} style={{ flex: 2, background: C.blue, border: 'none', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                + {t('Add custom task', 'Додати завдання', 'Додати завдання')}
              </button>
            </div>
          </>
        )}

        {/* ══ ADD TODO ══ */}
        {tab === 'todo' && view === 'addTodo' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>➕ {t('New Task', 'Нове завдання', 'Нове завдання')}</div>
            <FField label={t('Task (EN)', 'Задача (EN)')}><input value={todoForm.text} onChange={e => setTodoForm(f => ({ ...f, text: e.target.value }))} placeholder="e.g. Book GP appointment" style={inputStyle} /></FField>
            <FField label={t('Task (RU)', 'Задача (RU)')}><input value={todoForm.textRu} onChange={e => setTodoForm(f => ({ ...f, textRu: e.target.value }))} placeholder="напр. Записаться к врачу" style={inputStyle} /></FField>
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
                  <button key={c.id} onClick={() => setTodoForm(f => ({ ...f, category: c.id }))} style={{ background: todoForm.category === c.id ? c.color : C.bg, color: todoForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${todoForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '8px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 }}>
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
                  <button key={c.id} onClick={() => setTodoForm(f => ({ ...f, category: c.id }))} style={{ background: todoForm.category === c.id ? c.color : C.bg, color: todoForm.category === c.id ? '#fff' : C.textSub, border: `1.5px solid ${todoForm.category === c.id ? c.color : C.border}`, borderRadius: 10, padding: '8px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 }}>
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
        {tab === 'profile' && view === 'list' && (
          <>
            <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyM})`, borderRadius: 20, padding: '28px 24px 24px', marginBottom: 12, color: '#fff', textAlign: 'center' as const }}>
              <div style={{ fontSize: 60, marginBottom: 10 }}>{profile?.avatar ?? '👤'}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{profile?.name || user?.email?.split('@')[0]}</div>
              {profile?.name_ru && <div style={{ fontSize: 14, opacity: 0.6, marginTop: 2 }}>{profile.name_ru}</div>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14 }}>
                {profile?.dob && <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 11, opacity: 0.5 }}>{t('DOB', 'Дата народження', 'Дата народження')}</div><div style={{ fontWeight: 600, fontSize: 14 }}>{formatDate(profile.dob)}</div></div>}
                {profile?.nationality && <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 11, opacity: 0.5 }}>{t('Nationality', 'Громадянство', 'Громадянство')}</div><div style={{ fontWeight: 600, fontSize: 14 }}>{profile.nationality}</div></div>}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.4 }}>{user?.email}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <button onClick={() => { setProfForm(profile ?? {}); setView('editProfile') }} style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: C.navy }}>✏️ {t('Edit Profile', 'Редагувати', 'Редагувати')}</button>
              <button onClick={signOut} style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: C.red }}>🚪 {t('Sign Out', 'Вийти', 'Вийти')}</button>
            </div>

            <div style={{ background: C.surface, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12 }}>🔒 {t('Privacy & Security', 'Конфіденційність', 'Конфіденційність')}</div>
              {[
                { icon: '🔐', en: 'End-to-end encrypted data', ru: 'Данные защищены шифрованием' },
                { icon: '👁', en: 'Only you can see your documents', ru: 'Только ты видишь свои документы' },
                { icon: '☁️', en: 'Securely stored in Supabase cloud', ru: 'Хранится в защищённом облаке Supabase' },
                { icon: '🗑', en: 'Delete account removes all data', ru: 'Удаление аккаунта = удаление всех данных' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.4 }}>{lang === 'ru' ? item.ru : item.en}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ EDIT PROFILE ══ */}
        {tab === 'profile' && view === 'editProfile' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>✏️ {t('Edit Profile', 'Редагувати профіль', 'Редагувати профіль')}</div>
            <FField label={t('Avatar', 'Аватар', 'Аватар')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {AVATARS.map(a => <button key={a} onClick={() => setProfForm(f => ({ ...f, avatar: a }))} style={{ width: 44, height: 44, borderRadius: 10, fontSize: 24, border: `2px solid ${profForm.avatar === a ? C.navy : C.border}`, background: profForm.avatar === a ? C.bg : 'transparent', cursor: 'pointer' }}>{a}</button>)}
              </div>
            </FField>
            <FField label={t('Full name (EN)', 'Имя (EN)')}><input value={profForm.name ?? ''} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} placeholder="Sergii Palesika" style={inputStyle} /></FField>
            <FField label={t('Full name (RU)', 'Имя (RU)')}><input value={profForm.name_ru ?? ''} onChange={e => setProfForm(f => ({ ...f, name_ru: e.target.value }))} placeholder="Сергей Палесика" style={inputStyle} /></FField>
            <FField label={t('Date of Birth', 'Дата народження', 'Дата народження')}><input type="date" value={profForm.dob ?? ''} onChange={e => setProfForm(f => ({ ...f, dob: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Nationality', 'Громадянство', 'Громадянство')}>
              <select value={profForm.nationality ?? 'Ukrainian'} onChange={e => setProfForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle}>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </FField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('list')} style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: C.textSub, fontWeight: 600 }}>{t('Cancel', 'Скасувати', 'Скасувати')}</button>
              <button onClick={handleSaveProfile} disabled={saving} style={{ flex: 2, background: saving ? '#94a3b8' : C.navy, border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: 'pointer', color: '#fff', fontWeight: 700 }}>{saving ? '⏳' : t('Save', 'Зберегти', 'Зберегти')}</button>
            </div>
          </div>
        )}

      </div>
      {/* ══ BOTTOM TAB BAR ══ */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f4', boxShadow: '0 -4px 20px rgba(15,31,61,0.1)', zIndex: 90, display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: 'docs',     icon: '📂', en: 'Docs',      ru: 'Доки',    uk: 'Доки' },
          { id: 'passport', icon: '📘', en: 'Passport',  ru: 'Паспорт', uk: 'Паспорт' },
          { id: 'address',  icon: '📍', en: 'Addresses', ru: 'Адреси',  uk: 'Адреси' },
          { id: 'todo',     icon: '✅', en: 'Tasks',     ru: 'Задачі',  uk: 'Завдання' },
          { id: 'profile',  icon: '👤', en: 'Profile',   ru: 'Профіль', uk: 'Профіль' },
        ] as { id: MainTab; icon: string; en: string; ru: string; uk: string }[]).map(tb => (
          <button key={tb.id} onClick={() => switchTab(tb.id)} style={{
            flex: 1, background: 'transparent', border: 'none', padding: '10px 4px 8px',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: tab === tb.id ? '#0f1f3d' : '#a0aec0',
            transition: 'color 0.15s',
          }}>
            <div style={{ fontSize: 22, lineHeight: 1, filter: tab === tb.id ? 'none' : 'grayscale(60%)' }}>{tb.icon}</div>
            <div style={{ fontSize: 10, fontWeight: tab === tb.id ? 700 : 500, letterSpacing: '0.02em' }}>
              {lang === 'uk' ? tb.uk : lang === 'ru' ? tb.ru : tb.en}
            </div>
            {tab === tb.id && <div style={{ width: 20, height: 3, borderRadius: 2, background: '#0f1f3d', marginTop: 1 }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

function DocCard({ doc, cat, lang, onOpen }: { doc: Doc; cat: { icon: string; color: string }; lang: Lang; onOpen: () => void }) {
  const title = lang === 'ru' && doc.title_ru ? doc.title_ru : doc.title
  return (
    <div onClick={onOpen} style={{ background: '#fff', borderRadius: 14, marginBottom: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,31,61,0.06)', borderLeft: `4px solid ${cat.color}` }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a202c', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' as const }}>
          {doc.pinned && <span style={{ fontSize: 10 }}>📌</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{title}</span>
          {doc.valid_until && <ExpiryBadge d={doc.valid_until} />}
        </div>
        {doc.number && <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#4a5568', fontWeight: 600, letterSpacing: '0.04em' }}>{doc.number}</div>}
        {doc.valid_until && <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{lang !== 'en' ? 'до' : 'until'} {formatDate(doc.valid_until)}</div>}
        {(doc.document_photos?.length ?? 0) > 0 && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>📸 {doc.document_photos!.length} {lang !== 'en' ? 'фото' : 'photo(s)'}</div>
        )}
      </div>
      <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
    </div>
  )
}
