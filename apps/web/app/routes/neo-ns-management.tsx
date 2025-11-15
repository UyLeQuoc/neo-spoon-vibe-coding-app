import { json, type MetaFunction } from '@remix-run/cloudflare'
import { ClientOnly } from 'remix-utils/client-only'
import { Header } from '~/components/header/Header'
import { WalletAuthProvider } from '~/lib/providers/WalletAuthProvider'
import { NeoNSManagementContent } from '~/components/neons/NeoNSManagementContent.client'

export const meta: MetaFunction = () => {
  return [{ title: 'NeoNS Management - NeoZero' }]
}

export const loader = () => json({})

export default function NeoNSManagementPage() {
  return (
    <WalletAuthProvider>
      <div className="flex flex-col h-full w-full">
        <Header />
        <ClientOnly fallback={<div className="flex-1 p-8">Loading...</div>}>
          {() => <NeoNSManagementContent />}
        </ClientOnly>
      </div>
    </WalletAuthProvider>
  )
}

