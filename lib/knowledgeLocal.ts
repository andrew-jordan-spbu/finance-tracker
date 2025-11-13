// Простая обертка над IndexedDB для локальных авто-сохранений заметок
// Хранит черновики по id заметки

type LocalNoteDraft = {
  id: string
  title: string
  content: string
  updatedAt: number
}

const DB_NAME = 'knowledge-local'
const STORE_NAME = 'notes'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getLocalNote(id: string): Promise<LocalNoteDraft | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => resolve((req.result as LocalNoteDraft) || null)
    req.onerror = () => reject(req.error)
  })
}

export async function setLocalNote(draft: LocalNoteDraft): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(draft)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function removeLocalNote(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}


