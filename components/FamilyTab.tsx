'use client'
import { useState, useEffect } from 'react'

const ARRIVAL_CHECKLIST = [
  { id: 'visa',     icon: '🛂', en: 'Complete eVisa / Homes for Ukraine application', uk: 'Оформити eVisa / Homes for Ukraine', category: 'before' },
  { id: 'flight',   icon: '✈️', en: 'Book travel to UK (Warsaw VAC → London)', uk: 'Забронювати квиток до UK (Варшава → Лондон)', category: 'before' },
  { id: 'nhs',      icon: '🏥', en: 'Register with NHS GP (Marlow Medical Group)', uk: 'Зареєструватися у лікаря NHS (Marlow Medical Group)', category: 'arrival' },
  { id: 'bank',     icon: '🏦', en: 'Open UK bank account (Monzo / Starling)', uk: 'Відкрити банківський рахунок UK (Monzo / Starling)', category: 'arrival' },
  { id: 'ni',       icon: '🪪', en: 'Apply for National Insurance number', uk: 'Подати заявку на National Insurance номер', category: 'arrival' },
  { id: 'uc',       icon: '💷', en: 'Apply for Universal Credit / benefits', uk: 'Подати заявку на Universal Credit', category: 'arrival' },
  { id: 'school',   icon: '🎓', en: 'Enrol children in school', uk: 'Зарахувати дітей до школи', category: 'school' },
  { id: 'docs',     icon: '📄', en: 'Add family documents to UK Docs app', uk: 'Додати документи сімʼї до UK Docs', category: 'arrival' },
  { id: 'address',  icon: '🏠', en: 'Register address with council', uk: 'Зареєструвати адресу в раді', category: 'arrival' },
  { id: 'driving',  icon: '🚘', en: 'Exchange Ukrainian driving licence (DVLA)', uk: 'Обміняти українські права (DVLA)', category: 'arrival' },
  { id: 'mobile',   icon: '📱', en: 'Get UK SIM card / phone plan', uk: 'Придбати UK SIM-карту', category: 'arrival' },
  { id: 'dentist',  icon: '🦷', en: 'Register with NHS dentist', uk: 'Зареєструватися у стоматолога NHS', category: 'later' },
  { id: 'tax',      icon: '📋', en: 'Check Council Tax exemption (refugee status)', uk: 'Перевірити звільнення від Council Tax', category: 'later' },
  { id: 'library',  icon: '📚', en: 'Get library cards (Marlow Library)', uk: 'Отримати картки бібліотеки (Marlow Library)', category: 'later' },
]

const SCHOOL_DOCS = [
  { id: 'passport', icon: '📘', en: "Child's passport (original + copy)", uk: 'Паспорт дитини (оригінал + копія)' },
  { id: 'visa_doc', icon: '🛂', en: 'eVisa / immigration status document', uk: 'eVisa / документ імміграційного статусу' },
  { id: 'proof',    icon: '🏠', en: 'Proof of address (utility bill or sponsor letter)', uk: 'Підтвердження адреси (рахунок за комунальні або листа спонсора)' },
  { id: 'medical',  icon: '💉', en: 'Vaccination record / immunisation history', uk: 'Карта щеплень / історія імунізації' },
  { id: 'prev',     icon: '🏫', en: 'Previous school records (if available)', uk: 'Документи з попередньої школи (якщо є)' },
  { id: 'photo',    icon: '📸', en: 'Passport-size photos (x4)', uk: 'Фото на документи (x4)' },
  { id: 'birth',    icon: '👶', en: "Child's birth certificate", uk: 'Свідоцтво про народження дитини' },
]

