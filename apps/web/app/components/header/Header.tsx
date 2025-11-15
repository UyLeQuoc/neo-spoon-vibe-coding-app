import { useStore } from '@nanostores/react'
import { Link } from '@remix-run/react'
import { Sparkles } from 'lucide-react'
import { ClientOnly } from 'remix-utils/client-only'
import { ChatDescription } from '~/lib/persistence/ChatDescription.client'
import { chatStore } from '~/lib/stores/chat'
import { classNames } from '~/utils/classNames'
import { HeaderActionButtons } from './HeaderActionButtons.client'
import { WalletButton } from './WalletButton.client'

export function Header() {
  const chat = useStore(chatStore)

  return (
    <header
      className={classNames(
        'flex items-center bg-neozero-elements-background-depth-1 p-5 border-b h-[var(--header-height)]',
        {
          'border-transparent': !chat.started,
          'border-neozero-elements-borderColor': chat.started
        }
      )}
    >
      <div className="flex items-center grow-1 basis-60 gap-2 z-logo text-neozero-elements-textPrimary cursor-pointer">
        <a href="/" className="text-2xl font-black text-accent flex items-center font-oswald">
          NeoZero
        </a>
        <ClientOnly>
          {() => (
            <Link
              to="/neo-ns-management"
              className="buy-neons-button relative rounded-md text-xs px-3 py-1.5 bg-neozero-elements-background-depth-2 text-neozero-elements-button-secondary-text flex gap-1.7 items-center justify-center overflow-hidden group transition-theme hover:text-neozero-elements-button-secondary-textHover hover:bg-neozero-elements-background-depth-3"
            >
              <div className="relative flex items-center gap-1.7 z-10">
                <Sparkles className="w-4 h-4" />
                <span>Buy Neo NS</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%]"></div>
            </Link>
          )}
        </ClientOnly>
      </div>
      <span className="flex-1 px-4 truncate text-center text-neozero-elements-textPrimary">
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
      <div className="flex items-center gap-2">
        <ClientOnly>{() => <WalletButton />}</ClientOnly>
      </div>
    </header>
  )
}
