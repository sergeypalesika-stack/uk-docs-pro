'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Doc, Profile, Passport, PassportPhoto } from '@/lib/types'
import {
  CATEGORIES, DEFAULT_DOCS, DEFAULT_TODOS, DEFAULT_PROFILE,
  EMPTY_DOC, EMPTY_PASSPORT, NATIONALITIES, AVATARS, TodoItem
} from '@/lib/data'
import { daysUntil, formatDate, generateId, getExpiryStatus } from '@/lib/utils'

// ── STORAGE
const SK = {
  profiles:  'uk_profiles_v1',
  docs:      'uk_docs_v4',
  passports: 'uk_passports_v1',
  todos:     'uk_todos_v2',
  lang:      'uk_lang',
  profile:   'uk_active_profile',
}

// ── COLORS
const C = {
  navy:   '#0f1f3d', navyM: '#1a2e50',
  blue:   '#2457a4', accent: '#3b82f6',
  surface:'#ffffff', bg: '#f1f5fb',
  border: '#e2e8f4', muted: '#7a8aaa',
  text:   '#1a2035', textSub: '#4a5570',
  green:  '#16a34a', red: '#dc2626',
}

type Lang = 'en' | 'ru'
type MainTab = 'docs' | 'passport' | 'todo' | 'profile'
type View = 'list' | 'detail' | 'add' | 'addPassport' | 'passportDetail' | 'editProfile' | 'selectProfile'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 10,
  border: `1.5px solid ${C.border}`, fontSize: 14,
  color: C.text, outline: 'none', background: C.bg,
}

// ── HELPERS
function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const st = getExpiryStatus(dateStr)
  if (!st) return null
  return <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{st.label}</span>
}

