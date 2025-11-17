import { useLocation, useNavigate } from 'react-router'
import type { UIMessage } from 'ai'
import { atom } from 'nanostores'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { workbenchStore } from '~/lib/stores/workbench'
import { getMessages, getNextId, getUrlId, openDatabase, setMessages } from './db'

export interface ChatHistoryItem {
  id: string
  urlId?: string
  description?: string
  messages: UIMessage[]
  timestamp: string
}

// export const db = persistenceEnabled ? await openDatabase() : undefined

export const chatId = atom<string | undefined>(undefined)
export const description = atom<string | undefined>(undefined)

export function useChatHistory() {
  const navigate = useNavigate()
  const location = useLocation()

  // Extract id from path /chat/{id}
  const pathMatch = location.pathname.match(/^\/chat\/(.+)$/)
  const mixedId = pathMatch ? pathMatch[1] : undefined

  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [ready, setReady] = useState<boolean>(false)
  const [urlId, setUrlId] = useState<string | undefined>()

  useEffect(() => {
    console.log('[useChatHistory] 🪲🪲🪲 mixedId', mixedId)
    if (mixedId) {
      //if mixedid starts with github.com, get project and add workbench artifacts
      if (mixedId.startsWith('github.com')) {
        const url = new URL(`https://${mixedId}`)
        const path = url.pathname.split('/')
        const owner = path[1]
        const repo = path[2]

        workbenchStore.importFromGitHub(owner, repo).then(() => {
          setInitialMessages([
            {
              id: '1',
              parts: [{ type: 'text', text: 'I see you have a project from GitHub. How can I help you?' }],
              role: 'assistant'
            }
          ])
          setUrlId(repo)
          description.set(repo)
          chatId.set(repo)
          setReady(true)
        })
      } else {
        openDatabase().then(db => {
          if (!db) return

          getMessages(db, mixedId)
            .then(storedMessages => {
              if (storedMessages && storedMessages.messages.length > 0) {
                setInitialMessages(storedMessages.messages)
                setUrlId(storedMessages.urlId)
                description.set(storedMessages.description)
                chatId.set(storedMessages.id)
              } else {
                navigate(`/`, { replace: true })
              }

              setReady(true)
            })
            .catch(error => {
              toast.error(error.message)
            })
        })
      }
    }
  }, [mixedId, navigate])

  return {
    ready: !mixedId || ready,
    initialMessages,
    storeMessageHistory: async (messages: UIMessage[]) => {
      const db = await openDatabase()
      if (!db || messages.length === 0) return

      const { firstArtifact } = workbenchStore

      if (!urlId && firstArtifact?.id) {
        const urlId = await getUrlId(db, firstArtifact.id)

        navigateChat(urlId)
        setUrlId(urlId)
      }

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title)
      }

      if (initialMessages.length === 0 && !chatId.get()) {
        const nextId = await getNextId(db)

        chatId.set(nextId)

        if (!urlId) {
          navigateChat(nextId)
        }
      }

      await setMessages(db, chatId.get() as string, messages, urlId, description.get())
    }
  }
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href)
  url.pathname = `/chat/${nextId}`

  window.history.replaceState({}, '', url)
}
