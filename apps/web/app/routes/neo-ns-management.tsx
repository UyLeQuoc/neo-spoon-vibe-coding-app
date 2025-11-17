import { Header } from '~/components/header/Header'
import { NeoNSManagementContent } from '~/components/neons/NeoNSManagementContent'
import { WalletAuthProvider } from '~/lib/providers/WalletAuthProvider'

export default function NeoNSManagementPage() {
  return (
    <WalletAuthProvider>
      <div className="flex flex-col h-full w-full">
        <Header />
        <NeoNSManagementContent />
      </div>
    </WalletAuthProvider>
  )
}
