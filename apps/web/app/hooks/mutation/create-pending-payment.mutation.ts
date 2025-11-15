import { useStore } from '@nanostores/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '~/hooks/keys'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { throwIfFailed, toJsonResult } from '~/lib/result'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

interface CreatePendingPaymentInput {
  nonce: string
  amount: number
}

export function useCreatePendingPayment() {
  const queryClient = useQueryClient()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)

  return useMutation({
    mutationFn: async (input: CreatePendingPaymentInput) => {
      const result = await hClientWithAuth.api['create-pending-payment']
        .$post({
          json: input
        })
        .then(toJsonResult)
        .then(throwIfFailed)
      return result.pendingPayment
    },
    onSuccess: () => {
      // Invalidate pending payment query to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.pendingPayment(authenticatedAddress)
      })
      toast.success('Pending payment created successfully')
    },
    onError: error => {
      console.error('Create pending payment failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create pending payment')
    }
  })
}
