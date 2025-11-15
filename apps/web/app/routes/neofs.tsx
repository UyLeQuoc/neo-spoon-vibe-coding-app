import { json, type MetaFunction } from '@remix-run/cloudflare'
import { ClientOnly } from 'remix-utils/client-only'
import { Header } from '~/components/header/Header'
import { NeoFSContent } from '~/components/neofs/NeoFSContent.client'
import { WalletAuthProvider } from '~/lib/providers/WalletAuthProvider'

export const meta: MetaFunction = () => {
  return [{ title: 'NeoFS Storage - NeoZero' }]
}

export const loader = () => json({})

export default function NeoFSPage() {
  return (
    <WalletAuthProvider>
      <div className="flex flex-col h-full w-full">
        <Header />
        <ClientOnly fallback={<div className="flex-1 p-8">Loading...</div>}>
          {() => <NeoFSContent />}
        </ClientOnly>
      </div>
    </WalletAuthProvider>
  )
}

