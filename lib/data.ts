import { Category, Doc } from './types'

export const CATEGORIES: Category[] = [
  { id: 'immigration',   label: 'Immigration',    labelRu: 'Иммиграция', icon: '🛂', color: '#1a4480' },
  { id: 'driving',       label: 'Driving',         labelRu: 'Вождение',   icon: '🚗', color: '#2e7d32' },
  { id: 'qualification', label: 'Qualifications',  labelRu: 'Допуски',    icon: '🎓', color: '#b45309' },
  { id: 'banking',       label: 'Banking',         labelRu: 'Банк',       icon: '🏦', color: '#5b21b6' },
  { id: 'tax',           label: 'Tax & HMRC',      labelRu: 'Налоги',     icon: '📋', color: '#c62828' },
  { id: 'passport',      label: 'Passport',        labelRu: 'Паспорт',    icon: '📘', color: '#0369a1' },
  { id: 'other',         label: 'Other',           labelRu: 'Другое',     icon: '📁', color: '#546e7a' },
]

export interface TodoItem {
  id: string
  text: string
  textRu: string
  done: boolean
  week: number
  category: string
}

export const DEFAULT_TODOS: TodoItem[] = [

  // ── DAYS 1–2: Arrival
  { id: 'a1', text: 'Photograph all documents & upload to cloud (passport, visa, sponsor letter)', textRu: 'Сфотографируй все документы и загрузи в облако (паспорт, виза, письмо спонсора)', done: false, week: 0, category: 'immigration' },
  { id: 'a2', text: 'Find out nearest Post Office from sponsor — collect BRP if letter has arrived', textRu: 'Узнай у спонсора адрес ближайшего Post Office — забери BRP если пришло письмо', done: false, week: 0, category: 'immigration' },
  { id: 'a3', text: 'Buy UK SIM card — giffgaff or Lebara (cheap, no contract)', textRu: 'Купи местную SIM-карту — giffgaff или Lebara (дёшево, без контракта)', done: false, week: 0, category: 'other' },
  { id: 'a4', text: 'Install apps: Citymapper, Google Maps, Rightmove, SpareRoom, Revolut', textRu: 'Установи приложения: Citymapper, Google Maps, Rightmove, SpareRoom, Revolut', done: false, week: 0, category: 'other' },
  { id: 'a5', text: 'Open Monzo or Revolut account — online, no UK credit history needed', textRu: 'Открой счёт в Monzo или Revolut — открывается онлайн за 10 минут', done: false, week: 0, category: 'banking' },

  // ── DAYS 3–5: Critical steps
  { id: 'b1', text: 'Register with Buckinghamshire Council (Homes for Ukraine) — buckinghamshire.gov.uk', textRu: 'Зарегистрируйся в совете Buckinghamshire (Homes for Ukraine) — buckinghamshire.gov.uk', done: false, week: 1, category: 'immigration' },
  { id: 'b2', text: 'Ask sponsor about nearby temporary school — collect school documents (birth cert + translation)', textRu: 'Уточни у спонсора временную школу — собери документы для школы (свидетельство о рождении + перевод)', done: false, week: 1, category: 'other' },
  { id: 'b3', text: 'Check BRP tracking at gov.uk/biometric-residence-permits', textRu: 'Проверь трекинг BRP на gov.uk/biometric-residence-permits', done: false, week: 1, category: 'immigration' },
  { id: 'b4', text: 'Collect BRP from Post Office — bring passport. This is your main UK document', textRu: 'Забери BRP в Post Office — возьми паспорт. Это твой главный документ в UK', done: false, week: 1, category: 'immigration' },
  { id: 'b5', text: 'Register with GP (doctor) at nhs.uk/service-search — free, needs passport + address', textRu: 'Зарегистрируйся у врача (GP) на nhs.uk/service-search — бесплатно, нужен паспорт + адрес', done: false, week: 1, category: 'other' },

  // ── WEEK 2: Housing search
  { id: 'c1', text: 'Start flat/room search: SpareRoom, Rightmove, Gumtree, Facebook Marketplace', textRu: 'Начни поиск жилья: SpareRoom, Rightmove, Gumtree, Facebook Marketplace', done: false, week: 2, category: 'other' },
  { id: 'c2', text: 'Look at cheaper areas near Richmond: Twickenham, Isleworth, Hounslow', textRu: 'Смотри более дешёвые районы рядом с Richmond: Twickenham, Isleworth, Hounslow', done: false, week: 2, category: 'other' },
  { id: 'c3', text: 'Contact Richmond Council housing support for Ukrainians — richmond.gov.uk', textRu: 'Свяжись с жилищной поддержкой Richmond Council для украинцев — richmond.gov.uk', done: false, week: 2, category: 'other' },
  { id: 'c4', text: 'Homes for Ukraine helpline: 0808 164 8810 — call if stuck with housing', textRu: 'Горячая линия Homes for Ukraine: 0808 164 8810 — звони если проблемы с жильём', done: false, week: 2, category: 'immigration' },
  { id: 'c5', text: 'Always view property in person before paying any deposit', textRu: 'Всегда лично смотри жильё перед тем как платить депозит', done: false, week: 2, category: 'other' },

  // ── WEEK 2–3: School
  { id: 'd1', text: 'Work out child\'s UK school year: age 7 = Year 3, age 8 = Year 4, etc.', textRu: 'Определи год обучения ребёнка: 7 лет = Year 3, 8 лет = Year 4 и т.д.', done: false, week: 2, category: 'other' },
  { id: 'd2', text: 'Apply for school via Richmond Council → School Admissions → In-Year Admission form', textRu: 'Подай заявку в школу через Richmond Council → School Admissions → In-Year Admission', done: false, week: 2, category: 'other' },
  { id: 'd3', text: 'Attach to school application: child passport, birth cert, proof of address, visa letter', textRu: 'Приложи к заявке: паспорт ребёнка, свидетельство о рождении, подтверждение адреса, письмо о визе', done: false, week: 2, category: 'immigration' },
  { id: 'd4', text: 'Wait 10–15 working days for school place confirmation', textRu: 'Ожидай 10–15 рабочих дней подтверждения места в школе', done: false, week: 3, category: 'other' },
  { id: 'd5', text: 'Ask school about free uniform assistance and EAL teacher support', textRu: 'Уточни в школе помощь с формой и поддержку EAL-учителя для детей без английского', done: false, week: 3, category: 'other' },

  // ── WEEK 3: Benefits & finances
  { id: 'e1', text: 'Apply for National Insurance (NI) number at gov.uk/apply-national-insurance-number', textRu: 'Подай на National Insurance (NI) номер на gov.uk/apply-national-insurance-number', done: false, week: 3, category: 'tax' },
  { id: 'e2', text: 'Apply for Universal Credit ASAP at gov.uk/universal-credit — 5-week wait starts from application', textRu: 'Подай на Universal Credit сразу на gov.uk/universal-credit — 5 недель ожидания с момента подачи', done: false, week: 3, category: 'tax' },
  { id: 'e3', text: 'Apply for Child Benefit at gov.uk/child-benefit — £25.60/week per child', textRu: 'Подай на Child Benefit на gov.uk/child-benefit — £25.60/нед на ребёнка', done: false, week: 3, category: 'tax' },
  { id: 'e4', text: 'Apply for Council Tax Reduction with Richmond Council', textRu: 'Подай на скидку Council Tax Reduction в Richmond Council', done: false, week: 3, category: 'tax' },
  { id: 'e5', text: 'Clarify with sponsor how much of their £350/month sponsorship is passed to you', textRu: 'Уточни у спонсора — какую часть выплаты £350/мес он передаёт тебе', done: false, week: 3, category: 'other' },

  // ── WEEK 3–4: Work
  { id: 'f1', text: 'Register with Jobcentre Plus in Richmond — free Work Coach to help with CV and job search', textRu: 'Зарегистрируйся в Jobcentre Plus в Richmond — бесплатный ментор по трудоустройству', done: false, week: 3, category: 'other' },
  { id: 'f2', text: 'Create UK-style CV: max 2 pages, no photo, no age, no marital status', textRu: 'Составь CV по UK-стандарту: макс 2 страницы, без фото, без возраста, без семейного статуса', done: false, week: 3, category: 'other' },
  { id: 'f3', text: 'Register on Indeed.co.uk, Reed.co.uk, Totaljobs.com — filter by Richmond area', textRu: 'Зарегистрируйся на Indeed.co.uk, Reed.co.uk, Totaljobs.com — фильтр по Richmond', done: false, week: 4, category: 'other' },
  { id: 'f4', text: 'Register with temp agencies: Adecco, Manpower, Brook Street — can start within days', textRu: 'Зарегистрируйся в агентствах временной занятости: Adecco, Manpower, Brook Street', done: false, week: 4, category: 'other' },
  { id: 'f5', text: 'Contact Jumpstart or Tent UK — specialist help for Ukrainians finding work', textRu: 'Обратись в Jumpstart или Tent UK — специальная помощь украинцам в поиске работы', done: false, week: 4, category: 'other' },

  // ── WEEK 4–5: Infrastructure
  { id: 'g1', text: 'Open permanent bank account (Barclays or Lloyds) — need BRP + tenancy agreement + passport', textRu: 'Открой постоянный счёт (Barclays или Lloyds) — нужен BRP + договор аренды + паспорт', done: false, week: 4, category: 'banking' },
  { id: 'g2', text: 'Get Oyster Card or link bank card for London/Richmond transport', textRu: 'Оформи Oyster Card или привяжи банковскую карту для транспорта в Лондоне/Richmond', done: false, week: 4, category: 'other' },
  { id: 'g3', text: 'Check Network Railcard or 18+ Railcard — 1/3 off train fares', textRu: 'Проверь Network Railcard или 18+ Railcard — скидка 1/3 на поезда', done: false, week: 4, category: 'other' },
  { id: 'g4', text: 'Re-register with GP near new permanent address in Richmond', textRu: 'Перерегистрируйся у врача рядом с постоянным адресом в Richmond', done: false, week: 5, category: 'other' },
  { id: 'g5', text: 'Book first health check appointment for yourself and child at new GP', textRu: 'Запишись на первичный осмотр для себя и ребёнка в новом GP', done: false, week: 5, category: 'other' },

  // ── WEEK 5–6: Driving & documents
  { id: 'h1', text: 'Ukrainian driving licence valid 12 months in UK — start DVLA exchange process early', textRu: 'Украинские права действуют 12 месяцев в UK — начни обмен в DVLA заранее', done: false, week: 5, category: 'driving' },
  { id: 'h2', text: 'Get D1 form from Post Office for driving licence exchange', textRu: 'Получи форму D1 в Post Office для обмена водительского удостоверения', done: false, week: 5, category: 'driving' },
  { id: 'h3', text: 'Get certified English translation of Ukrainian driving licence (~£30–60)', textRu: 'Получи заверенный перевод украинских прав на английский (~£30–60)', done: false, week: 5, category: 'driving' },
  { id: 'h4', text: 'Send D1 pack to DVLA Swansea SA99 1BH by Special Delivery — cost £43', textRu: 'Отправь пакет D1 в DVLA Swansea SA99 1BH через Special Delivery — стоимость £43', done: false, week: 6, category: 'driving' },
  { id: 'h5', text: 'Translate diploma/qualification via UK NARIC (now ENIC) if needed for work', textRu: 'Переведи диплом/квалификацию через UK NARIC (теперь ENIC) если нужно для работы', done: false, week: 6, category: 'qualification' },

  // ── WEEK 6: Community & English
  { id: 'i1', text: 'Find Ukrainian community in Richmond: Ukrainian Association of Great Britain', textRu: 'Найди украинскую общину в Richmond: Ukrainian Association of Great Britain', done: false, week: 6, category: 'other' },
  { id: 'i2', text: 'Enrol in free ESOL English classes: Richmond Adult Community College (free with UC)', textRu: 'Запишись на бесплатные курсы английского ESOL: Richmond Adult Community College (бесплатно при UC)', done: false, week: 6, category: 'other' },
  { id: 'i3', text: 'Ask school about free afterschool clubs for child', textRu: 'Узнай в школе о бесплатных кружках и секциях для ребёнка после уроков', done: false, week: 6, category: 'other' },
  { id: 'i4', text: 'Final checklist: BRP ✓ NI ✓ Bank ✓ Housing ✓ School ✓ GP ✓ Universal Credit ✓', textRu: 'Финальная проверка: BRP ✓ NI ✓ Банк ✓ Жильё ✓ Школа ✓ GP ✓ Universal Credit ✓', done: false, week: 6, category: 'immigration' },
]

