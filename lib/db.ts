import { createClient } from './supabase'
import { DEFAULT_TODOS } from './data'

const sb = () => createClient()

// ── ПРОФИЛЬ ────────────────────────────────────────
export async function getProfile(userId: string) {
  const { data } = await sb().from('profiles').select('*').eq('id', userId).single()
  возвращаемые данные
}

export async function upsertProfile(userId: string, fields: {
  имя?: строка; имя_ru?: строка; дата рождения?: строка; национальность?: строка; аватар?: строка
}) {
  return sb().from('profiles').upsert({ id: userId, ...fields }, { onConflict: 'id' })
}

// ── ДОКУМЕНТЫ ───────────────────────────────────────
export async function getDocs(userId: string) {
  const { data } = await sb().from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  возвращаемые данные ?? []
}

export async function addDoc(userId: string, doc: {
  category: string; title: string; title_ru: string; number: string
  valid_from: string | null; valid_until: string | null; notes: string; notes_ru: string; pinned: boolean
}) {
  const { data } = await sb().from('documents').insert({ user_id: userId, ...doc }).select().single()
  возвращаемые данные
}

export async function updateDoc(id: string, fields: Partial<{
  pinned: boolean; title: string; title_ru: string
  число: строка; valid_from: строка | null; valid_until: строка | null
  notes: string; notes_ru: string; category: string
}>) {
  return sb().from('documents').update(fields).eq('id', id)
}

export async function deleteDoc(id: string) {
  return sb().from('documents').delete().eq('id', id)
}

