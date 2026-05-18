'use client'

import { useState, useEffect, useCallback } from 'react'
import { Doc } from '@/lib/types'
import { CATEGORIES, DEFAULT_DOCS, DEFAULT_TODOS, EMPTY_FORM, TodoItem } from '@/lib/data'
import { daysUntil, formatDate, generateId, getExpiryStatus } from '@/lib/utils'

// ── STORAGE KEYS
const DOCS_KEY  = 'uk_docs_v3'
const TODOS_KEY = 'uk_todos_v1'
const LANG_KEY  = 'uk_lang'
const TAB_KEY   = 'uk_tab'

// ── STYLE TOKENS
const C = {
  navy:    '#0f1f3d',
  navyM:   '#1a2e50',
  blue:    '#2457a4',
  accent:  '#3b82f6',
  surface: '#ffffff',
  bg:      '#f1f5fb',
  border:  '#e2e8f4',
  muted:   '#7a8aaa',
  text:    '#1a2035',
  textSub: '#4a5570',
}

const s = {
  input: {
    width: '100%' as const,
    padding: '11px 13px',
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    fontSize: 14,
    color: C.text,
    outline: 'none',
    background: C.bg,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  card: {
    background: C.surface,
    borderRadius: 16,
    boxShadow: '0 1px 6px rgba(15,31,61,0.07), 0 4px 20px rgba(15,31,61,0.04)',
  } as React.CSSProperties,
  btn: (bg: string, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 10,
    padding: '12px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  } as React.CSSProperties),
}

// ── HELPERS
type Lang = 'en' | 'ru'
type Tab  = 'docs' | 'todo' | 'add'

function ExpiryBadge({ dateStr }: { dateStr: string }) {
  const st = getExpiryStatus(dateStr)
  if (!st) return null
  return (
    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>
      {st.label}
    </span>
  )
}

function Tag({ children, color = C.blue }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ background: color + '18', color, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 8 }}>
      {children}
    </span>
  )
}

function CopyBtn({ value, lang }: { value: string; lang: Lang }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button onClick={copy} style={{
      background: copied ? '#dcfce7' : C.bg,
      color: copied ? '#166534' : C.blue,
      border: `1.5px solid ${copied ? '#86efac' : C.border}`,
      borderRadius: 8, padding: '6px 12px',
      fontSize: 12, fontWeight: 700, cursor: 'pointer',
      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5,
    }}>
      {copied ? '✓' : '⎘'} {copied
        ? (lang === 'ru' ? 'Скопировано' : 'Copied')
        : (lang === 'ru' ? 'Копировать' : 'Copy')}
    </button>
  )
}

