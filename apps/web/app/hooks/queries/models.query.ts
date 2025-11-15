import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '~/hooks/keys'
import type { ModelInfo } from '~/utils/modelConstants'

export function useModelsQuery(search: string = '') {
  return useQuery({
    queryKey: queryKeys.models(search),
    queryFn: async (): Promise<ModelInfo[]> => {
      const params = new URLSearchParams({ search })
      const response = await fetch(`/api/models?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  })
}

