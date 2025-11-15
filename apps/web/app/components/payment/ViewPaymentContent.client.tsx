'use client'

import { useStore } from '@nanostores/react'
import { useState, useEffect } from 'react'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { paymentDialogActions } from '~/lib/stores/payment-dialog.store'
import { PaymentDialog } from './PaymentDialog.client'

interface PendingPayment {
  id: string
  address: string
  nonce: string
  amount: number
  status: 'pending' | 'signed' | 'verified' | 'failed'
  txDigest?: string
  createdAt?: number
  updatedAt?: number
}

export function ViewPaymentContent() {
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const { account } = useNeoLineN3()
  const [balance, setBalance] = useState<number | null>(null)
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (isWalletAuthenticated && authenticatedAddress) {
      fetchData()
    } else {
      setIsLoading(false)
    }
  }, [isWalletAuthenticated, authenticatedAddress])

  // Listen for payment completed event to refresh data
  useEffect(() => {
    const handlePaymentCompleted = () => {
      fetchData()
    }
    window.addEventListener('payment-completed', handlePaymentCompleted)
    return () => {
      window.removeEventListener('payment-completed', handlePaymentCompleted)
    }
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      // Fetch balance
      const balanceResponse = await hClientWithAuth.api.balance.$get()
      const balanceResult = await balanceResponse.json()
      if (balanceResult.ok) {
        setBalance(balanceResult.data.balance || 0)
      }

      // Fetch pending payment
      const paymentResponse = await hClientWithAuth.api['pending-payment'].$get()
      const paymentResult = await paymentResponse.json()
      if (paymentResult.ok && paymentResult.data.pendingPayment) {
        setPendingPayment(paymentResult.data.pendingPayment as any)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function copyAddress() {
    if (!account) return
    navigator.clipboard.writeText(account)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  function formatAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  function formatAmount(amount: number) {
    // Amount is in smallest unit (like wei), convert to GAS (8 decimals)
    return (amount / 100000000).toFixed(8)
  }

  function getStatusBadge(status: string) {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      signed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  async function handleCancelPayment() {
    if (!pendingPayment) return

    if (pendingPayment.status === 'signed') {
      alert('Cannot cancel signed payment. Please complete verification.')
      return
    }

    if (!confirm('Are you sure you want to cancel this payment?')) {
      return
    }

    try {
      const response = await hClientWithAuth.api['update-pending-payment-status'].$post({
        json: {
          pendingPaymentId: pendingPayment.id,
          status: 'failed'
        }
      })

      const result = await response.json()
      if (!result.ok) {
        alert(`Failed to cancel payment: ${result.error?.message || 'Unknown error'}`)
        return
      }

      // Refresh data
      await fetchData()
    } catch (error: any) {
      console.error('Failed to cancel payment:', error)
      alert(`Failed to cancel payment: ${error?.message || 'Unknown error'}`)
    }
  }

  if (!isWalletAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please connect your wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">You need to connect and authenticate your wallet to view payments.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Billing & Payments</h1>

        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Points Balance</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your current points balance</p>
            </div>
            <button
              onClick={() => paymentDialogActions.open()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Points
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold">{balance !== null ? balance.toFixed(2) : '0.00'} Points</div>
              {account && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{formatAddress(account)}</span>
                  <button
                    onClick={copyAddress}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Copy address"
                  >
                    {isCopied ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Payment Card */}
        {pendingPayment ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Pending Payment</h2>
              {pendingPayment.status !== 'signed' && (
                <button
                  onClick={handleCancelPayment}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            {pendingPayment.status === 'signed' && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-1">
                  ⚠️ Transaction Signed - Needs Verification
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  You have a signed transaction that needs verification. Please complete the verification to add points
                  to your account.
                </p>
                <button
                  onClick={() => paymentDialogActions.loadIncompletePayment(pendingPayment)}
                  className="mt-2 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                >
                  Continue Verification
                </button>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(pendingPayment.status)}`}>
                  {pendingPayment.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                <span className="font-mono font-semibold">{formatAmount(pendingPayment.amount)} GAS</span>
              </div>
              {pendingPayment.txDigest && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Transaction</span>
                  <span className="font-mono text-xs">{formatAddress(pendingPayment.txDigest)}</span>
                </div>
              )}
              {pendingPayment.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                  <span className="text-sm">{new Date(pendingPayment.createdAt * 1000).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Pending Payments</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">No pending payments</p>
          </div>
        )}
      </div>
      <PaymentDialog />
    </div>
  )
}
