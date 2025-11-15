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
      const result = await response.json()
      // Handle backend TResult format: { ok: true, data: ModelInfo[] }
      if (result && typeof result === 'object' && 'ok' in result && 'data' in result && result.ok) {
        return result.data as ModelInfo[]
      }
      // Fallback for unexpected format
      return (result as ModelInfo[]) || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  })
}
