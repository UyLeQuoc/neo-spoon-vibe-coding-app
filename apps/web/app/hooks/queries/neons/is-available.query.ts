import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '~/hooks/keys'
import { checkIsAvailable } from '~/lib/neons/rpc'

interface IsAvailableResponse {
  available: boolean
  error?: string
}

export function useIsAvailableQuery(domain: string | null) {
  return useQuery({
    queryKey: queryKeys.neons.isAvailable(domain ?? ''),
    queryFn: async () => {
      if (!domain) return null
      return await checkIsAvailable(domain)
    },
    enabled: !!domain && domain.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  })
}

