import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { throwIfFailed, toJsonResult } from '~/lib/result'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

export function useBalanceQuery() {
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)

  return useQuery({
    queryKey: ['balance', authenticatedAddress],
    queryFn: async () => {
      const result = await hClientWithAuth.api.balance.$get().then(toJsonResult).then(throwIfFailed)
      return result.balance
    },
    enabled: isWalletAuthenticated && !!authenticatedAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}
