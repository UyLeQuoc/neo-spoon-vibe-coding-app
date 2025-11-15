import { memo, useEffect, useRef } from 'react'
import { IconButton } from '~/components/ui/IconButton'
import type { PreviewInfo } from '~/lib/stores/previews'

interface PortDropdownProps {
  activePreviewIndex: number
  setActivePreviewIndex: (index: number) => void
  isDropdownOpen: boolean
  setIsDropdownOpen: (value: boolean) => void
  setHasSelectedPreview: (value: boolean) => void
  previews: PreviewInfo[]
}

export const PortDropdown = memo(
  ({
    activePreviewIndex,
    setActivePreviewIndex,
    isDropdownOpen,
    setIsDropdownOpen,
    setHasSelectedPreview,
    previews
  }: PortDropdownProps) => {
    const dropdownRef = useRef<HTMLDivElement>(null)

    // sort previews, preserving original index
    const sortedPreviews = previews
      .map((previewInfo, index) => ({ ...previewInfo, index }))
      .sort((a, b) => a.port - b.port)

    // close dropdown if user clicks outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false)
        }
      }

      if (isDropdownOpen) {
        window.addEventListener('mousedown', handleClickOutside)
      } else {
        window.removeEventListener('mousedown', handleClickOutside)
      }

      return () => {
        window.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isDropdownOpen, setIsDropdownOpen])

    return (
      <div className="relative z-port-dropdown" ref={dropdownRef}>
        <IconButton icon="i-ph:plug" onClick={() => setIsDropdownOpen(!isDropdownOpen)} />
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 bg-neozero-elements-background-depth-2 border border-neozero-elements-borderColor rounded shadow-sm min-w-[140px] dropdown-animation">
            <div className="px-4 py-2 border-b border-neozero-elements-borderColor text-sm font-semibold text-neozero-elements-textPrimary">
              Ports
            </div>
            {sortedPreviews.map(preview => (
              <div
                key={preview.port}
                className="flex items-center px-4 py-2 cursor-pointer hover:bg-neozero-elements-item-backgroundActive"
                onClick={() => {
                  setActivePreviewIndex(preview.index)
                  setIsDropdownOpen(false)
                  setHasSelectedPreview(true)
                }}
              >
                <span
                  className={
                    activePreviewIndex === preview.index
                      ? 'text-neozero-elements-item-contentAccent'
                      : 'text-neozero-elements-item-contentDefault group-hover:text-neozero-elements-item-contentActive'
                  }
                >
                  {preview.port}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