const TERM_DATES_2026 = [
  { period: 'Summer Holiday', start: '2026-07-17', end: '2026-09-02', type: 'holiday' },
  { period: 'Autumn Term 1', start: '2026-09-03', end: '2026-10-23', type: 'school' },
  { period: 'Half Term', start: '2026-10-26', end: '2026-10-30', type: 'holiday' },
  { period: 'Autumn Term 2', start: '2026-11-02', end: '2026-12-18', type: 'school' },
  { period: 'Christmas Holiday', start: '2026-12-21', end: '2027-01-04', type: 'holiday' },
  { period: 'Spring Term 1', start: '2027-01-05', end: '2027-02-12', type: 'school' },
  { period: 'Half Term', start: '2027-02-15', end: '2027-02-19', type: 'holiday' },
  { period: 'Spring Term 2', start: '2027-02-22', end: '2027-04-01', type: 'school' },
  { period: 'Easter Holiday', start: '2027-04-02', end: '2027-04-16', type: 'holiday' },
  { period: 'Summer Term 1', start: '2027-04-19', end: '2027-05-28', type: 'school' },
  { period: 'Half Term', start: '2027-05-31', end: '2027-06-04', type: 'holiday' },
  { period: 'Summer Term 2', start: '2027-06-07', end: '2027-07-16', type: 'school' },
]