// ── MAIN
export default function Page() {
  const [docs,  setDocs]  = useState<Doc[]>(DEFAULT_DOCS)
  const [todos, setTodos] = useState<TodoItem[]>(DEFAULT_TODOS)
  const [lang,  setLang]  = useState<Lang>('ru')
  const [tab,   setTab]   = useState<Tab>('docs')
  const [view,  setView]  = useState<'list' | 'detail' | 'add'>('list')
  const [selected, setSelected] = useState<Doc | null>(null)
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [form,  setForm]  = useState<Omit<Doc,'id'>>(EMPTY_FORM)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // ── LOAD
  useEffect(() => {
    try {
      const d = localStorage.getItem(DOCS_KEY)
      if (d) setDocs(JSON.parse(d))
      const t = localStorage.getItem(TODOS_KEY)
      if (t) setTodos(JSON.parse(t))
      const l = localStorage.getItem(LANG_KEY) as Lang
      if (l) setLang(l)
      const tb = localStorage.getItem(TAB_KEY) as Tab
      if (tb) setTab(tb)
    } catch (_) {}
    setLoaded(true)
  }, [])

  const saveDocs  = (d: Doc[])      => { setDocs(d);  try { localStorage.setItem(DOCS_KEY,  JSON.stringify(d)) } catch(_){} }
  const saveTodos = (t: TodoItem[]) => { setTodos(t); try { localStorage.setItem(TODOS_KEY, JSON.stringify(t)) } catch(_){} }

  const switchLang = () => {
    const nl = lang === 'ru' ? 'en' : 'ru'
    setLang(nl)
    localStorage.setItem(LANG_KEY, nl)
  }
  const switchTab = (t: Tab) => {
    setTab(t); setView('list'); setSelected(null); setSearch('')
    localStorage.setItem(TAB_KEY, t)
  }

  const t = useCallback((en: string, ru: string) => lang === 'ru' ? ru : en, [lang])
  const cat = (id: string) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[5]

  // ── STATS
  const expired    = docs.filter(d => { const x = daysUntil(d.validUntil); return x !== null && x < 0 })
  const expiring60 = docs.filter(d => { const x = daysUntil(d.validUntil); return x !== null && x >= 0 && x <= 60 })
  const todoDone   = todos.filter(d => d.done).length
  const todoTotal  = todos.length

  // ── FILTER DOCS
  const filteredDocs = docs.filter(d => {
    const matchCat = filterCat === 'all' || d.category === filterCat
    const q = search.toLowerCase()
    const matchSearch = !q ||
      d.title.toLowerCase().includes(q) ||
      d.titleRu.toLowerCase().includes(q) ||
      d.number.toLowerCase().includes(q) ||
      d.notes.toLowerCase().includes(q)
    return matchCat && matchSearch
  })
  const pinned = filteredDocs.filter(d => d.pinned)
  const rest   = filteredDocs.filter(d => !d.pinned)

  // ── TODO GROUPS
  const weekLabels = [
    { w: 0, en: 'Before Arriving',  ru: 'До приезда' },
    { w: 1, en: 'Week 1',           ru: 'Неделя 1' },
    { w: 2, en: 'Week 2',           ru: 'Неделя 2' },
    { w: 3, en: 'Week 3',           ru: 'Неделя 3' },
    { w: 4, en: 'Week 4',           ru: 'Неделя 4' },
    { w: 5, en: 'Week 5–6',         ru: 'Недели 5–6' },
    { w: 6, en: 'Week 5–6',         ru: 'Недели 5–6' },
  ]
  const uniqueWeeks = Array.from(new Set(todos.map(t => t.week))).sort((a,b)=>a-b)

  // ── DOC ACTIONS
  const addDoc = () => {
    saveDocs([...docs, { ...form, id: generateId() }])
    setForm(EMPTY_FORM); switchTab('docs')
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
  const toggleTodo = (id: string) => {
    saveTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  const resetTodos = () => saveTodos(DEFAULT_TODOS.map(t => ({ ...t, done: false })))

  if (!loaded) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background: C.bg }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background: C.bg, color: C.text }}>

      {/* ══ HEADER ══ */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyM} 100%)`,
        position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 16px' }}>

          {/* Top bar */}
          <div style={{ display:'flex', alignItems:'center', gap:10, height:56 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
              🇬🇧
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.1 }}>
                {t('UK Documents', 'Документы UK')}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Sergii Palesika</div>
            </div>
            <button onClick={switchLang} style={{
              background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:8, padding:'5px 11px', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>

          {/* Stats bar */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, paddingBottom:12 }}>
            {[
              { icon:'📄', val: docs.length,    labelEn:'Documents', labelRu:'Документов' },
              { icon:'⚠️', val: expiring60.length, labelEn:'Expiring', labelRu:'Истекает', warn: expiring60.length > 0 },
              { icon:'✅', val: `${todoDone}/${todoTotal}`, labelEn:'Tasks done', labelRu:'Задач выполнено' },
            ].map((s, i) => (
              <div key={i} style={{ background: s.warn ? 'rgba(234,88,12,0.2)' : 'rgba(255,255,255,0.08)',
                borderRadius:10, padding:'8px 10px', textAlign:'center' as const,
                border: s.warn ? '1px solid rgba(234,88,12,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:2 }}>
                  {s.icon} {lang === 'ru' ? s.labelRu : s.labelEn}
                </div>
                <div style={{ fontSize:18, fontWeight:700, color: s.warn ? '#fb923c' : '#fff' }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:4, paddingBottom:12 }}>
            {([
              { id:'docs', icon:'📂', en:'Documents', ru:'Документы' },
              { id:'todo', icon:'✅', en:'Action Plan', ru:'План действий' },
              { id:'add',  icon:'+',  en:'Add Doc',    ru:'Добавить' },
            ] as { id: Tab; icon: string; en: string; ru: string }[]).map(tb => (
              <button key={tb.id} onClick={() => switchTab(tb.id)} style={{
                flex:1, background: tab === tb.id ? 'rgba(255,255,255,0.18)' : 'transparent',
                border: tab === tb.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                borderRadius:10, padding:'8px 6px', color: tab === tb.id ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize:12, fontWeight: tab === tb.id ? 700 : 500, cursor:'pointer',
                transition:'all 0.15s',
              }}>
                {tb.icon} {lang === 'ru' ? tb.ru : tb.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'16px 16px 100px' }}>

        {/* ══════════════ DOCS TAB ══════════════ */}
        {tab === 'docs' && view === 'list' && (
          <>
            {/* Expiry alert */}
            {expiring60.length > 0 && (
              <div style={{ ...s.card, background:'#fff7ed', border:'1px solid #fed7aa',
                padding:'12px 16px', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#c2410c', marginBottom:6 }}>
                  ⚠️ {t('Expiring soon', 'Истекает скоро')}
                </div>
                {expiring60.map(d => (
                  <div key={d.id} style={{ fontSize:12, color:'#7c2d12', marginBottom:2, display:'flex', gap:8 }}>
                    <span>{cat(d.category).icon}</span>
                    <span>{lang==='ru'&&d.titleRu ? d.titleRu : d.title}</span>
                    <span style={{ color:'#ea580c', fontWeight:600 }}>— {daysUntil(d.validUntil)}d</span>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div style={{ position:'relative', marginBottom:14 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                color: C.muted, fontSize:15 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Search documents…', 'Поиск документов…')}
                style={{ ...s.input, paddingLeft:36 }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position:'absolute', right:10,
                  top:'50%', transform:'translateY(-50%)', background:'none', border:'none',
                  cursor:'pointer', color: C.muted, fontSize:16 }}>×</button>
              )}
            </div>

            {/* Category chips */}
            <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:10,
              marginBottom:14, scrollbarWidth:'none' as const }}>
              {[{ id:'all', label:'All', labelRu:'Все', icon:'📂', color: C.navy }, ...CATEGORIES].map(c => (
                <button key={c.id} onClick={() => setFilterCat(c.id)} style={{
                  flexShrink:0, background: filterCat===c.id ? c.color : C.surface,
                  color: filterCat===c.id ? '#fff' : C.textSub,
                  border:`1.5px solid ${filterCat===c.id ? c.color : C.border}`,
                  borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer',
                  transition:'all 0.15s',
                }}>
                  {c.icon} {lang==='ru' ? c.labelRu : c.label}
                </button>
              ))}
            </div>

            {/* Pinned section */}
            {pinned.length > 0 && (
              <>
                <SectionLabel>📌 {t('Pinned', 'Закреплённые')}</SectionLabel>
                {pinned.map(doc => (
                  <DocCard key={doc.id} doc={doc} cat={cat(doc.category)} lang={lang}
                    onOpen={() => { setSelected(doc); setView('detail') }} />
                ))}
                {rest.length > 0 && <div style={{ height:6 }} />}
              </>
            )}

            {/* All docs */}
            {rest.length > 0 && (
              <>
                {pinned.length > 0 && <SectionLabel>{t('All documents', 'Все документы')}</SectionLabel>}
                {rest.map(doc => (
                  <DocCard key={doc.id} doc={doc} cat={cat(doc.category)} lang={lang}
                    onOpen={() => { setSelected(doc); setView('detail') }} />
                ))}
              </>
            )}

            {filteredDocs.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 20px', color: C.muted }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📂</div>
                <div style={{ fontSize:14 }}>
                  {search
                    ? t('Nothing found', 'Ничего не найдено')
                    : t('No documents yet', 'Нет документов')}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════ DETAIL VIEW ══════════════ */}
        {tab === 'docs' && view === 'detail' && selected && (() => {
          const c = cat(selected.category)
          return (
            <>
              <button onClick={() => { setView('list'); setSelected(null) }}
                style={{ background:'none', border:'none', color: C.blue, fontSize:14,
                  fontWeight:600, cursor:'pointer', padding:'0 0 16px', display:'flex',
                  alignItems:'center', gap:5 }}>
                ← {t('Back', 'Назад')}
              </button>

              {/* Hero card */}
              <div style={{ background:`linear-gradient(135deg, ${c.color} 0%, ${c.color}cc 100%)`,
                borderRadius:20, padding:'28px 24px 22px', marginBottom:3, color:'#fff',
                boxShadow:`0 8px 30px ${c.color}40` }}>
                <div style={{ fontSize:36, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:20, fontWeight:700, lineHeight:1.3, marginBottom:4 }}>
                  {lang==='ru'&&selected.titleRu ? selected.titleRu : selected.title}
                </div>
                <Tag color="#ffffff">{lang==='ru' ? c.labelRu : c.label}</Tag>
                {selected.pinned && <Tag color="#fffde7">📌 {t('Pinned','Закреплено')}</Tag>}
              </div>

              {/* Details */}
              <div style={{ ...s.card, borderRadius:'0 0 20px 20px', padding:'20px 22px',
                marginBottom:12 }}>
                {selected.number && (
                  <DRow label={t('Number / Code','Номер / Код')}>
                    <div style={{ display:'flex', alignItems:'center', gap:10,
                      justifyContent:'space-between', width:'100%' }}>
                      <span style={{ fontFamily:'monospace', fontSize:22, fontWeight:800,
                        letterSpacing:'0.07em', color: C.navy }}>
                        {selected.number}
                      </span>
                      <CopyBtn value={selected.number} lang={lang} />
                    </div>
                  </DRow>
                )}
                {selected.validFrom && (
                  <DRow label={t('Valid from','Действует с')}>{formatDate(selected.validFrom)}</DRow>
                )}
                {selected.validUntil && (
                  <DRow label={t('Valid until','Действует до')}>
                    <span>{formatDate(selected.validUntil)}</span>
                    <ExpiryBadge dateStr={selected.validUntil} />
                  </DRow>
                )}
                {(selected.notes||selected.notesRu) && (
                  <DRow label={t('Notes','Заметки')}>
                    <span style={{ fontSize:13, color: C.textSub, lineHeight:1.65 }}>
                      {lang==='ru'&&selected.notesRu ? selected.notesRu : selected.notes}
                    </span>
                  </DRow>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                <button onClick={() => togglePin(selected.id)} style={{
                  flex:1, ...s.btn(selected.pinned ? '#fef9c3' : C.surface, selected.pinned ? '#854d0e' : C.textSub),
                  border:`1.5px solid ${selected.pinned ? '#fde047' : C.border}`,
                }}>
                  📌 {selected.pinned ? t('Unpin','Открепить') : t('Pin','Закрепить')}
                </button>
                <button onClick={() => setConfirmDel(selected.id)} style={{
                  flex:1, ...s.btn('#fff','#dc2626'),
                  border:'1.5px solid #fca5a5',
                }}>
                  🗑 {t('Delete','Удалить')}
                </button>
              </div>

              {confirmDel === selected.id && (
                <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:14,
                  padding:18, textAlign:'center' as const }}>
                  <div style={{ fontSize:14, color:'#991b1b', fontWeight:700, marginBottom:14 }}>
                    {t('Delete this document?','Удалить этот документ?')}
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => setConfirmDel(null)}
                      style={{ flex:1, ...s.btn(C.surface, C.text), border:`1px solid ${C.border}` }}>
                      {t('Cancel','Отмена')}
                    </button>
                    <button onClick={() => deleteDoc(selected.id)}
                      style={{ flex:1, ...s.btn('#dc2626') }}>
                      {t('Delete','Удалить')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* ══════════════ TODO TAB ══════════════ */}
        {tab === 'todo' && (
          <>
            {/* Progress */}
            <div style={{ ...s.card, padding:'18px 20px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:14, fontWeight:700, color: C.navy }}>
                  {t('Progress','Прогресс')}
                </span>
                <span style={{ fontSize:14, fontWeight:700, color: C.blue }}>
                  {todoDone}/{todoTotal}
                </span>
              </div>
              <div style={{ background: C.bg, borderRadius:99, height:10, overflow:'hidden' }}>
                <div style={{ background:`linear-gradient(90deg, ${C.accent}, #22c55e)`,
                  height:'100%', borderRadius:99,
                  width:`${todoTotal ? (todoDone/todoTotal*100) : 0}%`,
                  transition:'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize:12, color: C.muted, marginTop:6 }}>
                {todoTotal - todoDone} {t('tasks remaining','задач осталось')}
              </div>
            </div>

            {/* Todo groups by week */}
            {uniqueWeeks.map(w => {
              const label = weekLabels.find(l => l.w === w)
              const items = todos.filter(t => t.week === w)
              const doneHere = items.filter(t => t.done).length
              return (
                <div key={w} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    marginBottom:8 }}>
                    <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.08em',
                      textTransform:'uppercase' as const, color: C.blue }}>
                      {label ? (lang==='ru' ? label.ru : label.en) : `Week ${w}`}
                    </div>
                    <span style={{ fontSize:11, color: C.muted }}>
                      {doneHere}/{items.length}
                    </span>
                  </div>
                  <div style={{ ...s.card, overflow:'hidden' }}>
                    {items.map((item, i) => {
                      const c = CATEGORIES.find(c => c.id === item.category) ?? CATEGORIES[5]
                      return (
                        <div key={item.id} onClick={() => toggleTodo(item.id)} style={{
                          display:'flex', alignItems:'center', gap:12,
                          padding:'13px 16px',
                          borderBottom: i < items.length-1 ? `1px solid ${C.border}` : 'none',
                          cursor:'pointer', transition:'background 0.1s',
                          background: item.done ? '#f0fdf4' : C.surface,
                        }}>
                          <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                            background: item.done ? '#22c55e' : 'transparent',
                            border: item.done ? 'none' : `2px solid ${C.border}`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:13, color:'#fff', transition:'all 0.2s',
                          }}>
                            {item.done ? '✓' : ''}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:500,
                              color: item.done ? '#4ade80' : C.text,
                              textDecoration: item.done ? 'line-through' : 'none',
                              lineHeight:1.4,
                            }}>
                              {lang==='ru' ? item.textRu : item.text}
                            </div>
                          </div>
                          <span style={{ fontSize:16, flexShrink:0 }}>{c.icon}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Reset button */}
            <button onClick={resetTodos} style={{
              ...s.btn(C.surface, C.muted),
              border:`1.5px solid ${C.border}`, width:'100%', marginTop:8,
              fontSize:13,
            }}>
              🔄 {t('Reset all tasks','Сбросить все задачи')}
            </button>
          </>
        )}

        {/* ══════════════ ADD TAB ══════════════ */}
        {tab === 'add' && (
          <div style={{ ...s.card, padding:24 }}>
            <div style={{ fontSize:18, fontWeight:700, color: C.navy, marginBottom:20 }}>
              ➕ {t('New Document','Новый документ')}
            </div>

            {/* Category picker */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:600, color: C.textSub, marginBottom:8 }}>
                {t('Category','Категория')}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))}
                    style={{ background: form.category===c.id ? c.color : C.bg,
                      color: form.category===c.id ? '#fff' : C.textSub,
                      border:`1.5px solid ${form.category===c.id ? c.color : C.border}`,
                      borderRadius:10, padding:'10px 6px', fontSize:12, fontWeight:600, cursor:'pointer',
                      display:'flex', flexDirection:'column' as const, alignItems:'center', gap:3,
                      transition:'all 0.15s',
                    }}>
                    <span style={{ fontSize:20 }}>{c.icon}</span>
                    <span>{lang==='ru' ? c.labelRu : c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <FField label={t('Title (English)','Название (English)')}>
              <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
                placeholder="e.g. CSCS Green Card" style={s.input} />
            </FField>

            <FField label={t('Title (Russian)','Название (Русский)')}>
              <input value={form.titleRu} onChange={e => setForm(f=>({...f,titleRu:e.target.value}))}
                placeholder="напр. Карта CSCS Зелёная" style={s.input} />
            </FField>

            <FField label={t('Number / Code','Номер / Код')}>
              <input value={form.number} onChange={e => setForm(f=>({...f,number:e.target.value}))}
                placeholder="e.g. WZL F8D 7A4"
                style={{ ...s.input, fontFamily:'monospace', fontSize:16, letterSpacing:'0.06em' }} />
            </FField>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <FField label={t('Valid from','Действует с')}>
                <input type="date" value={form.validFrom}
                  onChange={e => setForm(f=>({...f,validFrom:e.target.value}))} style={s.input} />
              </FField>
              <FField label={t('Valid until','Действует до')}>
                <input type="date" value={form.validUntil}
                  onChange={e => setForm(f=>({...f,validUntil:e.target.value}))} style={s.input} />
              </FField>
            </div>

            <FField label={t('Notes (EN)','Заметки (EN)')}>
              <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                rows={2} placeholder="Any useful notes…"
                style={{ ...s.input, resize:'vertical' as const }} />
            </FField>

            <FField label={t('Notes (RU)','Заметки (RU)')}>
              <textarea value={form.notesRu} onChange={e => setForm(f=>({...f,notesRu:e.target.value}))}
                rows={2} placeholder="Полезные заметки…"
                style={{ ...s.input, resize:'vertical' as const }} />
            </FField>

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, cursor:'pointer' }}
              onClick={() => setForm(f=>({...f,pinned:!f.pinned}))}>
              <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
                background: form.pinned ? C.blue : 'transparent',
                border: form.pinned ? 'none' : `2px solid ${C.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:13, color:'#fff' }}>
                {form.pinned ? '✓' : ''}
              </div>
              <span style={{ fontSize:13, color: C.textSub }}>
                📌 {t('Pin this document','Закрепить документ')}
              </span>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => switchTab('docs')}
                style={{ flex:1, ...s.btn(C.bg, C.textSub), border:`1.5px solid ${C.border}` }}>
                {t('Cancel','Отмена')}
              </button>
              <button onClick={addDoc} disabled={!form.title} style={{
                flex:2, ...s.btn(form.title ? C.navy : '#cbd5e0'),
                cursor: form.title ? 'pointer' : 'not-allowed',
              }}>
                {t('Save Document','Сохранить документ')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── SUB-COMPONENTS

function DocCard({ doc, cat, lang, onOpen }: {
  doc: Doc; cat: { id: string; label: string; labelRu: string; icon: string; color: string }
  lang: Lang; onOpen: () => void
}) {
  const title = lang==='ru'&&doc.titleRu ? doc.titleRu : doc.title
  return (
    <div onClick={onOpen} style={{
      background:'#fff', borderRadius:14, marginBottom:8,
      padding:'14px 16px', display:'flex', alignItems:'center', gap:14,
      cursor:'pointer', boxShadow:'0 1px 4px rgba(15,31,61,0.06)',
      borderLeft:`4px solid ${cat.color}`, transition:'box-shadow 0.15s, transform 0.1s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 18px rgba(15,31,61,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow='0 1px 4px rgba(15,31,61,0.06)' }}>
      <div style={{ width:44, height:44, borderRadius:12, background:cat.color+'18',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
        {cat.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#1a202c', marginBottom:3,
          display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' as const }}>
          {doc.pinned && <span style={{ fontSize:10 }}>📌</span>}
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
            {title}
          </span>
          {doc.validUntil && <ExpiryBadge dateStr={doc.validUntil} />}
        </div>
        {doc.number && (
          <div style={{ fontSize:12, fontFamily:'monospace', color:'#4a5568',
            fontWeight:600, letterSpacing:'0.04em' }}>
            {doc.number}
          </div>
        )}
        {doc.validUntil && (
          <div style={{ fontSize:11, color:'#a0aec0', marginTop:2 }}>
            {lang==='ru'?'до':'until'} {formatDate(doc.validUntil)}
          </div>
        )}
      </div>
      <div style={{ color:'#cbd5e0', fontSize:20 }}>›</div>
    </div>
  )
}

function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:12, marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em',
        textTransform:'uppercase' as const, color: C.muted, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:14, color: C.text, display:'flex', alignItems:'center',
        flexWrap:'wrap' as const, gap:6 }}>{children}</div>
    </div>
  )
}

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:600, color: C.textSub, marginBottom:6 }}>{label}</div>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em',
      textTransform:'uppercase' as const, color: C.muted, marginBottom:8 }}>
      {children}
    </div>
  )
}
