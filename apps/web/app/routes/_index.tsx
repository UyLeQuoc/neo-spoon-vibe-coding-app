import type { MetaFunction } from 'react-router'
import Chat from '~/components/chat/Chat'
import { Header } from '~/components/header/Header'
import { WalletAuthProvider } from '~/lib/providers/WalletAuthProvider'

export const meta: MetaFunction = () => {
  return [{ title: 'NeoZero' }, { name: 'description', content: 'Talk with NeoZero, an AI assistant from StackBlitz' }]
}

export default function Index() {
  return (
    <WalletAuthProvider>
      <div className="flex flex-col h-full w-full">
        <Header />
        <Chat />
      </div>
    </WalletAuthProvider>
  )
}
