import { useStore } from '@nanostores/react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { IconButton } from '~/components/ui/IconButton'
import { workbenchStore } from '~/lib/stores/workbench'

export const Preview = memo(() => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewPageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const previewUrl = useStore(workbenchStore.previewUrl)

  const [url, setUrl] = useState('')
  const [iframeUrl, setIframeUrl] = useState<string | undefined>()

  useEffect(() => {
    if (!previewUrl) {
      setUrl('')
      setIframeUrl(undefined)
      return
    }

    setUrl(previewUrl)
    setIframeUrl(previewUrl)
  }, [previewUrl])

  const validateUrl = useCallback(
    (value: string) => {
      if (!previewUrl) {
        return false
      }

      if (value === previewUrl) {
        return true
      } else if (value.startsWith(previewUrl)) {
        return ['/', '?', '#'].includes(value.charAt(previewUrl.length))
      }

      return false
    },
    [previewUrl]
  )

  const reloadPreview = () => {
    if (iframeRef.current) {
      const src = iframeRef.current.src
      iframeRef.current.src = ''
      iframeRef.current.src = src
    }
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen()
    } else if (previewPageRef.current) {
      previewPageRef.current.requestFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const openInNewTab = () => {
    if (previewUrl) {
      const newTab = window.open(previewUrl, '_blank', 'noopener,noreferrer')
      if (newTab) {
        newTab.focus()
      }
    }
  }

  return (
    <div ref={previewPageRef} className="w-full h-full flex flex-col">
      <div className="bg-neozero-elements-background-depth-2 p-2 flex items-center gap-1.5">
        <IconButton icon="i-ph:arrow-clockwise" onClick={reloadPreview} />
        <div
          className="flex items-center gap-1 flex-grow bg-neozero-elements-preview-addressBar-background border border-neozero-elements-borderColor text-neozero-elements-preview-addressBar-text rounded-full px-3 py-1 text-sm hover:bg-neozero-elements-preview-addressBar-backgroundHover hover:focus-within:bg-neozero-elements-preview-addressBar-backgroundActive focus-within:bg-neozero-elements-preview-addressBar-backgroundActive
        focus-within-border-neozero-elements-borderColorActive focus-within:text-neozero-elements-preview-addressBar-textActive"
        >
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none"
            type="text"
            value={url}
            onChange={event => {
              setUrl(event.target.value)
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && validateUrl(url)) {
                setIframeUrl(url)

                if (inputRef.current) {
                  inputRef.current.blur()
                }
              }
            }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton icon="i-ph:arrow-square-out" title="Open in new tab" onClick={openInNewTab} />

          <IconButton
            icon={isFullscreen ? 'i-ph:corners-in' : 'i-ph:corners-out'}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            onClick={toggleFullscreen}
          />
        </div>
      </div>
      <div className="flex-1 border-t border-neozero-elements-borderColor">
        {previewUrl && iframeUrl ? (
          <iframe ref={iframeRef} className="border-none w-full h-full bg-white" src={iframeUrl} />
        ) : (
          <div className="flex w-full h-full justify-center items-center bg-white">No preview available</div>
        )}
      </div>
    </div>
  )
})
