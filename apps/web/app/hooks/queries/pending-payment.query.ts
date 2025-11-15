import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '~/hooks/keys'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { throwIfFailed, toJsonResult } from '~/lib/result'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

export function usePendingPaymentQuery() {
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)

  return useQuery({
    queryKey: queryKeys.pendingPayment(authenticatedAddress),
    queryFn: async () => {
      const result = await hClientWithAuth.api['pending-payment'].$get().then(toJsonResult).then(throwIfFailed)
      return result.pendingPayment
    },
    enabled: isWalletAuthenticated && !!authenticatedAddress,
    staleTime: 1000 * 30, // 30 seconds
    retry: 1
  })
}
