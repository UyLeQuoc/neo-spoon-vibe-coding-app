import { useStore } from '@nanostores/react'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'
import { useNeoLineN3 } from '~/lib/neolineN3TS'

interface Unauthenticated {
  isWalletAuthenticated: false
  authenticatedAddress: undefined
}

interface Authenticated {
  isWalletAuthenticated: true
  authenticatedAddress: string
}

const walletAuthContext = createContext<Unauthenticated | Authenticated>({
  isWalletAuthenticated: false,
  authenticatedAddress: undefined
})

export function WalletAuthProvider({ children }: { children: ReactNode }) {
  const { account } = useNeoLineN3()
  console.log('account', account)
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  console.log('authenticatedAddress', authenticatedAddress)

  const value = useMemo<Unauthenticated | Authenticated>(
    () =>
      account && authenticatedAddress && authenticatedAddress === account
        ? {
            isWalletAuthenticated: true,
            authenticatedAddress: account
          }
        : { isWalletAuthenticated: false, authenticatedAddress: undefined },
    [authenticatedAddress, account]
  )

  useEffect(() => {
    if (!account) {
      console.log('No wallet connected, ensure logged out')
      // // No wallet connected, ensure logged out
      // if (authenticatedAddress) {
      //   walletAuthStore.logout()
      //   console.log('Logged out')
      // }
    } else if (account !== authenticatedAddress) {
      console.log('Wallet connected but not authenticated')
      // Don't auto-open login dialog, let user click Connect Wallet button
    }
  }, [account, authenticatedAddress])

  return <walletAuthContext.Provider value={value}>{children}</walletAuthContext.Provider>
}

export function useWalletAuth() {
  return useContext(walletAuthContext)
}
