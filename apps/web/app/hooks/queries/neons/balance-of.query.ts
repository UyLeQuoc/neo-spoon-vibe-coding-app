import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '~/hooks/keys'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { getBalanceOf } from '~/lib/neons/rpc'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

export function useBalanceOfQuery() {
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const { neoline } = useNeoLineN3()

  return useQuery({
    queryKey: queryKeys.neons.balanceOf(authenticatedAddress),
    queryFn: async () => {
      if (!authenticatedAddress || !neoline) return null

      // Convert N3 address to Hash160 if needed
      let ownerHash = authenticatedAddress
      if (authenticatedAddress.startsWith('N')) {
        const scriptHashResult = await neoline.AddressToScriptHash({ address: authenticatedAddress })
        ownerHash = scriptHashResult.scriptHash
      }

      return await getBalanceOf(ownerHash)
    },
    enabled: isWalletAuthenticated && !!authenticatedAddress && !!neoline,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  })
}
