import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '../../keys'
import { useStore } from '@nanostores/react'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

export type RecordType = 1 | 5 | 16 | 28 // IPV4, CNAME, TXT, IPV6

interface SetRecordInput {
  name: string
  type: RecordType
  data: string
}

// Note: This mutation doesn't call the API directly
// Instead, it prepares the transaction for the wallet to sign
// The actual setRecord happens via NeoLine invoke
export function useSetRecord() {
  const queryClient = useQueryClient()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)

  return useMutation({
    mutationFn: async (input: SetRecordInput) => {
      // This will be handled by the UI component using NeoLine
      // Return the input for the UI to use
      return input
    },
    onSuccess: () => {
      // Invalidate properties query after setting record
      queryClient.invalidateQueries({
        queryKey: queryKeys.neons.properties('')
      })
    },
    onError: error => {
      console.error('Set record failed:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to set record'
      )
    }
  })
}

