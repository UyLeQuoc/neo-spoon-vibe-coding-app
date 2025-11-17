import JSZip from 'jszip'
import { atom, type MapStore, map, type ReadableAtom, type WritableAtom } from 'nanostores'
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor'
import { ActionRunner } from '~/lib/runtime/action-runner'
import type { ActionCallbackData, ArtifactCallbackData } from '~/lib/runtime/message-parser'
import { fs, initializeZenFS, path as nodePath } from '~/lib/zenfs'
import { importFromGitHub } from '~/utils/import'
import { unreachable } from '~/utils/unreachable'
import { EditorStore } from './editor'
import { type FileMap, FilesStore } from './files'

export interface ArtifactState {
  id: string
  title: string
  closed: boolean
  runner: ActionRunner
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>

type Artifacts = MapStore<Record<string, ArtifactState>>

export type WorkbenchViewType = 'code' | 'preview'

export class WorkbenchStore {
  #filesStore = new FilesStore()
  #editorStore = new EditorStore(this.#filesStore)

  artifacts: Artifacts = import.meta.hot?.data.artifacts ?? map({})

  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false)
  currentView: WritableAtom<WorkbenchViewType> = import.meta.hot?.data.currentView ?? atom('code')
  unsavedFiles: WritableAtom<Set<string>> = import.meta.hot?.data.unsavedFiles ?? atom(new Set<string>())
  previewUrl: WritableAtom<string | undefined> = import.meta.hot?.data.previewUrl ?? atom(undefined)
  modifiedFiles = new Set<string>()
  artifactIdList: string[] = []

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.artifacts = this.artifacts
      import.meta.hot.data.unsavedFiles = this.unsavedFiles
      import.meta.hot.data.showWorkbench = this.showWorkbench
      import.meta.hot.data.currentView = this.currentView
      import.meta.hot.data.previewUrl = this.previewUrl
    }
  }

  downloadProject() {
    const files = this.#filesStore.files.get()

    if (!files || Object.keys(files).length === 0) {
      console.error('No files to download.')
      return
    }

    const zip = new JSZip()

    for (const [filePath, file] of Object.entries(files)) {
      if (file && file.type === 'file') {
        let content: string | Uint8Array = file.content
        if (file.isBinary) {
          try {
            const binaryString = atob(content)
            const binaryLen = binaryString.length
            const bytes = new Uint8Array(binaryLen)
            for (let i = 0; i < binaryLen; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            content = bytes
          } catch (error) {
            console.error('Error decoding binary content for file:', filePath, error)
          }
        }

        const relativePath = filePath.replace(/^\/home\/project\//, '')
        zip.file(relativePath, content)
      } else {
        console.warn('Skipping undefined or non-file type:', filePath)
      }
    }

    zip
      .generateAsync({ type: 'base64' })
      .then(base64 => {
        const a = document.createElement('a')
        a.href = `data:application/zip;base64,${base64}`
        a.download = 'project.zip'
        a.click()
      })
      .catch(err => {
        console.error('Error generating zip file:', err)
      })
  }

  async importFromGitHub(owner: string, repo: string) {
    const project = await importFromGitHub(owner, repo)

    if (!project) {
      console.error('Failed to import project from GitHub:', owner, repo)
      return
    }
    this.setDocuments(project)

    await initializeZenFS()
    for (const filePath of Object.keys(project)) {
      if (!project[filePath]) {
        continue
      }
      if (project[filePath].type !== 'file') {
        continue
      }
      const content = project[filePath].content
      let folder = nodePath.dirname(filePath)

      // remove trailing slashes
      folder = folder.replace(/\/+$/g, '')

      if (folder !== '.') {
        try {
          await fs.promises.mkdir(folder, { recursive: true })
          console.log('Created folder', folder)
        } catch (error) {
          console.error('Failed to create folder\n\n', error)
        }
      }

      try {
        await fs.promises.writeFile(filePath, content, 'utf8')
        console.log(`File written ${filePath}`)
      } catch (error) {
        console.error('Failed to write file\n\n', error)
      }
    }
    this.showWorkbench.set(true)
  }

  get files() {
    return this.#filesStore.files
  }

  get currentDocument(): ReadableAtom<EditorDocument | undefined> {
    return this.#editorStore.currentDocument
  }

  get selectedFile(): ReadableAtom<string | undefined> {
    return this.#editorStore.selectedFile
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0])
  }

  get filesCount(): number {
    return this.#filesStore.filesCount
  }

  setDocuments(files: FileMap) {
    this.#editorStore.setDocuments(files)

    if (this.#filesStore.filesCount > 0 && this.currentDocument.get() === undefined) {
      // we find the first file and select it
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file') {
          this.setSelectedFile(filePath)
          break
        }
      }
    }
  }

  setShowWorkbench(show: boolean) {
    this.showWorkbench.set(show)
  }

  setCurrentDocumentContent(newContent: string) {
    const filePath = this.currentDocument.get()?.filePath

    if (!filePath) {
      return
    }

    const originalContent = this.#filesStore.getFile(filePath)?.content
    const unsavedChanges = originalContent !== undefined && originalContent !== newContent

    this.#editorStore.updateFile(filePath, newContent)

    const currentDocument = this.currentDocument.get()

    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get()

      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return
      }

      const newUnsavedFiles = new Set(previousUnsavedFiles)

      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath)
      } else {
        newUnsavedFiles.delete(currentDocument.filePath)
      }

      this.unsavedFiles.set(newUnsavedFiles)
    }
  }

  setCurrentDocumentScrollPosition(position: ScrollPosition) {
    const editorDocument = this.currentDocument.get()

    if (!editorDocument) {
      return
    }

    const { filePath } = editorDocument

    this.#editorStore.updateScrollPosition(filePath, position)
  }

  setSelectedFile(filePath: string | undefined) {
    this.#editorStore.setSelectedFile(filePath)
  }

  async saveFile(filePath: string) {
    const documents = this.#editorStore.documents.get()
    const document = documents[filePath]

    if (document === undefined) {
      return
    }

    await this.#filesStore.saveFile(filePath, document.value)

    const newUnsavedFiles = new Set(this.unsavedFiles.get())
    newUnsavedFiles.delete(filePath)

    this.unsavedFiles.set(newUnsavedFiles)
  }

  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get()

    if (currentDocument === undefined) {
      return
    }

    await this.saveFile(currentDocument.filePath)
  }

  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get()

    if (currentDocument === undefined) {
      return
    }

    const { filePath } = currentDocument
    const file = this.#filesStore.getFile(filePath)

    if (!file) {
      return
    }

    this.setCurrentDocumentContent(file.content)
  }

  async saveAllFiles() {
    for (const filePath of this.unsavedFiles.get()) {
      await this.saveFile(filePath)
    }
  }

  getFileModifcations() {
    return this.#filesStore.getFileModifications()
  }

  resetAllFileModifications() {
    this.#filesStore.resetFileModifications()
  }

  abortAllActions() {
    // TODO: what do we wanna do and how do we wanna recover from this?
  }

  addArtifact({ messageId, title, id }: ArtifactCallbackData) {
    const artifact = this.#getArtifact(messageId)

    if (artifact) {
      return
    }

    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId)
    }

    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      runner: new ActionRunner()
    })
  }

  updateArtifact({ messageId }: ArtifactCallbackData, state: Partial<ArtifactUpdateState>) {
    const artifact = this.#getArtifact(messageId)

    if (!artifact) {
      return
    }

    this.artifacts.setKey(messageId, { ...artifact, ...state })
  }

  async addAction(data: ActionCallbackData) {
    const { messageId } = data

    const artifact = this.#getArtifact(messageId)

    if (!artifact) {
      unreachable('Artifact not found')
    }

    artifact.runner.addAction(data)
  }

  async runAction(data: ActionCallbackData) {
    const { messageId } = data

    const artifact = this.#getArtifact(messageId)

    if (!artifact) {
      unreachable('Artifact not found')
    }

    artifact.runner.runAction(data)
  }

  #getArtifact(id: string) {
    const artifacts = this.artifacts.get()
    return artifacts[id]
  }
}

export const workbenchStore = new WorkbenchStore()
