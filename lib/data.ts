import { Category, Doc, Profile, Passport } from './types'

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
  { id: 't1',  text: 'Book F-Gas training centre near Oxford',       textRu: 'Записаться на курс F-Gas рядом с Оксфордом',     done: false, week: 0, category: 'qualification' },
  { id: 't2',  text: 'Download CITB HS&E revision app (free)',       textRu: 'Скачать приложение CITB для подготовки',          done: false, week: 0, category: 'qualification' },
  { id: 't3',  text: 'Get UK SIM card (EE or Giffgaff)',             textRu: 'Купить UK SIM-карту (EE или Giffgaff)',           done: false, week: 1, category: 'other' },
  { id: 't4',  text: 'Apply for National Insurance number',          textRu: 'Подать заявку на National Insurance номер',       done: false, week: 1, category: 'tax' },
  { id: 't5',  text: 'Open Monzo bank account',                      textRu: 'Открыть банковский счёт Monzo',                   done: false, week: 1, category: 'banking' },
  { id: 't6',  text: 'Register self-employed with HMRC',             textRu: 'Зарегистрироваться как самозанятый в HMRC',       done: false, week: 1, category: 'tax' },
  { id: 't7',  text: 'Book CITB HS&E test at citb.co.uk',           textRu: 'Записаться на тест CITB на citb.co.uk',           done: false, week: 1, category: 'qualification' },
  { id: 't8',  text: 'Sit CITB Health & Safety test (£22.50)',       textRu: 'Сдать тест CITB по охране труда (£22.50)',        done: false, week: 2, category: 'qualification' },
  { id: 't9',  text: 'Apply for CSCS Green Labourer Card (£36)',     textRu: 'Подать на карту CSCS Green Labourer (£36)',       done: false, week: 2, category: 'qualification' },
  { id: 't10', text: 'Complete F-Gas course — 4 days',               textRu: 'Пройти курс F-Gas — 4 дня',                      done: false, week: 3, category: 'qualification' },
  { id: 't11', text: 'Pass F-Gas assessment — City & Guilds 2079',   textRu: 'Сдать экзамен F-Gas — City & Guilds 2079',       done: false, week: 4, category: 'qualification' },
  { id: 't12', text: 'Register with REFCOM (refcom.org.uk)',         textRu: 'Зарегистрироваться в REFCOM',                    done: false, week: 4, category: 'qualification' },
  { id: 't13', text: 'Get D1 form from Post Office',                 textRu: 'Получить форму D1 в Post Office',                done: false, week: 5, category: 'driving' },
  { id: 't14', text: 'Get certified translation of Ukrainian licence',textRu: 'Заверенный перевод украинских прав',             done: false, week: 5, category: 'driving' },
  { id: 't15', text: 'Post D1 pack to DVLA — Special Delivery',     textRu: 'Отправить D1 в DVLA — Special Delivery',         done: false, week: 6, category: 'driving' },
]

export const DEFAULT_PROFILE: Profile = {
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

export const EMPTY_PASSPORT: Omit<Passport, 'id' | 'profileId'> = {
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