// ── ПАСПОРТА ───────────────────────────────────────
export async function getPassports(userId: string) {
  const { data } = await sb()
    .from('passports')
    .select('*, passport_photos(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  возвращаемые данные ?? []
}

export async function addPassport(userId: string, p: {
  тип: строка; номер: строка; выдан: строка
  issued_date: string | null; expiry_date: string | null; notes: string
}) {
  const { data } = await sb().from('passports').insert({ user_id: userId, ...p }).select().single()
  возвращаемые данные
}

export async function deletePassport(id: string) {
  return sb().from('passports').delete().eq('id', id)
}

export async function addPassportPhoto(passportId: string, userId: string, label: string, dataUrl: string) {
  const { data } = await sb().from('passport_photos')
    .insert({ passport_id: passportId, user_id: userId, label, data_url: dataUrl })
    .select().single()
  возвращаемые данные
}

export async function deletePassportPhoto(id: string) {
  return sb().from('passport_photos').delete().eq('id', id)
}

// ── TODOS ───────────────────────────────────────────
export async function getTodos(userId: string) {
  const { data: rows } = await sb().from('todos').select('*').eq('user_id', userId)
  // Объединить со списком задач по умолчанию, применив сохраненные состояния выполнения.
  return DEFAULT_TODOS.map(t => ({
    ...т,
    выполнено: строки?.find(r => r.todo_key === t.id)?.done ?? false,
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

// ── Стандартная документация SEED для новых пользователей ───────────────────
export async function seedDefaultDocs(userId: string) {
  const existing = await getDocs(userId)
  if (existing.length > 0) return // документация уже есть

  const defaults = [
    { category: 'immigration', title: 'eVisa — Homes for Ukraine', title_ru: 'eVisa — Homes for Ukraine', number: '', valid_from: '2026-03-10', valid_until: '2027-09-10', notes: 'Status: Homes for Ukraine', notes_ru: 'Статус: Homes for Ukraine', pinned: true },
    { category: 'иммиграция', title: 'Кодекс социального обеспечения — Право на работу', title_ru: 'Кодекс социального обеспечения — Право на работу', number: 'WZL F8D 7A4', valid_from: null, valid_until: '2026-07-20', notes: 'gov.uk/view-right-to-work', notes_ru: 'gov.uk/view-right-to-work', pinned: true },
    { категория: 'иммиграция', title: 'Код акции — Иммиграционный статус', title_ru: 'Код акции - Иммиграционный статус', номер: 'SNX F8D 75D', valid_from: null, valid_until: '2026-07-20', примечания: 'gov.uk/check-immigration-status', Notes_ru: 'gov.uk/check-immigration-status', закреплено: false },
  ]
  for (const doc of defaults) {
    await addDoc(userId, doc)
  }
}

// ── АДРЕСА ───────────────────────────────────────
экспорт интерфейса Адрес {
  id: строка
  user_id: string
  метка: строка
  label_ru: string
  строка1: строка
  строка2: строка
  город: строка
  почтовый индекс: строка
  страна: строка
  примечания: строка
  is_home: логическое значение
  цвет: строка
  created_at: string
}

export async function getAddresses(userId: string) {
  const { data } = await sb()
    .from('addresses')
    .выбирать('*')
    .eq('user_id', userId)
    .order('is_home', { ascending: false })
    .order('created_at', { ascending: true })
  return (data ?? []) as Address[]
}

export async function addAddress(userId: string, addr: Omit<Address, 'id' | 'user_id' | 'created_at'>) {
  const { data } = await sb().from('addresses').insert({ user_id: userId, ...addr }).select().single()
  возвращаемые данные в виде адреса | null
}

export async function updateAddress(id: string, fields: Partial<Omit<Address, 'id' | 'user_id'>>) {
  return sb().from('addresses').update(fields).eq('id', id)
}

export async function deleteAddress(id: string) {
  return sb().from('addresses').delete().eq('id', id)
}

export async function setHomeAddress(userId: string, id: string) {
  // Сначала снимите все флаги домашнего поля
  await sb().from('addresses').update({ is_home: false }).eq('user_id', userId)
  // установить новый дом
  return sb().from('addresses').update({ is_home: true }).eq('id', id)
}

// ── ФОТОГРАФИИ ДОКУМЕНТА ──────────────────────────────────
экспорт интерфейса DocPhoto {
  id: строка
  document_id: string
  user_id: string
  метка: строка
  data_url: string
  added_at: string
}

export async function getDocPhotos(documentId: string) {
  const { data } = await sb()
    .from('document_photos')
    .выбирать('*')
    .eq('document_id', documentId)
    .order('added_at', { ascending: true })
  return (data ?? []) as DocPhoto[]
}

export async function addDocPhoto(documentId: string, userId: string, label: string, dataUrl: string) {
  const { data } = await sb()
    .from('document_photos')
    .insert({ document_id: documentId, user_id: userId, label, data_url: dataUrl })
    .select().single()
  возвращать данные в формате DocPhoto | null
}

export async function deleteDocPhoto(id: string) {
  return sb().from('document_photos').delete().eq('id', id)
}

// Получить все документы с фотографиями
export async function getDocsWithPhotos(userId: string) {
  const { data } = await sb()
    .from('documents')
    .select('*, document_photos(*), document_files(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  возвращаемые данные ?? []
}

// ── Хранилище SUPABase (для фотографий) ─────────────────────
export async function uploadPhotoToStorage(
  userId: строка,
  файл: Blob,
  путь: строка
): Promise<string | null> {
  const { data, error } = await sb()
    .хранилище
    .from('photos')
    .upload(`${userId}/${path}`, file, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  if (error) { console.error('Ошибка загрузки в хранилище:', error); return null }
  const { data: urlData } = sb().storage.from('photos').getPublicUrl(data.path)
  return urlData.publicUrl
}

export async function deletePhotoFromStorage(userId: string, path: string) {
  return sb().storage.from('photos').remove([`${userId}/${path}`])
}

// Обновлено: вместо base64 используется URL-адрес хранилища.
export async function addDocPhotoUrl(documentId: string, userId: string, label: string, photoUrl: string) {
  const { data } = await sb()
    .from('document_photos')
    .insert({ document_id: documentId, user_id: userId, label, data_url: photoUrl })
    .select().single()
  возвращать данные в формате DocPhoto | null
}

export async function addPassportPhotoUrl(passportId: string, userId: string, label: string, photoUrl: string) {
  const { data } = await sb()
    .from('passport_photos')
    .insert({ passport_id: passportId, user_id: userId, label, data_url: photoUrl })
    .select().single()
  возвращаемые данные
}

// ── РЕЗЮМЕ ────────────────────────────────────────
экспорт интерфейса Возобновить {
  id: строка
  user_id: string
  заголовок: строка
  направление: строка
  компания: строка
  статус: 'черновик' | 'готов' | 'отправлен' | 'интервью' | 'отклонено'
  краткое содержание: строка
  навыки: строка
  опыт: строка
  образование: строка
  примечания: строка
  цвет: строка
  закреплено: логическое значение
  created_at: string
  updated_at: string
}

export async function getResumes(userId: string) {
  const { data } = await sb()
    .from('resumes')
    .выбирать('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  return (data ?? []) as Resume[]
}

export async function addResume(userId: string, r: Omit<Resume, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data } = await sb()
    .from('resumes')
    .insert({ user_id: userId, ...r, updated_at: new Date().toISOString() })
    .select().single()
  возвращать данные в виде резюме | null
}

export async function updateResume(id: string, fields: Partial<Omit<Resume, 'id' | 'user_id'>>) {
  return sb().from('resumes').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteResume(id: string) {
  return sb().from('resumes').delete().eq('id', id)
}

// ── ФАЙЛЫ РЕЗЮМЕ ─────────────────────────────────────
экспорт интерфейса ResumeFile {
  id: строка
  resume_id: строка
  user_id: string
  имя: строка
  mime_type: string
  размер_байтов: число
  data_base64: string
  added_at: string
}

export async function getResumeFiles(resumeId: string) {
  const { data } = await sb()
    .from('resume_files')
    .выбирать('*')
    .eq('resume_id', resumeId)
    .order('added_at', { ascending: false })
  return (data ?? []) as ResumeFile[]
}

export async function addResumeFile(resumeId: string, userId: string, name: string, mimeType: string, sizeBytes: number, dataBase64: string) {
  const { data } = await sb()
    .from('resume_files')
    .insert({ resume_id: resumeId, user_id: userId, name, mime_type: mimeType, size_bytes: sizeBytes, data_base64: dataBase64 })
    .select().single()
  возвращать данные в виде ResumeFile | null
}

export async function deleteResumeFile(id: string) {
  return sb().from('resume_files').delete().eq('id', id)
}

export async function getResumesWithFiles(userId: string) {
  const { data } = await sb()
    .from('resumes')
    .select('*, resume_files(*)')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  return (data ?? []) as (Resume & { resume_files: ResumeFile[] })[]
}

// ── МЕДИЦИНСКИЙ ────────────────────────────────────────
экспорт интерфейса MedicalRecord {
  id: string; user_id: string; type: string
  заголовок: строка; значение: строка; примечания: строка
  valid_until: string | null; created_at: string
}

export async function getMedical(userId: string) {
  const { data } = await sb().from('medical').select('*').eq('user_id', userId).order('created_at')
  return (data ?? []) as MedicalRecord[]
}
export async function addMedical(userId: string, r: Omit<MedicalRecord,'id'|'user_id'|'created_at'>) {
  const { data } = await sb().from('medical').insert({ user_id: userId, ...r }).select().single()
  возвращать данные в формате MedicalRecord | null
}
export async function updateMedical(id: string, fields: Partial<MedicalRecord>) {
  return sb().from('medical').update(fields).eq('id', id)
}
export async function deleteMedical(id: string) {
  return sb().from('medical').delete().eq('id', id)
}

// ── КОНТАКТЫ НА СЛУЧАЙ ЧРЕЗВЫЧАЙНОЙ СИТУАЦИИ ────────────────────────────────
экспорт интерфейса Контакты {
  id: string; user_id: string; name: string; relation: string
  телефон: строка; заметки: строка; is_primary: логическое значение; created_at: строка
}

export async function getContacts(userId: string) {
  const { data } = await sb().from('emergency_contacts').select('*').eq('user_id', userId).order('is_primary', { ascending: false }).order('created_at')
  return (data ?? []) as Contact[]
}
export async function addContact(userId: string, c: Omit<Contact,'id'|'user_id'|'created_at'>) {
  const { data } = await sb().from('emergency_contacts').insert({ user_id: userId, ...c }).select().single()
  возвращать данные в виде контакта | null
}
export async function updateContact(id: string, fields: Partial<Contact>) {
  return sb().from('emergency_contacts').update(fields).eq('id', id)
}
export async function deleteContact(id: string) {
  return sb().from('emergency_contacts').delete().eq('id', id)
}

// ── ФАЙЛЫ ДОКУМЕНТОВ ────────────────────────────────────
экспорт интерфейса DocFile {
  id: string; document_id: string; user_id: string
  имя: строка; MIME-тип: строка; размер в байтах: число
  data_base64: string; added_at: string
}
export async function getDocFiles(documentId: string) {
  const { data } = await sb().from('document_files').select('*').eq('document_id', documentId).order('added_at')
  return (data || []) as DocFile[]
}
export async function addDocFile(documentId: string, userId: string, name: string, mimeType: string, sizeBytes: number, dataBase64: string) {
  const { data } = await sb().from('document_files').insert({ document_id: documentId, user_id: userId, name, mime_type: mimeType, size_bytes: sizeBytes, data_base64: dataBase64 }).select().single()
  возвращать данные в формате DocFile | null
}
export async function deleteDocFile(id: string) {
  return sb().from('document_files').delete().eq('id', id)
}
