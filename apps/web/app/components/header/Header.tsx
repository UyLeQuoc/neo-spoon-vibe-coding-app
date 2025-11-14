import { useStore } from '@nanostores/react'
import { ClientOnly } from 'remix-utils/client-only'
import { ChatDescription } from '~/lib/persistence/ChatDescription.client'
import { chatStore } from '~/lib/stores/chat'
import { classNames } from '~/utils/classNames'
import { HeaderActionButtons } from './HeaderActionButtons.client'

export function Header() {
  const chat = useStore(chatStore)

  return (
    <header
      className={classNames(
        'flex items-center bg-bolt-elements-background-depth-1 p-5 border-b h-[var(--header-height)]',
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started
        }
      )}
    >
      <div className="flex items-center grow-1 basis-60 gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <a href="/" className="text-2xl font-black text-accent flex items-center font-oswald">
          NeoZero
        </a>
      </div>
      <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
        <ClientOnly>{() => <ChatDescription />}</ClientOnly>
      </span>
      {chat.started && (
        <ClientOnly>
          {() => (
            <div className="flex grow-1 basis-60 justify-end items-center gap-1.5">
              <HeaderActionButtons />
            </div>
          )}
        </ClientOnly>
      )}
      {/* connect wallet button */}
      <button className="px-2 py-1 rounded-md font-oswald">Connect Wallet</button>
    </header>
  )
}
