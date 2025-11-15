import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '../../keys'
import { useStore } from '@nanostores/react'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

interface RegisterInput {
  name: string
  owner: string
  years?: number
}

// Note: This mutation doesn't call the API directly
// Instead, it prepares the transaction for the wallet to sign
// The actual registration happens via NeoLine invoke
export function useRegisterDomain() {
  const queryClient = useQueryClient()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      // This will be handled by the UI component using NeoLine
      // Return the input for the UI to use
      return input
    },
    onSuccess: () => {
      // Invalidate related queries after successful registration
      queryClient.invalidateQueries({
        queryKey: queryKeys.neons.balanceOf(authenticatedAddress)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.neons.domains(authenticatedAddress)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.neons.isAvailable('')
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.neons.properties('')
      })
    },
    onError: error => {
      console.error('Register domain failed:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to register domain'
      )
    }
  })
}

