'use client'

import { useStore } from '@nanostores/react'
import { useState, useEffect, useCallback } from 'react'
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

interface Transaction {
  id: number
  address: string | null
  amount: number | null
  note: string | null
  timestamp: number | null // Unix timestamp in seconds
}

interface TransactionsResponse {
  transactions: Transaction[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function ViewPaymentContent() {
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const { account } = useNeoLineN3()
  const [balance, setBalance] = useState<number | null>(null)
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [transactions, setTransactions] = useState<TransactionsResponse['transactions']>([])
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [transactionsPagination, setTransactionsPagination] = useState<TransactionsResponse['pagination'] | null>(null)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)

  const fetchData = useCallback(async () => {
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
  }, [])

  const fetchTransactions = useCallback(async (page: number = 1) => {
    setIsLoadingTransactions(true)
    try {
      const response = await hClientWithAuth.api.transactions.$get({
        query: {
          page: String(page),
          pageSize: '20'
        }
      })
      const result = await response.json()
      if (result.ok) {
        setTransactions(result.data.transactions)
        setTransactionsPagination(result.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoadingTransactions(false)
    }
  }, [])

  useEffect(() => {
    if (isWalletAuthenticated && authenticatedAddress) {
      fetchData()
    } else {
      setIsLoading(false)
    }
  }, [isWalletAuthenticated, authenticatedAddress, fetchData])

  // Listen for payment completed event to refresh data
  useEffect(() => {
    const handlePaymentCompleted = () => {
      fetchData()
      fetchTransactions(transactionsPage)
    }
    window.addEventListener('payment-completed', handlePaymentCompleted)
    return () => {
      window.removeEventListener('payment-completed', handlePaymentCompleted)
    }
  }, [transactionsPage, fetchTransactions, fetchData])

  useEffect(() => {
    if (isWalletAuthenticated && authenticatedAddress) {
      fetchTransactions(transactionsPage)
    }
  }, [isWalletAuthenticated, authenticatedAddress, transactionsPage, fetchTransactions])

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
      pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      signed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  function formatTimestamp(timestamp: number | null) {
    if (!timestamp) return 'N/A'
    // Convert Unix timestamp (seconds) to Date
    return new Date(timestamp * 1000).toLocaleString()
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neozero-elements-textPrimary">Billing & Payments</h1>
        </div>

        {/* Balance Card */}
        <div className="bg-neozero-elements-bg-depth-1 rounded-lg border border-neozero-elements-borderColor p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1 text-neozero-elements-textPrimary">Points Balance</h2>
              <p className="text-sm text-neozero-elements-textSecondary">Your current points balance</p>
            </div>
            <button
              onClick={() => paymentDialogActions.open()}
              className="px-4 py-2 bg-neozero-elements-button-primary-background text-neozero-elements-button-primary-text rounded-md hover:bg-neozero-elements-button-primary-backgroundHover transition-theme flex items-center gap-2 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Add icon">
                <title>Add icon</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Points
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neozero-elements-bg-depth-2 rounded-lg">
              <svg className="w-6 h-6 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Currency icon">
                <title>Currency icon</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-bold text-neozero-elements-textPrimary">{balance !== null ? balance.toFixed(2) : '0.00'} Points</div>
              {account && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-neozero-elements-textSecondary font-mono">{formatAddress(account)}</span>
                  <button
                    onClick={copyAddress}
                    className="p-1 hover:bg-neozero-elements-item-backgroundActive rounded transition-theme"
                    title="Copy address"
                  >
                    {isCopied ? (
                      <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Checkmark icon">
                        <title>Checkmark icon</title>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-neozero-elements-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Copy icon">
                        <title>Copy icon</title>
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
          <div className="bg-neozero-elements-bg-depth-1 rounded-lg border border-neozero-elements-borderColor p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neozero-elements-textPrimary">Pending Payment</h2>
              {pendingPayment.status !== 'signed' && (
                <button
                  onClick={handleCancelPayment}
                  className="px-3 py-1 text-sm text-neozero-elements-button-danger-text border border-neozero-elements-borderColor rounded hover:bg-neozero-elements-button-danger-background transition-theme"
                >
                  Cancel
                </button>
              )}
            </div>
            {pendingPayment.status === 'signed' && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded">
                <p className="text-sm text-orange-900 dark:text-orange-100 font-medium mb-1">
                  ⚠️ Transaction Signed - Needs Verification
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                  You have a signed transaction that needs verification. Please complete the verification to add points
                  to your account.
                </p>
                <button
                  onClick={() => paymentDialogActions.loadIncompletePayment(pendingPayment)}
                  className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-theme font-medium"
                >
                  Continue Verification
                </button>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-neozero-elements-borderColor">
                <span className="text-sm text-neozero-elements-textSecondary">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(pendingPayment.status)}`}>
                  {pendingPayment.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neozero-elements-borderColor">
                <span className="text-sm text-neozero-elements-textSecondary">Amount</span>
                <span className="font-mono font-semibold text-neozero-elements-textPrimary">{formatAmount(pendingPayment.amount)} GAS</span>
              </div>
              {pendingPayment.txDigest && (
                <div className="flex items-center justify-between py-2 border-b border-neozero-elements-borderColor">
                  <span className="text-sm text-neozero-elements-textSecondary">Transaction</span>
                  <span className="font-mono text-xs text-neozero-elements-textPrimary">{formatAddress(pendingPayment.txDigest)}</span>
                </div>
              )}
              {pendingPayment.createdAt && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-neozero-elements-textSecondary">Created</span>
                  <span className="text-sm text-neozero-elements-textPrimary">{new Date(pendingPayment.createdAt * 1000).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-neozero-elements-bg-depth-1 rounded-lg border border-neozero-elements-borderColor p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-neozero-elements-textPrimary">Pending Payments</h2>
            <p className="text-neozero-elements-textSecondary text-center py-4">No pending payments</p>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-neozero-elements-bg-depth-1 rounded-lg border border-neozero-elements-borderColor shadow-sm">
          <div className="p-6 border-b border-neozero-elements-borderColor">
            <h2 className="text-lg font-semibold text-neozero-elements-textPrimary">Transaction History</h2>
            <p className="text-sm text-neozero-elements-textSecondary mt-1">View your payment history</p>
          </div>
          
          {isLoadingTransactions ? (
            <div className="p-8 text-center text-neozero-elements-textSecondary">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-neozero-elements-textSecondary">No transactions yet</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neozero-elements-bg-depth-2">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neozero-elements-textSecondary uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neozero-elements-textSecondary uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neozero-elements-textSecondary uppercase tracking-wider">Note</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neozero-elements-textSecondary uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neozero-elements-borderColor">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-neozero-elements-item-backgroundActive transition-theme">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neozero-elements-textPrimary">#{tx.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-accent-500">
                          +{tx.amount?.toLocaleString() || 0} Points
                        </td>
                        <td className="px-6 py-4 text-sm text-neozero-elements-textSecondary">{tx.note || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neozero-elements-textSecondary">
                          {formatTimestamp(tx.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {transactionsPagination && transactionsPagination.totalPages > 1 && (
                <div className="p-4 border-t border-neozero-elements-borderColor flex items-center justify-between">
                  <div className="text-sm text-neozero-elements-textSecondary">
                    Page {transactionsPagination.page} of {transactionsPagination.totalPages} ({transactionsPagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                      disabled={!transactionsPagination.hasPrev}
                      className="px-3 py-1 text-sm bg-neozero-elements-button-secondary-background text-neozero-elements-button-secondary-text rounded hover:bg-neozero-elements-button-secondary-backgroundHover transition-theme disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setTransactionsPage(p => p + 1)}
                      disabled={!transactionsPagination.hasNext}
                      className="px-3 py-1 text-sm bg-neozero-elements-button-secondary-background text-neozero-elements-button-secondary-text rounded hover:bg-neozero-elements-button-secondary-backgroundHover transition-theme disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <PaymentDialog />
    </div>
  )
}
