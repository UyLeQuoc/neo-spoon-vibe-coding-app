import { memo } from 'react'
import { classNames } from '~/utils/classNames'

interface PanelHeaderProps {
  className?: string
  children: React.ReactNode
}

export const PanelHeader = memo(({ className, children }: PanelHeaderProps) => {
  return (
    <div
      className={classNames(
        'flex items-center gap-2 bg-neozero-elements-background-depth-2 text-neozero-elements-textSecondary border-b border-neozero-elements-borderColor px-4 py-1 min-h-[34px] text-sm',
        className
      )}
    >
      {children}
    </div>
  )
})
