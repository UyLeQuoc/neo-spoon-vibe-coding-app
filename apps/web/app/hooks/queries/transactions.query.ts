import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '~/hooks/keys'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { throwIfFailed, toJsonResult } from '~/lib/result'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

interface UseTransactionsQueryOptions {
  page?: number
  pageSize?: number
}

export function useTransactionsQuery(options: UseTransactionsQueryOptions = {}) {
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const { page = 1, pageSize = 20 } = options

  return useQuery({
    queryKey: queryKeys.transactions(authenticatedAddress, page, pageSize),
    queryFn: async () => {
      const result = await hClientWithAuth.api.transactions
        .$get({
          query: {
            page: String(page),
            pageSize: String(pageSize)
          }
        })
        .then(toJsonResult)
        .then(throwIfFailed)
      return result
    },
    enabled: isWalletAuthenticated && !!authenticatedAddress,
    staleTime: 1000 * 60, // 1 minute
    retry: 1
  })
}