export const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Sergii Palesika',
  nameRu: 'Сергей Палесика',
  dob: '1985-07-08',
  nationality: 'Ukrainian',
  avatar: '👤',
  createdAt: new Date().toISOString(),
}

export const DEFAULT_DOCS: Doc[] = [
  {
    id: 'evisa',
    profileId: 'default',
    category: 'immigration',
    title: 'eVisa — Homes for Ukraine',
    titleRu: 'eVisa — Дома для Украины',
    number: '',
    validFrom: '2026-03-10',
    validUntil: '2027-09-10',
    notes: 'Status: Homes for Ukraine | DOB: 8 July 1985',
    notesRu: 'Статус: Homes for Ukraine | ДР: 8 июля 1985',
    pinned: true,
  },
  {
    id: 'sharecode_work',
    profileId: 'default',
    category: 'immigration',
    title: 'Share Code — Right to Work',
    titleRu: 'Share Code — Право на работу',
    number: 'WZL F8D 7A4',
    validFrom: '',
    validUntil: '2026-07-20',
    notes: 'Give to employer + DOB → gov.uk/view-right-to-work',
    notesRu: 'Дать работодателю + дата рождения → gov.uk/view-right-to-work',
    pinned: true,
  },
  {
    id: 'sharecode_status',
    profileId: 'default',
    category: 'immigration',
    title: 'Share Code — Immigration Status',
    titleRu: 'Share Code — Иммиграционный статус',
    number: 'SNX F8D 75D',
    validFrom: '',
    validUntil: '2026-07-20',
    notes: 'Prove status → gov.uk/check-immigration-status',
    notesRu: 'Подтвердить статус → gov.uk/check-immigration-status',
    pinned: false,
  },
]

export const EMPTY_DOC: Omit<Doc, 'id' | 'profileId'> = {
  category: 'immigration',
  title: '', titleRu: '',
  number: '', validFrom: '', validUntil: '',
  notes: '', notesRu: '',
  pinned: false,
}

export const EMPTY_PASSPORT = {
  type: 'Ukrainian Passport',
  number: '',
  issuedBy: '',
  issuedDate: '',
  expiryDate: '',
  notes: '',
  photos: [],
}

export const NATIONALITIES = [
  'Ukrainian', 'Russian', 'British', 'Polish', 'Romanian',
  'German', 'French', 'Indian', 'Pakistani', 'Other',
]

export const AVATARS = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧']
