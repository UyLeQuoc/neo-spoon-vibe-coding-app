import type { UIMessage } from 'ai'
import { createScopedLogger } from '~/utils/logger'
import type { ChatHistoryItem } from './useChatHistory'

const logger = createScopedLogger('ChatHistory')

// Singleton database instance
let dbInstance: IDBDatabase | undefined
let dbPromise: Promise<IDBDatabase | undefined> | undefined
const LOCK_NAME = 'boltHistory-db-init'

// Check if we're in a browser environment (not SSR)
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

// this is used at the top level and never rejects
export async function openDatabase(): Promise<IDBDatabase | undefined> {
  // Return undefined immediately in SSR mode
  if (!isBrowser()) return undefined

  // If database is already initialized, return it immediately
  if (dbInstance) return dbInstance

  // If initialization is in progress, wait for it
  if (dbPromise) return dbPromise

  // Use navigator.locks to ensure thread-safe initialization
  dbPromise = (async () => {
    // Check if navigator.locks is available (may not be in all environments)
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(LOCK_NAME, async _lock => {
        // Double-check pattern: another call might have initialized it while waiting for the lock
        if (dbInstance) {
          return dbInstance
        }

        // Initialize the database
        return await initializeDatabase()
      })
    } else {
      // Fallback if locks are not available
      return await initializeDatabase()
    }
  })()

  return dbPromise
}

function initializeDatabase(): Promise<IDBDatabase | undefined> {
  return new Promise(resolve => {
    // Double-check browser environment before accessing indexedDB
    if (!isBrowser() || typeof indexedDB === 'undefined') {
      resolve(undefined)
      return
    }

    const request = indexedDB.open('boltHistory', 1)

    request.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('chats')) {
        const store = db.createObjectStore('chats', { keyPath: 'id' })
        store.createIndex('id', 'id', { unique: true })
        store.createIndex('urlId', 'urlId', { unique: true })
      }
    }

    request.onsuccess = e => {
      dbInstance = (e.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    request.onerror = e => {
      logger.error((e.target as IDBOpenDBRequest).error)
      dbInstance = undefined
      dbPromise = undefined
      resolve(undefined)
    }
  })
}

export async function getAll(db: IDBDatabase): Promise<ChatHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly')
    const store = transaction.objectStore('chats')
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as ChatHistoryItem[])
    request.onerror = () => reject(request.error)
  })
}

export async function setMessages(
  db: IDBDatabase,
  id: string,
  messages: UIMessage[],
  urlId?: string,
  description?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readwrite')
    const store = transaction.objectStore('chats')

    const request = store.put({
      id,
      messages,
      urlId,
      description,
      timestamp: new Date().toISOString()
    })

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getMessages(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return (await getMessagesById(db, id)) || (await getMessagesByUrlId(db, id))
}

export async function getMessagesByUrlId(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly')
    const store = transaction.objectStore('chats')
    const index = store.index('urlId')
    const request = index.get(id)

    request.onsuccess = () => resolve(request.result as ChatHistoryItem)
    request.onerror = () => reject(request.error)
  })
}

export async function getMessagesById(db: IDBDatabase, id: string): Promise<ChatHistoryItem> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly')
    const store = transaction.objectStore('chats')
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result as ChatHistoryItem)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteById(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readwrite')
    const store = transaction.objectStore('chats')
    const request = store.delete(id)

    request.onsuccess = () => resolve(undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function getNextId(db: IDBDatabase): Promise<string> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly')
    const store = transaction.objectStore('chats')
    const request = store.getAllKeys()

    request.onsuccess = () => {
      const highestId = request.result.reduce((cur, acc) => Math.max(+cur, +acc), 0)
      resolve(String(+highestId + 1))
    }

    request.onerror = () => reject(request.error)
  })
}

export async function getUrlId(db: IDBDatabase, id: string): Promise<string> {
  const idList = await getUrlIds(db)

  if (!idList.includes(id)) {
    return id
  } else {
    let i = 2

    while (idList.includes(`${id}-${i}`)) {
      i++
    }

    return `${id}-${i}`
  }
}

async function getUrlIds(db: IDBDatabase): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chats', 'readonly')
    const store = transaction.objectStore('chats')
    const idList: string[] = []

    const request = store.openCursor()

    request.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result

      if (cursor) {
        idList.push(cursor.value.urlId)
        cursor.continue()
      } else {
        resolve(idList)
      }
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}
