import { json, type MetaFunction } from '@remix-run/cloudflare'
import { ClientOnly } from 'remix-utils/client-only'
import { BaseChat } from '~/components/chat/BaseChat'
import { Chat } from '~/components/chat/Chat.client'
import { Header } from '~/components/header/Header'
import { WalletAuthProvider } from '~/lib/providers/WalletAuthProvider'

export const meta: MetaFunction = () => {
  return [{ title: 'NeoZero' }, { name: 'description', content: 'Talk with NeoZero, an AI assistant from StackBlitz' }]
}

export const loader = () => json({})

export default function Index() {
  return (
    <WalletAuthProvider>
      <div className="flex flex-col h-full w-full">
        <Header />
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </div>
    </WalletAuthProvider>
  )
}
