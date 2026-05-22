export interface Profile {
  id: string
  name: string
  nameRu: string
  dob: string
  nationality: string
  avatar: string // base64 or emoji
  createdAt: string
}

export interface PassportPhoto {
  id: string
  label: string
  labelRu: string
  dataUrl: string // base64
  addedAt: string
}

export interface Passport {
  id: string
  profileId: string
  type: string       // e.g. "Ukrainian", "UK BRP"
  number: string
  issuedBy: string
  issuedDate: string
  expiryDate: string
  notes: string
  photos: PassportPhoto[]
}

export interface Doc {
  id: string
  profileId: string
  category: string
  title: string
  titleRu: string
  number: string
  validFrom: string
  validUntil: string
  notes: string
  notesRu: string
  pinned: boolean
}

export interface Category {
  id: string
  label: string
  labelRu: string
  icon: string
  color: string
}
