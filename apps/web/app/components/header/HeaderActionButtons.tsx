import { useStore } from '@nanostores/react'
import { DeployButton } from '~/components/workbench/DeployButton'
import { chatStore } from '~/lib/stores/chat'
import { workbenchStore } from '~/lib/stores/workbench'
import { classNames } from '~/utils/classNames'

export function HeaderActionButtons() {
  const showWorkbench = useStore(workbenchStore.showWorkbench)
  const { showChat } = useStore(chatStore)

  const canHideChat = showWorkbench || !showChat

  return (
    <div className="flex gap-2">
      <button
        className="rounded-md text-xs px-4 py-2 bg-neozero-elements-button-secondary-background text-neozero-elements-button-secondary-text flex gap-1.7 items-center justify-center px-3 py-1.5 hover:text-neozero-elements-button-secondary-textHover hover:bg-neozero-elements-button-secondary-backgroundHover"
        onClick={() => {
          workbenchStore.downloadProject()
        }}
      >
        <div className="i-ph:download-duotone text-lg" />
        Download
      </button>

      <DeployButton />

      <div className="flex border border-neozero-elements-borderColor rounded-md overflow-hidden">
        <Button
          active={showChat}
          disabled={!canHideChat}
          onClick={() => {
            if (canHideChat) {
              chatStore.setKey('showChat', !showChat)
            }
          }}
        >
          <div className="i-neozero:chat text-sm" />
        </Button>
        <div className="w-[1px] bg-neozero-elements-borderColor" />
        <Button
          active={showWorkbench}
          onClick={() => {
            if (showWorkbench && !showChat) {
              chatStore.setKey('showChat', true)
            }

            workbenchStore.showWorkbench.set(!showWorkbench)
          }}
        >
          <div className="i-ph:code-bold" />
        </Button>
      </div>
    </div>
  )
}

interface ButtonProps {
  active?: boolean
  disabled?: boolean
  children?: any
  onClick?: VoidFunction
}

function Button({ active = false, disabled = false, children, onClick }: ButtonProps) {
  return (
    <button
      className={classNames('flex items-center p-1.5', {
        'bg-neozero-elements-item-backgroundDefault hover:bg-neozero-elements-item-backgroundActive text-neozero-elements-textTertiary hover:text-neozero-elements-textPrimary':
          !active,
        'bg-neozero-elements-item-backgroundAccent text-neozero-elements-item-contentAccent': active && !disabled,
        'bg-neozero-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
          disabled
      })}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
