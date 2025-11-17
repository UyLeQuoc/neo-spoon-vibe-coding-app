import type { MetaFunction } from 'react-router'
import { ClientOnly } from 'remix-utils/client-only'
import { Header } from '~/components/header/Header'
import { ViewPaymentContent } from '~/components/payment/ViewPaymentContent.client'
import { WalletAuthProvider } from '~/lib/providers/WalletAuthProvider'

export const meta: MetaFunction = () => {
  return [{ title: 'View Payment - NeoZero' }]
}

export default function ViewPaymentPage() {
  return (
    <WalletAuthProvider>
      <div className="flex flex-col h-full w-full">
        <Header />
        <ClientOnly fallback={<div className="flex-1 p-8">Loading...</div>}>{() => <ViewPaymentContent />}</ClientOnly>
      </div>
    </WalletAuthProvider>
  )
}
