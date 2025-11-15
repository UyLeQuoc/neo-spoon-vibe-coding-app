import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '~/hooks/keys'
import { type DomainProperties, getProperties } from '~/lib/neons/rpc'

export type { DomainProperties }

interface PropertiesResponse {
  properties: DomainProperties | null
  error?: string
}

export function usePropertiesQuery(domain: string | null) {
  return useQuery({
    queryKey: queryKeys.neons.properties(domain ?? ''),
    queryFn: async () => {
      if (!domain) return null
      return await getProperties(domain)
    },
    enabled: !!domain && domain.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  })
}
