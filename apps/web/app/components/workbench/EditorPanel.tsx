import { useStore } from '@nanostores/react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { memo, useMemo } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ClientOnly } from '~/components/ui/ClientOnly'
import {
  CodeMirrorEditor,
  type EditorDocument,
  type EditorSettings,
  type OnChangeCallback as OnEditorChange,
  type OnSaveCallback as OnEditorSave,
  type OnScrollCallback as OnEditorScroll
} from '~/components/editor/codemirror/CodeMirrorEditor'
import { PanelHeader } from '~/components/ui/PanelHeader'
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton'
import type { FileMap } from '~/lib/stores/files'
import { themeStore } from '~/lib/stores/theme'
import { WORK_DIR } from '~/utils/constants'
import { renderLogger } from '~/utils/logger'
import { isMobile } from '~/utils/mobile'
import { FileBreadcrumb } from './FileBreadcrumb'
import { FileTree } from './FileTree'

interface EditorPanelProps {
  files?: FileMap
  unsavedFiles?: Set<string>
  editorDocument?: EditorDocument
  selectedFile?: string | undefined
  isStreaming?: boolean
  onEditorChange?: OnEditorChange
  onEditorScroll?: OnEditorScroll
  onFileSelect?: (value?: string) => void
  onFileSave?: OnEditorSave
  onFileReset?: () => void
}

const editorSettings: EditorSettings = { tabSize: 2 }

export const EditorPanel = memo(
  ({
    files,
    unsavedFiles,
    editorDocument,
    selectedFile,
    isStreaming,
    onFileSelect,
    onEditorChange,
    onEditorScroll,
    onFileSave,
    onFileReset
  }: EditorPanelProps) => {
    renderLogger.trace('EditorPanel')

    const theme = useStore(themeStore)

    const activeFileSegments = useMemo(() => {
      if (!editorDocument) {
        return undefined
      }

      return editorDocument.filePath.split('/')
    }, [editorDocument])

    const activeFileUnsaved = useMemo(() => {
      return editorDocument !== undefined && unsavedFiles?.has(editorDocument.filePath)
    }, [editorDocument, unsavedFiles])

    return (
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={10} collapsible>
          <div className="flex flex-col border-r border-neozero-elements-borderColor h-full">
            <PanelHeader>
              <div className="i-ph:tree-structure-duotone shrink-0" />
              Files
            </PanelHeader>
            <ScrollArea.Root type="always" className="h-full">
              <ScrollArea.Viewport className="h-full">
                <FileTree
                  className="h-full"
                  files={files}
                  hideRoot
                  unsavedFiles={unsavedFiles}
                  rootFolder={WORK_DIR}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                />
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                className="flex select-none touch-none p-0.5 w-2 bg-neozero-elements-background-depth-3 transition-colors hover:bg-neozero-elements-background-depth-3"
                orientation="vertical"
              >
                <ScrollArea.Thumb className="flex-1 bg-neozero-elements-background-depth-2 rounded-lg relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Scrollbar
                className="flex select-none touch-none p-0.5 bg-neozero-elements-background-depth-3 transition-colors hover:bg-neozero-elements-background-depth-3"
                orientation="horizontal"
              >
                <ScrollArea.Thumb className="flex-1 bg-neozero-elements-background-depth-1 rounded-lg relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
              </ScrollArea.Scrollbar>
              <ScrollArea.Corner className="bg-neozero-elements-background-depth-3" />
            </ScrollArea.Root>
          </div>
        </Panel>
        <PanelResizeHandle />
        <Panel className="flex flex-col" defaultSize={80} minSize={20}>
          <PanelHeader className="overflow-x-auto">
            {activeFileSegments?.length && (
              <div className="flex items-center flex-1 text-sm">
                <FileBreadcrumb pathSegments={activeFileSegments} files={files} onFileSelect={onFileSelect} />
                {activeFileUnsaved && (
                  <div className="flex gap-1 ml-auto -mr-1.5">
                    <PanelHeaderButton onClick={onFileSave}>
                      <div className="i-ph:floppy-disk-duotone" />
                      Save
                    </PanelHeaderButton>
                    <PanelHeaderButton onClick={onFileReset}>
                      <div className="i-ph:clock-counter-clockwise-duotone" />
                      Reset
                    </PanelHeaderButton>
                  </div>
                )}
              </div>
            )}
          </PanelHeader>
          <div className="h-full flex-1 overflow-hidden">
            <ClientOnly fallback={<div className="h-full flex items-center justify-center text-neozero-elements-text-secondary">Loading editor...</div>}>
              {() => (
                <CodeMirrorEditor
                  theme={theme}
                  editable={!isStreaming && editorDocument !== undefined}
                  settings={editorSettings}
                  doc={editorDocument}
                  autoFocusOnDocumentChange={!isMobile()}
                  onScroll={onEditorScroll}
                  onChange={onEditorChange}
                  onSave={onFileSave}
                />
              )}
            </ClientOnly>
          </div>
        </Panel>
      </PanelGroup>
    )
  }
)