export default function FamilyTab({ lang, dark }) {
  const [tab, setTab] = useState('checklist')
  const [done, setDone] = useState({})

  const t = (en, uk) => lang === 'en' ? en : uk

  useEffect(function() {
    try {
      const saved = localStorage.getItem('uk-docs-family-checklist')
      if (saved) setDone(JSON.parse(saved))
    } catch(e) {}
  }, [])

  const toggle = function(id) {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    try { localStorage.setItem('uk-docs-family-checklist', JSON.stringify(next)) } catch(e) {}
  }

  const today = new Date()
  const daysUntil = function(dateStr) {
    return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000)
  }

  const categories = [
    { id: 'before', label: t('Before arrival','До приїзду'), color: '#7c3aed', bg: '#f5f3ff' },
    { id: 'arrival', label: t('On arrival','При приїзді'), color: '#1d4ed8', bg: '#eff6ff' },
    { id: 'school', label: t('School','Школа'), color: '#0891b2', bg: '#ecfeff' },
    { id: 'later', label: t('Later','Потім'), color: '#65a30d', bg: '#f7fee7' },
  ]

  const totalDone = ARRIVAL_CHECKLIST.filter(function(i) { return done[i.id] }).length

  return (
    <div>
      <div style={{ fontSize: 17, fontWeight: 800, color: dark ? '#f1f5f9' : '#0f1f3d', marginBottom: 4 }}>
        👨‍👩‍👧 {t('Family Arrival', 'Приїзд сімʼї')}
      </div>
      <div style={{ fontSize: 12, color: '#7a8aaa', marginBottom: 16 }}>
        {t('Estimated: August 2026','Очікується: серпень 2026')}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['checklist', '✅', t('Checklist','Чекліст')], ['school', '🎓', t('School','Школа')], ['dates', '📅', t('Term dates','Терміни')]].map(function(item) { return (
          <button key={item[0]} onClick={function() { setTab(item[0]) }} style={{ flex: 1, background: tab === item[0] ? '#1d4ed8' : (dark ? '#1e293b' : '#fff'), color: tab === item[0] ? '#fff' : (dark ? '#94a3b8' : '#475569'), border: tab === item[0] ? 'none' : '1px solid ' + (dark ? '#334155' : '#e2e8f0'), borderRadius: 10, padding: '8px 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {item[1]} {item[2]}
          </button>
        )})}
      </div>

      {tab === 'checklist' && (
        <div>
          <div style={{ background: dark ? '#1e293b' : '#f8fafc', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a' }}>{totalDone} / {ARRIVAL_CHECKLIST.length} {t('completed','виконано')}</div>
              <div style={{ background: dark ? '#334155' : '#e2e8f0', borderRadius: 99, height: 6, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ background: '#16a34a', width: (totalDone / ARRIVAL_CHECKLIST.length * 100) + '%', height: '100%', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{Math.round(totalDone / ARRIVAL_CHECKLIST.length * 100)}%</div>
          </div>

          {categories.map(function(cat) {
            const items = ARRIVAL_CHECKLIST.filter(function(i) { return i.category === cat.id })
            const catDone = items.filter(function(i) { return done[i.id] }).length
            return (
              <div key={cat.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat.label}</span>
                  <span style={{ fontSize: 11, color: dark ? '#64748b' : '#94a3b8', marginLeft: 'auto' }}>{catDone}/{items.length}</span>
                </div>
                {items.map(function(item) { return (
                  <button key={item.id} onClick={function() { toggle(item.id) }} style={{ width: '100%', background: done[item.id] ? (dark ? '#0a2e0a' : '#f0fdf4') : (dark ? '#1e293b' : '#fff'), border: '1px solid ' + (done[item.id] ? '#86efac' : (dark ? '#334155' : '#e2e8f0')), borderRadius: 10, padding: '10px 12px', marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{done[item.id] ? '✅' : item.icon}</span>
                    <span style={{ fontSize: 13, color: done[item.id] ? '#16a34a' : (dark ? '#e2e8f0' : '#0f172a'), textDecoration: done[item.id] ? 'line-through' : 'none', flex: 1 }}>
                      {lang === 'en' ? item.en : item.uk}
                    </span>
                  </button>
                )})}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'school' && (
        <div>
          <div style={{ background: dark ? '#1e293b' : '#eff6ff', borderRadius: 12, padding: '14px 16px', marginBottom: 16, borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>📌 {t('School enrollment opens','Запис до школи відкривається')}</div>
            <div style={{ fontSize: 12, color: dark ? '#94a3b8' : '#475569' }}>{t('Contact Buckinghamshire Council to apply for a school place as soon as you arrive in the UK.','Звʼяжіться з Buckinghamshire Council щоб подати заявку на місце в школі одразу після приїзду до UK.')}</div>
            <a href="https://www.buckinghamshire.gov.uk/schools-and-learning/schools/school-admissions/" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}>
              gov.uk → School Admissions ↗
            </a>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a', marginBottom: 10 }}>
            📋 {t('Documents needed','Необхідні документи')}
          </div>
          {SCHOOL_DOCS.map(function(doc) { return (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: dark ? '#1e293b' : '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 6, border: '1px solid ' + (dark ? '#334155' : '#e2e8f0') }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{doc.icon}</span>
              <span style={{ fontSize: 13, color: dark ? '#e2e8f0' : '#0f172a' }}>{lang === 'en' ? doc.en : doc.uk}</span>
            </div>
          )})}

          <div style={{ background: dark ? '#1c1917' : '#fff7ed', borderRadius: 12, padding: '14px 16px', marginTop: 16, borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>💡 {t('Tip','Порада')}</div>
            <div style={{ fontSize: 12, color: dark ? '#d97706' : '#78350f' }}>
              {t('Ukrainian qualifications are recognised in UK. Contact Buckinghamshire Council refugee support team for help with translation and school placement.','Українські кваліфікації визнаються в UK. Зверніться до команди підтримки біженців Buckinghamshire Council для допомоги з перекладом та зарахуванням до школи.')}
            </div>
          </div>
        </div>
      )}

      {tab === 'dates' && (
        <div>
          <div style={{ fontSize: 12, color: dark ? '#64748b' : '#94a3b8', marginBottom: 12 }}>
            📍 {t('Buckinghamshire Schools — Academic Year 2026/27','Школи Бакінгемшир — Навчальний рік 2026/27')}
          </div>
          {TERM_DATES_2026.map(function(term) {
            const days = daysUntil(term.start)
            const isActive = days <= 0 && daysUntil(term.end) >= 0
            const isPast = daysUntil(term.end) < 0
            return (
              <div key={term.period} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isActive ? (dark ? '#0a2e0a' : '#f0fdf4') : (dark ? '#1e293b' : '#fff'), borderRadius: 10, padding: '10px 12px', marginBottom: 6, border: '1px solid ' + (isActive ? '#86efac' : (dark ? '#334155' : '#e2e8f0')), opacity: isPast ? 0.4 : 1 }}>
                <span style={{ fontSize: 18 }}>{term.type === 'school' ? '📚' : '🏖️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#16a34a' : (dark ? '#e2e8f0' : '#0f172a') }}>{term.period}</div>
                  <div style={{ fontSize: 11, color: dark ? '#64748b' : '#94a3b8', marginTop: 1 }}>
                    {new Date(term.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(term.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {isActive && <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 20 }}>NOW</span>}
                {!isPast && !isActive && days > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', background: dark ? '#334155' : '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>{days}d</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
