import { configure, fs } from '@zenfs/core'
import * as path from '@zenfs/core/path'
import { IndexedDB } from '@zenfs/dom'
import { WORK_DIR } from '~/utils/constants'

interface ZenFSContext {
  initialized: boolean
}

const zenfsContext: ZenFSContext = { initialized: false }

let zenfsInitialized: Promise<void> | null = null

export async function initializeZenFS(): Promise<void> {
  if (zenfsContext.initialized) return
  if (zenfsInitialized) return zenfsInitialized

  zenfsInitialized = Promise.resolve().then(async () => {
    await configure({ mounts: { '/': { backend: IndexedDB } } })

    // Ensure work directory exists
    try {
      await fs.promises.mkdir(WORK_DIR, { recursive: true })
    } catch {
      // Directory might already exist, ignore
    }

    zenfsContext.initialized = true
  })

  return zenfsInitialized
}

export { fs, path }
export { fs as zenfs }
