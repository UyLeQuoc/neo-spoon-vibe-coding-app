import { atom, type MapStore, map } from 'nanostores'
import { fs, path as nodePath, initializeZenFS } from '~/lib/zenfs'
import { workbenchStore } from '~/lib/stores/workbench'
import type { BoltAction } from '~/types/actions'
import { createScopedLogger } from '~/utils/logger'
import { unreachable } from '~/utils/unreachable'
import type { ActionCallbackData } from './message-parser'

const logger = createScopedLogger('ActionRunner')

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed'

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>
  abort: () => void
  executed: boolean
  abortSignal: AbortSignal
}

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>
    error: string
  }

export type ActionState = BaseActionState | FailedActionState

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string })

type ActionsMap = MapStore<Record<string, ActionState>>

export class ActionRunner {
  runnerId = atom<string>(`${Date.now()}`)
  #currentExecutionPromise: Promise<void> = Promise.resolve()

  actions: ActionsMap = map({})

  constructor() {
    // Terminal functionality removed
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data

    const actions = this.actions.get()
    const action = actions[actionId]

    if (action) {
      // action already added
      return
    }

    const abortController = new AbortController()

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort()
        this.#updateAction(actionId, { status: 'aborted' })
      },
      abortSignal: abortController.signal
    })

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' })
    })
  }

  async runAction(data: ActionCallbackData) {
    const { actionId } = data
    const action = this.actions.get()[actionId]

    if (!action) {
      unreachable(`Action ${actionId} not found`)
    }

    if (action.executed) {
      return
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: true })

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId)
      })
      .catch(error => {
        console.error('Action failed:', error)
      })
  }

  async #executeAction(actionId: string) {
    const action = this.actions.get()[actionId]

    this.#updateAction(actionId, { status: 'running' })

    try {
      switch (action.type) {
        case 'shell': {
          await this.#runShellAction(action)
          break
        }
        case 'file': {
          await this.#runFileAction(action)
          break
        }
      }

      this.#updateAction(actionId, { status: action.abortSignal.aborted ? 'aborted' : 'complete' })
    } catch (error) {
      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' })

      // re-throw the error to be caught in the promise chain
      throw error
    }
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action')
    }

    // Terminal functionality has been removed
    // Shell actions are no longer supported
    logger.warn('Shell actions are not supported - terminal functionality has been removed')
    throw new Error('Shell actions are not supported - terminal functionality has been removed')
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action')
    }

    await initializeZenFS()

    let folder = nodePath.dirname(action.filePath)

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '')

    if (folder !== '.') {
      try {
        await fs.promises.mkdir(folder, { recursive: true })
        logger.debug('Created folder', folder)
      } catch (error) {
        logger.error('Failed to create folder\n\n', error)
      }
    }

    try {
      await fs.promises.writeFile(action.filePath, action.content, 'utf8')
      logger.debug(`File written ${action.filePath}`)

      // Auto-detect site HTML files and add preview
      // Pattern: /sites/{site_id}/index.html (handles both absolute and relative paths)
      const siteHtmlPattern = /(?:^|\/)sites\/([^/]+)\/index\.html$/
      const match = action.filePath.match(siteHtmlPattern)
      if (match) {
        const siteId = match[1]
        const previewUrl = `/preview/${siteId}`
        workbenchStore.previewUrl.set(previewUrl)
        logger.debug(`Added preview for site ${siteId}: ${previewUrl}`)
      }
    } catch (error) {
      logger.error('Failed to write file\n\n', error)
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get()

    this.actions.setKey(id, { ...actions[id], ...newState })
  }
}
