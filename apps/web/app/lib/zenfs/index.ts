import { configure, fs } from '@zenfs/core'
import * as path from '@zenfs/core/path'

interface ZenFSContext {
  initialized: boolean
}

const zenfsContext: ZenFSContext = { initialized: false }

let zenfsInitialized: Promise<void> | null = null

export async function initializeZenFS(): Promise<void> {
  if (zenfsContext.initialized) return
  if (zenfsInitialized) return zenfsInitialized

  zenfsInitialized = Promise.resolve().then(async () => {
    const { IndexedDB } = await import('@zenfs/dom')
    await configure({ mounts: { '/': { backend: IndexedDB } } })

    zenfsContext.initialized = true
  })

  return zenfsInitialized
}

export { fs, path }
export { fs as zenfs }
