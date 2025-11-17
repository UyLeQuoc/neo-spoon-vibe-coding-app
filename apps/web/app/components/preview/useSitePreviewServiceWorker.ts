import { useEffect, useState } from 'react'

export interface UseSitePreviewServiceWorkerOptions {
  isReady?: boolean
  scope?: string
  swPath?: string
  timeout?: number
}

export interface UseSitePreviewServiceWorkerResult {
  isLoading: boolean
  error: string | null
  isReady: boolean
}

export function useSitePreviewServiceWorker({
  isReady: fileManagerReady = true,
  scope = '/preview/',
  swPath = '/site-preview-sw.mjs',
  timeout = 15000
}: UseSitePreviewServiceWorkerOptions = {}): UseSitePreviewServiceWorkerResult {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!fileManagerReady) {
      setIsLoading(true)
      setError(null)
      setIsReady(false)
      return
    }

    let timeoutId: NodeJS.Timeout | null = null

    const setupServiceWorker = async () => {
      try {
        console.log('[useSitePreviewSW] Starting service worker setup')
        setIsLoading(true)
        setError(null)

        timeoutId = setTimeout(() => {
          setError('Setup timeout')
          setIsLoading(false)
        }, timeout)

        if (!('serviceWorker' in navigator)) throw new Error('Service Workers not supported')

        const sw = navigator.serviceWorker

        const registrations = await sw.getRegistrations()
        for (const reg of registrations) {
          if (reg.scope.includes(scope)) {
            await reg.unregister()
          }
        }

        const registration = await sw.register(swPath, { scope })

        if (registration.installing) {
          await new Promise<void>(resolve => {
            const worker = registration.installing
            if (!worker) {
              resolve()
              return
            }
            const checkState = () => {
              if (worker.state === 'activated') {
                worker.removeEventListener('statechange', checkState)
                resolve()
              }
            }
            worker.addEventListener('statechange', checkState)
            checkState()
          })
        }

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        } else if (registration.active) {
          registration.active.postMessage({ type: 'SKIP_WAITING' })
        }

        if (timeoutId) clearTimeout(timeoutId)
        setIsReady(true)
        setIsLoading(false)
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId)
        setError(err instanceof Error ? err.message : 'Failed to setup')
        setIsLoading(false)
      }
    }

    setupServiceWorker()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [fileManagerReady, scope, swPath, timeout])

  return { isLoading, error, isReady }
}
