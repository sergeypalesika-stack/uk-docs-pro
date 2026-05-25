import { createClient } from './supabase'
import { DEFAULT_TODOS } from './data'

const sb = () => createClient()

// ── PROFILE ──────────────────────────────────────────
export async function getProfile(userId: string) {
  const { data } = await sb().from('profiles').select('*').eq('id', userId).single()
  return data
}

export async function upsertProfile(userId: string, fields: {
  name?: string; name_ru?: string; dob?: string; nationality?: string; avatar?: string
}) {
  return sb().from('profiles').upsert({ id: userId, ...fields }, { onConflict: 'id' })
}

// ── DOCUMENTS ────────────────────────────────────────
export async function getDocs(userId: string) {
  const { data } = await sb().from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return data ?? []
}

export async function addDoc(userId: string, doc: {
  category: string; title: string; title_ru: string; number: string
  valid_from: string | null; valid_until: string | null; notes: string; notes_ru: string; pinned: boolean
}) {
  const { data } = await sb().from('documents').insert({ user_id: userId, ...doc }).select().single()
  return data
}

export async function updateDoc(id: string, fields: Partial<{
  pinned: boolean; title: string; title_ru: string
  number: string; valid_from: string | null; valid_until: string | null
  notes: string; notes_ru: string; category: string
}>) {
  return sb().from('documents').update(fields).eq('id', id)
}

export async function deleteDoc(id: string) {
  return sb().from('documents').delete().eq('id', id)
}

// ── PASSPORTS ────────────────────────────────────────
export async function getPassports(userId: string) {
  const { data } = await sb()
    .from('passports')
    .select('*, passport_photos(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function addPassport(userId: string, p: {
  type: string; number: string; issued_by: string
  issued_date: string | null; expiry_date: string | null; notes: string
}) {
  const { data } = await sb().from('passports').insert({ user_id: userId, ...p }).select().single()
  return data
}

export async function deletePassport(id: string) {
  return sb().from('passports').delete().eq('id', id)
}

export async function addPassportPhoto(passportId: string, userId: string, label: string, dataUrl: string) {
  const { data } = await sb().from('passport_photos')
    .insert({ passport_id: passportId, user_id: userId, label, data_url: dataUrl })
    .select().single()
  return data
}

export async function deletePassportPhoto(id: string) {
  return sb().from('passport_photos').delete().eq('id', id)
}

// ── TODOS ────────────────────────────────────────────
export async function getTodos(userId: string) {
  const { data: rows } = await sb().from('todos').select('*').eq('user_id', userId)
  // Merge with default todos list, applying saved done states
  return DEFAULT_TODOS.map(t => ({
    ...t,
    done: rows?.find(r => r.todo_key === t.id)?.done ?? false,
  }))
}

export async function toggleTodoDB(userId: string, todoKey: string, done: boolean) {
  return sb().from('todos').upsert(
    { user_id: userId, todo_key: todoKey, done },
    { onConflict: 'user_id,todo_key' }
  )
}

export async function resetTodosDB(userId: string) {
  return sb().from('todos').delete().eq('user_id', userId)
}

// ── SEED default docs for new user ──────────────────
export async function seedDefaultDocs(userId: string) {
  const existing = await getDocs(userId)
  if (existing.length > 0) return // already has docs

  const defaults = [
    { category: 'immigration', title: 'eVisa — Homes for Ukraine', title_ru: 'eVisa — Дома для Украины', number: '', valid_from: '2026-03-10', valid_until: '2027-09-10', notes: 'Status: Homes for Ukraine', notes_ru: 'Статус: Homes for Ukraine', pinned: true },
    { category: 'immigration', title: 'Share Code — Right to Work', title_ru: 'Share Code — Право на работу', number: 'WZL F8D 7A4', valid_from: null, valid_until: '2026-07-20', notes: 'gov.uk/view-right-to-work', notes_ru: 'gov.uk/view-right-to-work', pinned: true },
    { category: 'immigration', title: 'Share Code — Immigration Status', title_ru: 'Share Code — Иммиграционный статус', number: 'SNX F8D 75D', valid_from: null, valid_until: '2026-07-20', notes: 'gov.uk/check-immigration-status', notes_ru: 'gov.uk/check-immigration-status', pinned: false },
  ]
  for (const doc of defaults) {
    await addDoc(userId, doc)
  }
}

// ── ADDRESSES ────────────────────────────────────────
export interface Address {
  id: string
  user_id: string
  label: string
  label_ru: string
  line1: string
  line2: string
  city: string
  postcode: string
  country: string
  notes: string
  is_home: boolean
  color: string
  created_at: string
}

export async function getAddresses(userId: string) {
  const { data } = await sb()
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_home', { ascending: false })
    .order('created_at', { ascending: true })
  return (data ?? []) as Address[]
}

export async function addAddress(userId: string, addr: Omit<Address, 'id' | 'user_id' | 'created_at'>) {
  const { data } = await sb().from('addresses').insert({ user_id: userId, ...addr }).select().single()
  return data as Address | null
}

export async function updateAddress(id: string, fields: Partial<Omit<Address, 'id' | 'user_id'>>) {
  return sb().from('addresses').update(fields).eq('id', id)
}

export async function deleteAddress(id: string) {
  return sb().from('addresses').delete().eq('id', id)
}

export async function setHomeAddress(userId: string, id: string) {
  // unset all home flags first
  await sb().from('addresses').update({ is_home: false }).eq('user_id', userId)
  // set new home
  return sb().from('addresses').update({ is_home: true }).eq('id', id)
}