function CopyBtn({ value, lang }: { value: string; lang: Lang }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      style={{ background: copied ? '#dcfce7' : C.bg, color: copied ? '#166534' : C.blue, border: `1.5px solid ${copied ? '#86efac' : C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
      {copied ? '✓' : '⎘'} {copied ? (lang === 'ru' ? 'Скопировано' : 'Copied') : (lang === 'ru' ? 'Копировать' : 'Copy')}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>{children}</div>
}

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function Btn({ onClick, children, variant = 'primary', disabled = false, full = false }: {
  onClick: () => void; children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean; full?: boolean
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: C.navy, color: '#fff', border: 'none' },
    secondary: { background: C.bg, color: C.textSub, border: `1.5px solid ${C.border}` },
    danger:    { background: '#fee2e2', color: C.red, border: `1.5px solid #fca5a5` },
    ghost:     { background: 'transparent', color: C.blue, border: 'none' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], borderRadius: 10, padding: '12px 16px',
      fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      width: full ? '100%' : undefined, opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  )
}

// ── MAIN COMPONENT
export default function Page() {
  const [profiles,  setProfiles]  = useState<Profile[]>([DEFAULT_PROFILE])
  const [activeId,  setActiveId]  = useState<string>('default')
  const [docs,      setDocs]      = useState<Doc[]>(DEFAULT_DOCS)
  const [passports, setPassports] = useState<Passport[]>([])
  const [todos,     setTodos]     = useState<TodoItem[]>(DEFAULT_TODOS)
  const [lang,      setLang]      = useState<Lang>('ru')
  const [tab,       setTab]       = useState<MainTab>('docs')
  const [view,      setView]      = useState<View>('list')
  const [selected,  setSelected]  = useState<Doc | null>(null)
  const [selPass,   setSelPass]   = useState<Passport | null>(null)
  const [filterCat, setFilterCat] = useState('all')
  const [search,    setSearch]    = useState('')
  const [docForm,   setDocForm]   = useState<Omit<Doc, 'id' | 'profileId'>>(EMPTY_DOC)
  const [passForm,  setPassForm]  = useState<Omit<Passport, 'id' | 'profileId'>>(EMPTY_PASSPORT)
  const [profForm,  setProfForm]  = useState<Profile>(DEFAULT_PROFILE)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [loaded,    setLoaded]    = useState(false)
  const [photoViewer, setPhotoViewer] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const passPhotoRef = useRef<HTMLInputElement>(null)

  const activeProfile = profiles.find(p => p.id === activeId) ?? profiles[0]

  useEffect(() => {
    try {
      const p = localStorage.getItem(SK.profiles); if (p) setProfiles(JSON.parse(p))
      const d = localStorage.getItem(SK.docs);     if (d) setDocs(JSON.parse(d))
      const ps = localStorage.getItem(SK.passports); if (ps) setPassports(JSON.parse(ps))
      const t = localStorage.getItem(SK.todos);    if (t) setTodos(JSON.parse(t))
      const l = localStorage.getItem(SK.lang) as Lang; if (l) setLang(l)
      const a = localStorage.getItem(SK.profile);  if (a) setActiveId(a)
    } catch (_) {}
    setLoaded(true)
  }, [])

  const save = useCallback((key: string, val: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch (_) {}
  }, [])

  const saveProfiles  = (v: Profile[])  => { setProfiles(v);  save(SK.profiles, v) }
  const saveDocs      = (v: Doc[])      => { setDocs(v);      save(SK.docs, v) }
  const savePassports = (v: Passport[]) => { setPassports(v); save(SK.passports, v) }
  const saveTodos     = (v: TodoItem[]) => { setTodos(v);     save(SK.todos, v) }

  const switchLang = () => { const nl = lang === 'ru' ? 'en' : 'ru'; setLang(nl); save(SK.lang, nl) }
  const switchTab  = (t: MainTab) => { setTab(t); setView('list'); setSelected(null); setSelPass(null); setSearch('') }
  const switchProfile = (id: string) => { setActiveId(id); save(SK.profile, id); setView('list') }

  const t = useCallback((en: string, ru: string) => lang === 'ru' ? ru : en, [lang])
  const cat = (id: string) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]

  // ── Profile docs/passports
  const myDocs      = docs.filter(d => d.profileId === activeId)
  const myPassports = passports.filter(p => p.profileId === activeId)
  const myTodos     = todos

  const expiring60 = myDocs.filter(d => { const x = daysUntil(d.validUntil); return x !== null && x >= 0 && x <= 60 })
  const todoDone   = myTodos.filter(d => d.done).length

  const filteredDocs = myDocs.filter(d => {
    const matchCat = filterCat === 'all' || d.category === filterCat
    const q = search.toLowerCase()
    return matchCat && (!q || d.title.toLowerCase().includes(q) || d.titleRu.toLowerCase().includes(q) || d.number.toLowerCase().includes(q))
  })
  const pinned = filteredDocs.filter(d => d.pinned)
  const rest   = filteredDocs.filter(d => !d.pinned)

  // ── DOC actions
  const addDoc = () => {
    const nd = [...docs, { ...docForm, id: generateId(), profileId: activeId }]
    saveDocs(nd); setDocForm(EMPTY_DOC); switchTab('docs')
  }
  const deleteDoc = (id: string) => {
    saveDocs(docs.filter(d => d.id !== id))
    setConfirmDel(null); setSelected(null); setView('list')
  }
  const togglePin = (id: string) => {
    const nd = docs.map(d => d.id === id ? { ...d, pinned: !d.pinned } : d)
    saveDocs(nd)
    if (selected?.id === id) setSelected(nd.find(d => d.id === id) ?? null)
  }

  // ── PASSPORT actions
  const addPassport = () => {
    const np = [...passports, { ...passForm, id: generateId(), profileId: activeId }]
    savePassports(np); setPassForm(EMPTY_PASSPORT); switchTab('passport')
  }
  const deletePassport = (id: string) => {
    savePassports(passports.filter(p => p.id !== id))
    setConfirmDel(null); setSelPass(null); setView('list')
  }
  const addPhotoToPassport = (passportId: string, dataUrl: string, label: string) => {
    const photo: PassportPhoto = { id: generateId(), label, labelRu: label, dataUrl, addedAt: new Date().toISOString() }
    const np = passports.map(p => p.id === passportId ? { ...p, photos: [...p.photos, photo] } : p)
    savePassports(np)
    const updated = np.find(p => p.id === passportId) ?? null
    setSelPass(updated)
  }
  const removePhoto = (passportId: string, photoId: string) => {
    const np = passports.map(p => p.id === passportId ? { ...p, photos: p.photos.filter(ph => ph.id !== photoId) } : p)
    savePassports(np)
    setSelPass(np.find(p => p.id === passportId) ?? null)
  }

  // ── PROFILE actions
  const createProfile = () => {
    const np = { ...profForm, id: generateId(), createdAt: new Date().toISOString() }
    saveProfiles([...profiles, np])
    saveTodos(DEFAULT_TODOS.map(t => ({ ...t, done: false })))
    switchProfile(np.id)
    setView('list')
  }
  const updateProfile = () => {
    saveProfiles(profiles.map(p => p.id === activeId ? profForm : p))
    setView('list')
  }
  const deleteProfile = (id: string) => {
    if (profiles.length <= 1) return
    const np = profiles.filter(p => p.id !== id)
    saveProfiles(np)
    saveDocs(docs.filter(d => d.profileId !== id))
    savePassports(passports.filter(p => p.profileId !== id))
    switchProfile(np[0].id)
  }

  // ── TODO
  const toggleTodo = (id: string) => saveTodos(myTodos.map(t => t.id === id ? { ...t, done: !t.done } : t))

  // ── Photo upload helper
  const handleFileUpload = (file: File, onDone: (dataUrl: string) => void) => {
    const reader = new FileReader()
    reader.onload = e => { if (e.target?.result) onDone(e.target.result as string) }
    reader.readAsDataURL(file)
  }

  if (!loaded) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ color: C.muted }}>Loading…</div>
    </div>
  )

  // ── PHOTO VIEWER MODAL
  if (photoViewer) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => setPhotoViewer(null)}>
      <img src={photoViewer} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 16 }}>{t('Tap to close', 'Нажми чтобы закрыть')}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>

      {/* ══ HEADER ══ */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyM} 100%)`, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              🇬🇧
            </div>
            {/* Profile switcher */}
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setView('selectProfile')}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{activeProfile?.avatar}</span>
                <span>{activeProfile?.name}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>▾</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {t('Tap to switch', 'Нажми чтобы сменить')}
              </div>
            </div>
            <button onClick={switchLang} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '5px 11px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingBottom: 12 }}>
            {[
              { icon: '📄', val: myDocs.length,      en: 'Documents',   ru: 'Документов' },
              { icon: '⚠️', val: expiring60.length,   en: 'Expiring',    ru: 'Истекает', warn: expiring60.length > 0 },
              { icon: '✅', val: `${todoDone}/${myTodos.length}`, en: 'Tasks', ru: 'Задач' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.warn ? 'rgba(234,88,12,0.2)' : 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px', textAlign: 'center', border: s.warn ? '1px solid rgba(234,88,12,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{s.icon} {lang === 'ru' ? s.ru : s.en}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.warn ? '#fb923c' : '#fff' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, paddingBottom: 12 }}>
            {([
              { id: 'docs',     icon: '📂', en: 'Documents', ru: 'Документы' },
              { id: 'passport', icon: '📘', en: 'Passports',  ru: 'Паспорта' },
              { id: 'todo',     icon: '✅', en: 'Tasks',      ru: 'Задачи' },
              { id: 'profile',  icon: '👤', en: 'Profile',    ru: 'Профиль' },
            ] as { id: MainTab; icon: string; en: string; ru: string }[]).map(tb => (
              <button key={tb.id} onClick={() => switchTab(tb.id)} style={{
                flex: 1, background: tab === tb.id ? 'rgba(255,255,255,0.18)' : 'transparent',
                border: tab === tb.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                borderRadius: 10, padding: '7px 4px', color: tab === tb.id ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: 11, fontWeight: tab === tb.id ? 700 : 500, cursor: 'pointer',
              }}>
                <div>{tb.icon}</div>
                <div>{lang === 'ru' ? tb.ru : tb.en}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SELECT PROFILE OVERLAY ══ */}
      {view === 'selectProfile' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setView('list')}>
          <div style={{ background: C.surface, width: '100%', borderRadius: '20px 20px 0 0', padding: 24, maxHeight: '70vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>
              👤 {t('Select Profile', 'Выбрать профиль')}
            </div>
            {profiles.map(p => (
              <div key={p.id} onClick={() => switchProfile(p.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                background: p.id === activeId ? C.navy : C.bg,
                color: p.id === activeId ? '#fff' : C.text,
              }}>
                <span style={{ fontSize: 28 }}>{p.avatar}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{p.nationality} · {formatDate(p.dob)}</div>
                </div>
                {p.id === activeId && <span style={{ fontSize: 18 }}>✓</span>}
              </div>
            ))}
            <button onClick={() => { setProfForm({ id: '', name: '', nameRu: '', dob: '', nationality: 'Ukrainian', avatar: '👤', createdAt: '' }); setView('editProfile') }}
              style={{ width: '100%', background: C.accent, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
              + {t('Add New Profile', 'Добавить новый профиль')}
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 100px' }}>

        {/* ══════════ DOCS TAB ══════════ */}
        {tab === 'docs' && view === 'list' && (
          <>
            {expiring60.length > 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>⚠️ {t('Expiring soon', 'Истекает скоро')}</div>
                {expiring60.map(d => (
                  <div key={d.id} style={{ fontSize: 12, color: '#7c2d12', marginBottom: 2 }}>
                    · {lang === 'ru' && d.titleRu ? d.titleRu : d.title} — {daysUntil(d.validUntil)}d
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('Search…', 'Поиск…')} style={{ ...inputStyle, paddingLeft: 36 }} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}>×</button>}
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 14, scrollbarWidth: 'none' }}>
              {[{ id: 'all', label: 'All', labelRu: 'Все', icon: '📂', color: C.navy }, ...CATEGORIES].map(c => (
                <button key={c.id} onClick={() => setFilterCat(c.id)} style={{
                  flexShrink: 0, background: filterCat === c.id ? c.color : C.surface,
                  color: filterCat === c.id ? '#fff' : C.textSub,
                  border: `1.5px solid ${filterCat === c.id ? c.color : C.border}`,
                  borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {c.icon} {lang === 'ru' ? c.labelRu : c.label}
                </button>
              ))}
            </div>

            {pinned.length > 0 && (
              <><SectionLabel>📌 {t('Pinned', 'Закреплённые')}</SectionLabel>
                {pinned.map(d => <DocCard key={d.id} doc={d} cat={cat(d.category)} lang={lang} onOpen={() => { setSelected(d); setView('detail') }} />)}
                <div style={{ height: 8 }} /></>
            )}
            {rest.map(d => <DocCard key={d.id} doc={d} cat={cat(d.category)} lang={lang} onOpen={() => { setSelected(d); setView('detail') }} />)}

            {filteredDocs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <div style={{ fontSize: 14 }}>{t('No documents', 'Нет документов')}</div>
              </div>
            )}

            {/* FAB add button */}
            <button onClick={() => { setDocForm(EMPTY_DOC); setView('add') }} style={{
              position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28,
              background: C.navy, color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(15,31,61,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </>
        )}

        {/* ══ DOC DETAIL ══ */}
        {tab === 'docs' && view === 'detail' && selected && (() => {
          const c = cat(selected.category)
          return (
            <>
              <button onClick={() => { setView('list'); setSelected(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>
                ← {t('Back', 'Назад')}
              </button>
              <div style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)`, borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff', boxShadow: `0 8px 30px ${c.color}40` }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{lang === 'ru' && selected.titleRu ? selected.titleRu : selected.title}</div>
              </div>
              <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '20px 22px', marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {selected.number && (
                  <DRow label={t('Number / Code', 'Номер / Код')}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, letterSpacing: '0.07em', color: C.navy }}>{selected.number}</span>
                      <CopyBtn value={selected.number} lang={lang} />
                    </div>
                  </DRow>
                )}
                {selected.validFrom && <DRow label={t('Valid from', 'Действует с')}>{formatDate(selected.validFrom)}</DRow>}
                {selected.validUntil && (
                  <DRow label={t('Valid until', 'Действует до')}>
                    <span>{formatDate(selected.validUntil)}</span><ExpiryBadge dateStr={selected.validUntil} />
                  </DRow>
                )}
                {(selected.notes || selected.notesRu) && (
                  <DRow label={t('Notes', 'Заметки')}>
                    <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.65 }}>{lang === 'ru' && selected.notesRu ? selected.notesRu : selected.notes}</span>
                  </DRow>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Btn onClick={() => togglePin(selected.id)} variant="secondary">{selected.pinned ? `📌 ${t('Unpin', 'Открепить')}` : `📌 ${t('Pin', 'Закрепить')}`}</Btn>
                <Btn onClick={() => setConfirmDel(selected.id)} variant="danger">🗑 {t('Delete', 'Удалить')}</Btn>
              </div>
              {confirmDel === selected.id && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, marginBottom: 14 }}>{t('Delete?', 'Удалить?')}</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Btn onClick={() => setConfirmDel(null)} variant="secondary">{t('Cancel', 'Отмена')}</Btn>
                    <Btn onClick={() => deleteDoc(selected.id)} variant="danger">{t('Delete', 'Удалить')}</Btn>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* ══ ADD DOC ══ */}
        {tab === 'docs' && view === 'add' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>➕ {t('New Document', 'Новый документ')}</div>
            <FField label={t('Category', 'Категория')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setDocForm(f => ({ ...f, category: c.id }))} style={{
                    background: docForm.category === c.id ? c.color : C.bg, color: docForm.category === c.id ? '#fff' : C.textSub,
                    border: `1.5px solid ${docForm.category === c.id ? c.color : C.border}`,
                    borderRadius: 10, padding: '10px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}>
                    <span style={{ fontSize: 20 }}>{c.icon}</span>
                    <span>{lang === 'ru' ? c.labelRu : c.label}</span>
                  </button>
                ))}
              </div>
            </FField>
            <FField label={t('Title (EN)', 'Название (EN)')}><input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. CSCS Green Card" style={inputStyle} /></FField>
            <FField label={t('Title (RU)', 'Название (RU)')}><input value={docForm.titleRu} onChange={e => setDocForm(f => ({ ...f, titleRu: e.target.value }))} placeholder="напр. Карта CSCS" style={inputStyle} /></FField>
            <FField label={t('Number / Code', 'Номер / Код')}><input value={docForm.number} onChange={e => setDocForm(f => ({ ...f, number: e.target.value }))} placeholder="e.g. WZL F8D 7A4" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16 }} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('Valid from', 'С')}><input type="date" value={docForm.validFrom} onChange={e => setDocForm(f => ({ ...f, validFrom: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Valid until', 'До')}><input type="date" value={docForm.validUntil} onChange={e => setDocForm(f => ({ ...f, validUntil: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes (EN)', 'Заметки (EN)')}><textarea value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <FField label={t('Notes (RU)', 'Заметки (RU)')}><textarea value={docForm.notesRu} onChange={e => setDocForm(f => ({ ...f, notesRu: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }} onClick={() => setDocForm(f => ({ ...f, pinned: !f.pinned }))}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: docForm.pinned ? C.blue : 'transparent', border: docForm.pinned ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>{docForm.pinned ? '✓' : ''}</div>
              <span style={{ fontSize: 13, color: C.textSub }}>📌 {t('Pin this document', 'Закрепить документ')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => switchTab('docs')} variant="secondary">{t('Cancel', 'Отмена')}</Btn>
              <button onClick={addDoc} disabled={!docForm.title} style={{ flex: 2, background: docForm.title ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: docForm.title ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{t('Save', 'Сохранить')}</button>
            </div>
          </div>
        )}

        {/* ══════════ PASSPORT TAB ══════════ */}
        {tab === 'passport' && view === 'list' && (
          <>
            {myPassports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
                <div style={{ fontSize: 50, marginBottom: 12 }}>📘</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t('No passports added', 'Паспорта не добавлены')}</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>{t('Add your passport with photos', 'Добавь паспорт с фотографиями страниц')}</div>
              </div>
            ) : (
              myPassports.map(p => (
                <div key={p.id} onClick={() => { setSelPass(p); setView('passportDetail') }} style={{
                  background: C.surface, borderRadius: 14, marginBottom: 10, padding: '16px 18px',
                  cursor: 'pointer', boxShadow: '0 1px 6px rgba(15,31,61,0.07)', borderLeft: `4px solid #0369a1`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📘</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{p.type}</div>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', color: C.textSub, fontWeight: 600 }}>{p.number || '—'}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        {p.photos.length} {t('photos', 'фото')} · {p.expiryDate ? `${t('exp', 'до')} ${formatDate(p.expiryDate)}` : t('no expiry set', 'срок не указан')}
                        {p.expiryDate && <ExpiryBadge dateStr={p.expiryDate} />}
                      </div>
                    </div>
                    <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
                  </div>
                </div>
              ))
            )}
            <button onClick={() => { setPassForm(EMPTY_PASSPORT); setView('addPassport') }} style={{
              position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28,
              background: '#0369a1', color: '#fff', border: 'none', fontSize: 28, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(3,105,161,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </>
        )}

        {/* ══ ADD PASSPORT ══ */}
        {tab === 'passport' && view === 'addPassport' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📘 {t('Add Passport', 'Добавить паспорт')}</div>
            <FField label={t('Passport type', 'Тип паспорта')}>
              <select value={passForm.type} onChange={e => setPassForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle }}>
                {['Ukrainian Passport', 'Ukrainian ID Card', 'UK BRP Card', 'UK Passport', 'EU Passport', 'Other'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </FField>
            <FField label={t('Passport number', 'Номер паспорта')}><input value={passForm.number} onChange={e => setPassForm(f => ({ ...f, number: e.target.value }))} placeholder="e.g. AA123456" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.06em' }} /></FField>
            <FField label={t('Issued by', 'Кем выдан')}><input value={passForm.issuedBy} onChange={e => setPassForm(f => ({ ...f, issuedBy: e.target.value }))} placeholder={t('e.g. Ministry of Internal Affairs', 'напр. МВД Украины')} style={inputStyle} /></FField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FField label={t('Issued date', 'Дата выдачи')}><input type="date" value={passForm.issuedDate} onChange={e => setPassForm(f => ({ ...f, issuedDate: e.target.value }))} style={inputStyle} /></FField>
              <FField label={t('Expiry date', 'Срок действия')}><input type="date" value={passForm.expiryDate} onChange={e => setPassForm(f => ({ ...f, expiryDate: e.target.value }))} style={inputStyle} /></FField>
            </div>
            <FField label={t('Notes', 'Заметки')}><textarea value={passForm.notes} onChange={e => setPassForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder={t('Any notes…', 'Заметки…')} style={{ ...inputStyle, resize: 'vertical' }} /></FField>
            <div style={{ background: '#f0f9ff', border: '1px dashed #7dd3fc', borderRadius: 10, padding: 14, marginBottom: 20, textAlign: 'center', fontSize: 13, color: '#0369a1' }}>
              📸 {t('You can add photos after saving', 'Фото можно добавить после сохранения')}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => switchTab('passport')} variant="secondary">{t('Cancel', 'Отмена')}</Btn>
              <button onClick={addPassport} disabled={!passForm.number} style={{ flex: 2, background: passForm.number ? '#0369a1' : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: passForm.number ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>{t('Save Passport', 'Сохранить паспорт')}</button>
            </div>
          </div>
        )}

        {/* ══ PASSPORT DETAIL ══ */}
        {tab === 'passport' && view === 'passportDetail' && selPass && (() => {
          let photoLabelInput = ''
          return (
            <>
              <button onClick={() => { setView('list'); setSelPass(null) }} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 5 }}>
                ← {t('Back', 'Назад')}
              </button>

              {/* Header card */}
              <div style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)', borderRadius: 20, padding: '24px 24px 20px', marginBottom: 3, color: '#fff' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📘</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{selPass.type}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: '0.1em', marginTop: 6, opacity: 0.9 }}>{selPass.number}</div>
              </div>

              <div style={{ background: C.surface, borderRadius: '0 0 20px 20px', padding: '20px 22px', marginBottom: 12 }}>
                {selPass.issuedBy    && <DRow label={t('Issued by', 'Кем выдан')}>{selPass.issuedBy}</DRow>}
                {selPass.issuedDate  && <DRow label={t('Issued', 'Дата выдачи')}>{formatDate(selPass.issuedDate)}</DRow>}
                {selPass.expiryDate  && <DRow label={t('Expires', 'Срок действия')}><span>{formatDate(selPass.expiryDate)}</span><ExpiryBadge dateStr={selPass.expiryDate} /></DRow>}
                {selPass.notes       && <DRow label={t('Notes', 'Заметки')}><span style={{ fontSize: 13, color: C.textSub }}>{selPass.notes}</span></DRow>}
                <DRow label={t('Passport number', 'Номер паспорта')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 800, color: C.navy }}>{selPass.number}</span>
                    <CopyBtn value={selPass.number} lang={lang} />
                  </div>
                </DRow>
              </div>

              {/* Photos section */}
              <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>
                  📸 {t('Document Photos', 'Фото страниц')} ({selPass.photos.length})
                </div>

                {selPass.photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {selPass.photos.map(ph => (
                      <div key={ph.id} style={{ position: 'relative' }}>
                        <img src={ph.dataUrl} alt={ph.label} onClick={() => setPhotoViewer(ph.dataUrl)}
                          style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.border}` }} />
                        <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, fontWeight: 600 }}>{ph.label}</div>
                        <button onClick={() => removePhoto(selPass.id, ph.id)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 99, width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add photo */}
                <div style={{ background: C.bg, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>
                    {t('Add page photo', 'Добавить фото страницы')}
                  </div>
                  <input
                    placeholder={t('Label (e.g. Main page)', 'Подпись (напр. Главная страница)')}
                    style={{ ...inputStyle, marginBottom: 8, fontSize: 13 }}
                    onChange={e => { photoLabelInput = e.target.value }}
                    id={`photo-label-${selPass.id}`}
                  />
                  <input ref={passPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const labelEl = document.getElementById(`photo-label-${selPass.id}`) as HTMLInputElement
                      const label = labelEl?.value || t('Page', 'Страница')
                      handleFileUpload(file, dataUrl => addPhotoToPassport(selPass.id, dataUrl, label))
                      if (passPhotoRef.current) passPhotoRef.current.value = ''
                    }}
                  />
                  <button onClick={() => passPhotoRef.current?.click()} style={{ width: '100%', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    📷 {t('Take / Choose Photo', 'Сфотографировать / Выбрать')}
                  </button>
                </div>
              </div>

              <Btn onClick={() => setConfirmDel(selPass.id)} variant="danger" full>🗑 {t('Delete Passport', 'Удалить паспорт')}</Btn>
              {confirmDel === selPass.id && (
                <div style={{ background: '#fee2e2', borderRadius: 12, padding: 16, marginTop: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, marginBottom: 12 }}>{t('Delete this passport?', 'Удалить этот паспорт?')}</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Btn onClick={() => setConfirmDel(null)} variant="secondary">{t('Cancel', 'Отмена')}</Btn>
                    <Btn onClick={() => deletePassport(selPass.id)} variant="danger">{t('Delete', 'Удалить')}</Btn>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* ══════════ TODO TAB ══════════ */}
        {tab === 'todo' && (
          <>
            <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{t('Progress', 'Прогресс')}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{todoDone}/{myTodos.length}</span>
              </div>
              <div style={{ background: C.bg, borderRadius: 99, height: 10, overflow: 'hidden' }}>
                <div style={{ background: `linear-gradient(90deg, ${C.accent}, #22c55e)`, height: '100%', borderRadius: 99, width: `${myTodos.length ? (todoDone / myTodos.length * 100) : 0}%`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{myTodos.length - todoDone} {t('remaining', 'осталось')}</div>
            </div>

            {Array.from(new Set(myTodos.map(t => t.week))).sort((a, b) => a - b).map(w => {
              const wLabels: Record<number, { en: string; ru: string }> = { 0: { en: 'Before Arriving', ru: 'До приезда' }, 1: { en: 'Week 1', ru: 'Неделя 1' }, 2: { en: 'Week 2', ru: 'Неделя 2' }, 3: { en: 'Week 3', ru: 'Неделя 3' }, 4: { en: 'Week 4', ru: 'Неделя 4' }, 5: { en: 'Week 5', ru: 'Неделя 5' }, 6: { en: 'Week 6', ru: 'Неделя 6' } }
              const items = myTodos.filter(t => t.week === w)
              const doneH = items.filter(t => t.done).length
              return (
                <div key={w} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.blue }}>{lang === 'ru' ? wLabels[w]?.ru : wLabels[w]?.en}</div>
                    <span style={{ fontSize: 11, color: C.muted }}>{doneH}/{items.length}</span>
                  </div>
                  <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden' }}>
                    {items.map((item, i) => (
                      <div key={item.id} onClick={() => toggleTodo(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', background: item.done ? '#f0fdf4' : C.surface }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: item.done ? '#22c55e' : 'transparent', border: item.done ? 'none' : `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', transition: 'all 0.2s' }}>{item.done ? '✓' : ''}</div>
                        <div style={{ flex: 1, fontSize: 13, color: item.done ? '#4ade80' : C.text, textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{lang === 'ru' ? item.textRu : item.text}</div>
                        <span style={{ fontSize: 15 }}>{CATEGORIES.find(c => c.id === item.category)?.icon ?? '📁'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <Btn onClick={() => saveTodos(DEFAULT_TODOS.map(t => ({ ...t, done: false })))} variant="secondary" full>🔄 {t('Reset all', 'Сбросить всё')}</Btn>
          </>
        )}

        {/* ══════════ PROFILE TAB ══════════ */}
        {tab === 'profile' && view === 'list' && (
          <>
            {/* Current profile card */}
            <div style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyM})`, borderRadius: 20, padding: '24px 24px 20px', marginBottom: 12, color: '#fff' }}>
              <div style={{ fontSize: 52, marginBottom: 10, textAlign: 'center' }}>{activeProfile?.avatar}</div>
              <div style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>{activeProfile?.name}</div>
              {activeProfile?.nameRu && <div style={{ fontSize: 15, opacity: 0.6, textAlign: 'center' }}>{activeProfile.nameRu}</div>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>{t('Date of Birth', 'Дата рождения')}</div>
                  <div style={{ fontWeight: 600 }}>{formatDate(activeProfile?.dob ?? '')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>{t('Nationality', 'Гражданство')}</div>
                  <div style={{ fontWeight: 600 }}>{activeProfile?.nationality}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <Btn onClick={() => { setProfForm(activeProfile!); setView('editProfile') }} variant="secondary">✏️ {t('Edit', 'Редактировать')}</Btn>
              <Btn onClick={() => setView('selectProfile')} variant="secondary">👥 {t('Switch', 'Сменить')}</Btn>
              {profiles.length > 1 && <Btn onClick={() => deleteProfile(activeId)} variant="danger">🗑</Btn>}
            </div>

            {/* All profiles list */}
            <SectionLabel>👥 {t('All Profiles', 'Все профили')}</SectionLabel>
            {profiles.map(p => (
              <div key={p.id} style={{ background: C.surface, borderRadius: 12, marginBottom: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `4px solid ${p.id === activeId ? C.navy : C.border}` }} onClick={() => switchProfile(p.id)}>
                <span style={{ fontSize: 28 }}>{p.avatar}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{p.nationality} · {docs.filter(d => d.profileId === p.id).length} {t('docs', 'доков')}</div>
                </div>
                {p.id === activeId && <span style={{ color: C.navy, fontWeight: 700 }}>✓</span>}
              </div>
            ))}

            <button onClick={() => { setProfForm({ id: '', name: '', nameRu: '', dob: '', nationality: 'Ukrainian', avatar: '👤', createdAt: '' }); setView('editProfile') }}
              style={{ width: '100%', background: C.bg, border: `1.5px dashed ${C.border}`, borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: C.blue, marginTop: 8 }}>
              + {t('Add New Profile', 'Добавить новый профиль')}
            </button>
          </>
        )}

        {/* ══ EDIT / CREATE PROFILE ══ */}
        {tab === 'profile' && view === 'editProfile' && (
          <div style={{ background: C.surface, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 20 }}>
              {profForm.id ? `✏️ ${t('Edit Profile', 'Редактировать профиль')}` : `👤 ${t('New Profile', 'Новый профиль')}`}
            </div>

            {/* Avatar picker */}
            <FField label={t('Avatar', 'Аватар')}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setProfForm(f => ({ ...f, avatar: a }))} style={{ width: 44, height: 44, borderRadius: 10, fontSize: 24, border: `2px solid ${profForm.avatar === a ? C.navy : C.border}`, background: profForm.avatar === a ? C.bg : 'transparent', cursor: 'pointer' }}>{a}</button>
                ))}
              </div>
            </FField>

            <FField label={t('Full name (English)', 'Имя (English)')}><input value={profForm.name} onChange={e => setProfForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ivan Petrenko" style={inputStyle} /></FField>
            <FField label={t('Full name (Russian/Ukrainian)', 'Имя (RU/UA)')}><input value={profForm.nameRu} onChange={e => setProfForm(f => ({ ...f, nameRu: e.target.value }))} placeholder="напр. Иван Петренко" style={inputStyle} /></FField>
            <FField label={t('Date of Birth', 'Дата рождения')}><input type="date" value={profForm.dob} onChange={e => setProfForm(f => ({ ...f, dob: e.target.value }))} style={inputStyle} /></FField>
            <FField label={t('Nationality', 'Гражданство')}>
              <select value={profForm.nationality} onChange={e => setProfForm(f => ({ ...f, nationality: e.target.value }))} style={inputStyle}>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </FField>

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => setView('list')} variant="secondary">{t('Cancel', 'Отмена')}</Btn>
              <button onClick={profForm.id ? updateProfile : createProfile} disabled={!profForm.name}
                style={{ flex: 2, background: profForm.name ? C.navy : '#cbd5e0', border: 'none', borderRadius: 10, padding: 14, fontSize: 14, cursor: profForm.name ? 'pointer' : 'not-allowed', color: '#fff', fontWeight: 700 }}>
                {profForm.id ? t('Save Changes', 'Сохранить') : t('Create Profile', 'Создать профиль')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── SUB-COMPONENTS
function DocCard({ doc, cat, lang, onOpen }: { doc: Doc; cat: { icon: string; color: string; label: string; labelRu: string }; lang: Lang; onOpen: () => void }) {
  const title = lang === 'ru' && doc.titleRu ? doc.titleRu : doc.title
  return (
    <div onClick={onOpen} style={{ background: '#fff', borderRadius: 14, marginBottom: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 1px 4px rgba(15,31,61,0.06)', borderLeft: `4px solid ${cat.color}` }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a202c', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {doc.pinned && <span style={{ fontSize: 10 }}>📌</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          {doc.validUntil && <ExpiryBadge dateStr={doc.validUntil} />}
        </div>
        {doc.number && <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#4a5568', fontWeight: 600, letterSpacing: '0.04em' }}>{doc.number}</div>}
        {doc.validUntil && <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{lang === 'ru' ? 'до' : 'until'} {formatDate(doc.validUntil)}</div>}
      </div>
      <div style={{ color: '#cbd5e0', fontSize: 20 }}>›</div>
    </div>
  )
}

function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid #f0f4f8`, paddingBottom: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a8aaa', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1a2035', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  )
}
