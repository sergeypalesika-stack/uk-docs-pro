export interface Doc {
  id: string
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
