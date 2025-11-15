import { configure, fs } from '@zenfs/core'
import { IndexedDB } from '@zenfs/dom'
import { WORK_DIR } from '~/utils/constants'

interface ZenFSContext {
  initialized: boolean
}

export const zenfsContext: ZenFSContext = import.meta.hot?.data.zenfsContext ?? {
  initialized: false
}

if (import.meta.hot) {
  import.meta.hot.data.zenfsContext = zenfsContext
}

let zenfsInitialized: Promise<void> | null = null

export async function initializeZenFS(): Promise<void> {
  if (zenfsContext.initialized) {
    return
  }

  if (zenfsInitialized) {
    return zenfsInitialized
  }

  zenfsInitialized = Promise.resolve()
    .then(async () => {
      await configure({
        mounts: {
          '/': { backend: IndexedDB }
        }
      })

      // Ensure work directory exists
      try {
        await fs.promises.mkdir(WORK_DIR, { recursive: true })
      } catch (error) {
        // Directory might already exist, ignore
      }

      zenfsContext.initialized = true
    })

  return zenfsInitialized
}

// Initialize ZenFS automatically if not in SSR
if (!import.meta.env.SSR) {
  initializeZenFS()
}

export { fs }
export { fs as zenfs }

