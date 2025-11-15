import { useStore } from '@nanostores/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '~/hooks/keys'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { getProperties, getTokensOf } from '~/lib/neons/rpc'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

export interface DomainInfo {
  name: string
  expiration: number | null
  admin: string | null
}

interface GetDomainsResponse {
  domains: DomainInfo[]
  total: number
  error?: string
}

interface UseDomainsQueryOptions {
  limit?: number
  offset?: number
}

export function useDomainsQuery(options: UseDomainsQueryOptions = {}) {
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const { neoline } = useNeoLineN3()
  const { limit = 50, offset = 0 } = options

  return useQuery({
    queryKey: queryKeys.neons.domains(authenticatedAddress, limit, offset),
    queryFn: async () => {
      if (!authenticatedAddress || !neoline) return null

      // Convert N3 address to Hash160 if needed
      let ownerHash = authenticatedAddress
      if (authenticatedAddress.startsWith('N')) {
        const scriptHashResult = await neoline.AddressToScriptHash({ address: authenticatedAddress })
        ownerHash = scriptHashResult.scriptHash
      }

      // Get domain names from tokensOf
      const tokensResult = await getTokensOf(ownerHash)
      if (tokensResult.error) {
        return {
          domains: [],
          total: 0,
          error: tokensResult.error
        } as GetDomainsResponse
      }

      // Fetch properties for each domain to get expiration and admin
      const domainInfos: DomainInfo[] = []
      for (const domainName of tokensResult.domains) {
        try {
          const propsResult = await getProperties(domainName)
          if (propsResult.properties) {
            domainInfos.push({
              name: domainName,
              expiration: propsResult.properties.expiration,
              admin: propsResult.properties.admin
            })
          } else {
            // Still add domain even if properties fetch fails
            domainInfos.push({
              name: domainName,
              expiration: null,
              admin: null
            })
          }
        } catch (error) {
          console.warn(`Failed to get properties for ${domainName}:`, error)
          domainInfos.push({
            name: domainName,
            expiration: null,
            admin: null
          })
        }
      }

      // Apply pagination
      const paginatedDomains = domainInfos.slice(offset, offset + limit)

      return {
        domains: paginatedDomains,
        total: domainInfos.length
      } as GetDomainsResponse
    },
    enabled: isWalletAuthenticated && !!authenticatedAddress && !!neoline,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  })
}
