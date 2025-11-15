'use client'

import { useStore } from '@nanostores/react'
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from '@remix-run/react'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { SignInDialog } from '~/components/auth/SignInDialog.client'

export function WalletButton() {
  const { neoline, isInitialized, account, connect, disconnect: disconnectNeoLine } = useNeoLineN3()
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const [isConnecting, setIsConnecting] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const navigate = useNavigate()
  // Fetch balance when authenticated
  const fetchBalance = useCallback(async () => {
    try {
      const response = await hClientWithAuth.api.balance.$get()
      const result = await response.json()
      if (result.ok) {
        setBalance(result.data.balance || 0)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }, [])

  // Check JWT and auto-authenticate if valid
  useEffect(() => {
    async function checkAndRestoreAuth() {
      const currentAccount = account
      if (!currentAccount || hasCheckedAuth || !isInitialized) return

      // Check if JWT token exists and is valid
      const token = await walletAuthStore.getOrRefreshJwtToken()
      if (token) {
        const payload = walletAuthStore.jwtPayload.get()
        // If JWT is valid and matches current account, user is authenticated
        if (payload?.sub === currentAccount) {
          setHasCheckedAuth(true)
          await fetchBalance()
          return
        }
      }

      // JWT invalid or doesn't match, but wallet is connected
      // Auto-open sign in dialog if wallet is connected but not authenticated
      if (!isWalletAuthenticated) {
        setShowSignInDialog(true)
      }
      setHasCheckedAuth(true)
    }

    checkAndRestoreAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isWalletAuthenticated, hasCheckedAuth])

  useEffect(() => {
    if (isWalletAuthenticated && authenticatedAddress) {
      fetchBalance()
    } else {
      setBalance(null)
    }
  }, [isWalletAuthenticated, authenticatedAddress, fetchBalance])

  // Reset hasCheckedAuth when account changes
  useEffect(() => {
    setHasCheckedAuth(false)
  }, [account])

  async function connectWallet() {
    if (!neoline || !isInitialized) return

    setIsConnecting(true)
    try {
      await connect()
      // After connecting, check auth will happen in useEffect
    } catch (error) {
      console.error('Error connecting wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  async function disconnectWallet() {
    try {
      console.log('disconnectWallet click')
      disconnectNeoLine()
      walletAuthStore.logout()
      setBalance(null)
      setShowDropdown(false)
      setShowSignInDialog(false)
      setHasCheckedAuth(false)
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
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

  function handleSignInSuccess() {
    setShowSignInDialog(false)
    fetchBalance()
  }

  if (!isInitialized) {
    return (
      <button className="px-4 py-2 rounded-md font-oswald bg-gray-200 text-gray-500 cursor-not-allowed" disabled>
        Loading...
      </button>
    )
  }

  // Show address if connected (even if not authenticated)
  if (account) {
    return (
      <>
        <div className="relative flex items-center gap-3">
          {/* Balance Display - Only show if authenticated */}
          {isWalletAuthenticated && balance !== null && (
            <Link
              to="/view-payment"
              className="px-4 py-2 rounded-md font-oswald bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              {balance.toFixed(2)} Points
            </Link>
          )}

          {/* User Dropdown - Show address button */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 rounded-md font-oswald bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              {formatAddress(account)}
              <svg
                className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Dropdown arrow"
              >
                <title>Dropdown arrow</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <div className="py-1">
                    {/* Balance in dropdown - Only show if authenticated */}
                    {isWalletAuthenticated && balance !== null && (
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Balance</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {balance.toFixed(2)} Points
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          (GAS Token Balance)
                        </div>
                      </div>
                    )}
                    {/* Show sign in prompt if not authenticated */}
                    {!isWalletAuthenticated && (
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                        <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                          Not Signed In
                        </div>
                        <button
                          onClick={() => {
                            setShowSignInDialog(true)
                            setShowDropdown(false)
                          }}
                          className="mt-2 w-full px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Sign In
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        copyAddress()
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      {isCopied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Checkmark icon">
                            <title>Checkmark icon</title>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Copy icon">
                            <title>Copy icon</title>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Address
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        navigate('/view-payment')
                      }}
                      className="w-full text-left px-4 py-2 text-sm "
                    >
                      View Payment
                    </button>
                    <button
                      onClick={() => {
                        disconnectWallet()
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {isWalletAuthenticated ? 'Logout' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sign In Dialog - Auto-open when connected but not authenticated */}
        <SignInDialog
          isOpen={showSignInDialog}
          onClose={() => setShowSignInDialog(false)}
          onSignInSuccess={handleSignInSuccess}
        />
      </>
    )
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      className="px-4 py-2 rounded-md font-oswald bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
