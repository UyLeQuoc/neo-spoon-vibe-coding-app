import type { NeoLineN3 } from './types'

// Declare window extension
declare global {
  interface Window {
    NEOLineN3?: {
      Init: (() => NeoLineN3) | (new () => NeoLineN3)
    }
  }
}

/**
 * Initialize NeoLine N3 SDK
 * NeoLine extension injects SDK directly into window.NEOLineN3
 * @returns Promise that resolves to NeoLineN3 instance or null if not available
 */
export async function initNeoLineN3(): Promise<NeoLineN3 | null> {
  if (typeof window === 'undefined') {
    return null
  }

  // Check if SDK is already available
  if (window.NEOLineN3) {
    try {
      return createNeoLineInstance()
    } catch (error) {
      console.error('Failed to initialize NeoLine N3:', error)
      return null
    }
  }

  // Wait for SDK to be injected by extension
  return new Promise((resolve) => {
    let resolved = false
    let checkCount = 0
    const maxChecks = 20 // 2 seconds max wait

    const readyHandler = () => {
      if (resolved) return
      try {
        const instance = createNeoLineInstance()
        if (instance) {
          resolved = true
          window.removeEventListener('NEOLine.N3.EVENT.READY', readyHandler)
          if (checkInterval) {
            clearInterval(checkInterval)
          }
          resolve(instance)
        }
      } catch (error) {
        console.error('Failed to initialize NeoLine N3 in ready handler:', error)
      }
    }

    // Listen for READY event
    window.addEventListener('NEOLine.N3.EVENT.READY', readyHandler)

    // Poll for SDK availability
    const checkInterval = setInterval(() => {
      checkCount++
      if (window.NEOLineN3) {
        try {
          const instance = createNeoLineInstance()
          if (instance) {
            resolved = true
            clearInterval(checkInterval)
            window.removeEventListener('NEOLine.N3.EVENT.READY', readyHandler)
            resolve(instance)
          }
        } catch (error) {
          console.error('Failed to initialize NeoLine N3 in poll:', error)
        }
      } else if (checkCount >= maxChecks) {
        // Timeout after 2 seconds
        resolved = true
        clearInterval(checkInterval)
        window.removeEventListener('NEOLine.N3.EVENT.READY', readyHandler)
        resolve(null)
      }
    }, 100)
  })
}

/**
 * Create NeoLine N3 instance from window.NEOLineN3
 * Handles both constructor and function initialization
 */
function createNeoLineInstance(): NeoLineN3 | null {
  if (!window.NEOLineN3) {
    return null
  }

  const Init = window.NEOLineN3.Init as any

  try {
    // Try as constructor first
    return new Init()
  } catch (constructorError) {
    try {
      // Try as function
      return Init()
    } catch (functionError) {
      console.error('Failed to initialize NeoLine as constructor:', constructorError)
      console.error('Failed to initialize NeoLine as function:', functionError)
      return null
    }
  }
}

/**
 * Check if NeoLine extension is installed
 */
export function isNeoLineInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return !!window.NEOLineN3
}

/**
 * Wait for NeoLine extension to be ready
 * @param timeoutMs Maximum time to wait in milliseconds (default: 2000)
 */
export async function waitForNeoLine(timeoutMs: number = 2000): Promise<NeoLineN3 | null> {
  if (typeof window === 'undefined') {
    return null
  }

  // If already available, return immediately
  if (window.NEOLineN3) {
    return createNeoLineInstance()
  }

  return new Promise((resolve) => {
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(null)
      }
    }, timeoutMs)

    const readyHandler = () => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      window.removeEventListener('NEOLine.N3.EVENT.READY', readyHandler)
      const instance = createNeoLineInstance()
      resolve(instance)
    }

    window.addEventListener('NEOLine.N3.EVENT.READY', readyHandler)

    // Also check immediately in case event already fired
    if (window.NEOLineN3) {
      readyHandler()
    }
  })
}

