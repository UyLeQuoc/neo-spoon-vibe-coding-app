import { useStore } from '@nanostores/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '~/hooks/keys'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { throwIfFailed, toJsonResult } from '~/lib/result'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

interface VerifyPaymentInput {
  txDigest: string
  pendingPaymentId: string
}

export function useVerifyPaymentTransaction() {
  const queryClient = useQueryClient()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)

  return useMutation({
    mutationFn: async (input: VerifyPaymentInput) => {
      const result = await hClientWithAuth.api['verify-payment-transaction']
        .$post({
          json: input
        })
        .then(toJsonResult)
        .then(throwIfFailed)
      return result
    },
    onSuccess: data => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.pendingPayment(authenticatedAddress)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.balance(authenticatedAddress)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.transactions(authenticatedAddress)
      })

      toast.success(`Payment verified! Added ${data.pointsAdded} points. New balance: ${data.newBalance}`)
    },
    onError: error => {
      console.error('Verify payment failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to verify payment')
    }
  })
}
