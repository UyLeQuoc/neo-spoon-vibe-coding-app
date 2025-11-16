import { getEncoding } from 'istextorbinary'
import { map, type MapStore } from 'nanostores'
import { fs, initializeZenFS, path } from '~/lib/zenfs'
import { WORK_DIR } from '~/utils/constants'
import { computeFileModifications, type FileModifications } from '~/utils/diff'
import { createScopedLogger } from '~/utils/logger'
import { unreachable } from '~/utils/unreachable'

const logger = createScopedLogger('FilesStore')

const utf8TextDecoder = new TextDecoder('utf8', { fatal: true })

export interface File {
  type: 'file'
  content: string
  isBinary: boolean
}

export interface Folder {
  type: 'folder'
}

type Dirent = File | Folder

export type FileMap = Record<string, Dirent | undefined>

export class FilesStore {
  /**
   * Tracks the number of files without folders.
   */
  #size = 0

  /**
   * @note Keeps track all modified files with their original content since the last user message.
   * Needs to be reset when the user sends another message and all changes have to be submitted
   * for the model to be aware of the changes.
   */
  #modifiedFiles: Map<string, string> = import.meta.hot?.data.modifiedFiles ?? new Map()

  /**
   * Map of files that matches the state of ZenFS.
   */
  files: MapStore<FileMap> = import.meta.hot?.data.files ?? map({})

  get filesCount() {
    return this.#size
  }

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.files = this.files
      import.meta.hot.data.modifiedFiles = this.#modifiedFiles
    }

    this.#init()
  }

  getFile(filePath: string) {
    const dirent = this.files.get()[filePath]

    if (dirent?.type !== 'file') {
      return undefined
    }

    return dirent
  }

  getFileModifications(): FileModifications | undefined {
    return computeFileModifications(this.files.get(), this.#modifiedFiles)
  }

  resetFileModifications() {
    this.#modifiedFiles.clear()
  }

  async saveFile(filePath: string, content: string) {
    await initializeZenFS()

    try {
      // Ensure path is absolute and within work directory
      const normalizedPath = filePath.startsWith(WORK_DIR) ? filePath : path.join(WORK_DIR, filePath)

      const oldContent = this.getFile(filePath)?.content

      if (!oldContent) {
        unreachable('Expected content to be defined')
      }

      // Ensure directory exists
      const dir = path.dirname(normalizedPath)
      try {
        await fs.promises.mkdir(dir, { recursive: true })
      } catch {
        // Directory might already exist
      }

      await fs.promises.writeFile(normalizedPath, content, 'utf8')

      if (!this.#modifiedFiles.has(filePath)) {
        this.#modifiedFiles.set(filePath, oldContent)
      }

      // Update the file immediately
      this.files.setKey(filePath, { type: 'file', content, isBinary: false })

      logger.info('File updated')
    } catch (error) {
      logger.error('Failed to update file content\n\n', error)

      throw error
    }
  }

  async #init() {
    await initializeZenFS()
    // Load existing files from ZenFS
    await this.#loadFilesFromZenFS()
  }

  async #loadFilesFromZenFS() {
    try {
      await this.#loadDirectory(WORK_DIR)
    } catch (error) {
      logger.error('Failed to load files from ZenFS\n\n', error)
    }
  }

  async #loadDirectory(dirPath: string) {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        const relativePath = fullPath.startsWith(WORK_DIR) ? fullPath : path.join(WORK_DIR, fullPath)

        if (entry.isDirectory()) {
          // Skip node_modules and .git
          if (entry.name === 'node_modules' || entry.name === '.git') {
            continue
          }
          this.files.setKey(relativePath, { type: 'folder' })
          await this.#loadDirectory(fullPath)
        } else if (entry.isFile()) {
          this.#size++
          try {
            const buffer = await fs.promises.readFile(fullPath)
            const isBinary = isBinaryFile(buffer)
            const content = isBinary ? '' : this.#decodeFileContent(buffer)
            this.files.setKey(relativePath, { type: 'file', content, isBinary })
          } catch (error) {
            logger.error(`Failed to read file ${fullPath}\n\n`, error)
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet
      if ((error as any).code !== 'ENOENT') {
        logger.error(`Failed to load directory ${dirPath}\n\n`, error)
      }
    }
  }

  #decodeFileContent(buffer?: Uint8Array) {
    if (!buffer || buffer.byteLength === 0) {
      return ''
    }

    try {
      return utf8TextDecoder.decode(buffer)
    } catch (error) {
      console.log(error)
      return ''
    }
  }
}

function isBinaryFile(buffer: Uint8Array | undefined) {
  if (buffer === undefined) {
    return false
  }

  return getEncoding(convertToBuffer(buffer), { chunkLength: 100 }) === 'binary'
}

/**
 * Converts a `Uint8Array` into a Node.js `Buffer` by copying the prototype.
 * The goal is to  avoid expensive copies. It does create a new typed array
 * but that's generally cheap as long as it uses the same underlying
 * array buffer.
 */
function convertToBuffer(view: Uint8Array): Buffer {
  const buffer = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)

  Object.setPrototypeOf(buffer, Buffer.prototype)

  return buffer as Buffer
}
