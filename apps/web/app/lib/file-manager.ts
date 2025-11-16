import { configure, fs } from '@zenfs/core'
import * as path from '@zenfs/core/path'
import { IndexedDB } from '@zenfs/dom'

export class ZenFsFileManager {
  constructor(protected workspaceDir = '/workspace') {}

  async mount(): Promise<void> {
    console.log('⚡️ Mounting workspace at', this.workspaceDir)
    await configure({ mounts: { [this.workspaceDir]: { backend: IndexedDB } } })
    console.log('✅ Filesystem configured')
  }

  async readFile(filePath: string): Promise<Uint8Array> {
    console.log('📂 Reading file from', filePath)
    filePath = ensureLeadingSlash(filePath)
    const workspaceFilePath = path.join(this.workspaceDir, filePath)
    const content = await fs.promises.readFile(workspaceFilePath)
    console.log('✅ File read from', filePath, '(', content.byteLength, 'bytes )')
    return content
  }

  async listFiles(): Promise<string[]> {
    console.log('📄 Listing files in workspace')
    const files = await fs.promises.readdir(this.workspaceDir, {
      withFileTypes: true,
      recursive: true
    })
    const result = files
      .filter(f => f.isFile())
      .map(f => path.resolve(f.parentPath, f.name))
      .map(ensureLeadingSlash)
    console.log('✅ Files currently in workspace', result)
    return result
  }

  async writeFile(filePath: string, content: string | Uint8Array): Promise<void> {
    console.log('✍️ Writing file to', filePath)
    filePath = ensureLeadingSlash(filePath)
    const workspaceFilePath = path.join(this.workspaceDir, filePath)
    const dir = path.dirname(workspaceFilePath)
    await fs.promises.mkdir(dir, { recursive: true })
    const contentBytes = typeof content === 'string' ? new TextEncoder().encode(content) : content
    await fs.promises.writeFile(workspaceFilePath, contentBytes)
    console.log('✅ File written to', filePath, '(', contentBytes.byteLength, 'bytes )')
  }

  async removeFile(filePath: string): Promise<void> {
    console.log('🗑️ Removing file at', filePath)
    filePath = ensureLeadingSlash(filePath)
    const workspaceFilePath = path.join(this.workspaceDir, filePath)
    await fs.promises.rm(workspaceFilePath)
    console.log('✅ File removed at', filePath)
  }

  async clear(): Promise<void> {
    console.log('🧹 Clearing workspace directory (', this.workspaceDir, ')')
    const files = await fs.promises.readdir(this.workspaceDir, {
      withFileTypes: true
    })
    for (const file of files) {
      const filePath = path.join(file.parentPath, file.name)
      await fs.promises.rm(filePath, { recursive: true, force: true })
    }
    console.log('✅ Workspace directory cleared, removed', files.length, 'items')
  }

  unmount(): void {
    console.log('🚪 Unmounting workspace directory (', this.workspaceDir, ')')
    fs.umount(this.workspaceDir)
  }
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}
