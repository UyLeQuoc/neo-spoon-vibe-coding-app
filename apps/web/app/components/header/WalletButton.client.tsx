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
  const { neoline, isInitialized, account, balance, connect, disconnect: disconnectNeoLine } = useNeoLineN3()
  const { isWalletAuthenticated } = useWalletAuth()
  const authenticatedAddress = useStore(walletAuthStore.authenticatedAddress)
  const [isConnecting, setIsConnecting] = useState(false)
  const [balancePoints, setBalancePoints] = useState<number | null>(null)
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
        setBalancePoints(result.data.balance || 0)
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
  }, [isInitialized, isWalletAuthenticated, hasCheckedAuth, account, fetchBalance])

  useEffect(() => {
    if (isWalletAuthenticated && authenticatedAddress) {
      fetchBalance()
    } else {
      setBalancePoints(null)
    }
  }, [isWalletAuthenticated, authenticatedAddress, fetchBalance])

  // Reset hasCheckedAuth when account changes
  useEffect(() => {
    setHasCheckedAuth(false)
  }, [])

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
      setBalancePoints(null)
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
      <button 
        className="px-4 py-2 rounded-md font-oswald bg-neozero-elements-bg-depth-3 text-neozero-elements-textTertiary cursor-not-allowed transition-theme" 
        disabled
      >
        Loading...
      </button>
    )
  }

  // Show address if connected (even if not authenticated)
  if (account) {
    return (
      <>
        <div className="relative flex items-center gap-2">
          {/* Balance Display - Only show if authenticated */}
          {isWalletAuthenticated && balance !== null && (
            <Link
              to="/view-payment"
              className="px-4 py-2 rounded-md font-oswald bg-neozero-elements-button-primary-background text-neozero-elements-button-primary-text hover:bg-neozero-elements-button-primary-backgroundHover transition-theme"
            >
              {balancePoints?.toFixed(2)} Points
            </Link>
          )}

          {/* User Dropdown - Show address button */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 rounded-md font-oswald bg-accent-500 text-white hover:bg-accent-600 transition-theme flex items-center gap-2 shadow-sm"
            >
              {formatAddress(account)}
              <svg
                className={`w-4 h-4 transition-transform neozero-ease-cubic-bezier ${showDropdown ? 'rotate-180' : ''}`}
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
                <div className="absolute right-0 mt-2 w-64 bg-neozero-elements-bg-depth-1 rounded-lg shadow-lg border border-neozero-elements-borderColor z-20 overflow-hidden">
                  <div className="py-1">
                    {/* Balance in dropdown - Only show if authenticated */}
                    {isWalletAuthenticated && balance !== null && (
                      <div className="px-4 py-3 border-b border-neozero-elements-borderColor">
                        <div className="text-xs text-neozero-elements-textSecondary mb-2 font-medium">Wallet Balance (Testnet)</div>
                        <div className="space-y-1">
                          {
                            balance?.[account]?.map((b) => {
                              if (b.symbol !== 'GAS' && b.symbol !== 'NEO') return null
                              return (
                                <div key={b.contract} className="text-sm text-neozero-elements-textPrimary font-medium">
                                  {b.amount} {b.symbol}
                                </div>
                              )
                            })
                          }
                        </div>
                      </div>
                    )}
                    {/* Show sign in prompt if not authenticated */}
                    {!isWalletAuthenticated && (
                      <div className="px-4 py-3 border-b border-neozero-elements-borderColor">
                        <div className="text-xs text-neozero-elements-textSecondary mb-1 font-medium">Status</div>
                        <div className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-2">
                          Not Signed In
                        </div>
                        <button
                          onClick={() => {
                            setShowSignInDialog(true)
                            setShowDropdown(false)
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-neozero-elements-button-primary-background text-neozero-elements-button-primary-text rounded-md hover:bg-neozero-elements-button-primary-backgroundHover transition-theme font-medium"
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
                      className="w-full text-left px-4 py-2.5 text-sm text-neozero-elements-textPrimary hover:bg-neozero-elements-item-backgroundActive transition-theme flex items-center gap-2"
                    >
                      {isCopied ? (
                        <>
                          <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Checkmark icon">
                            <title>Checkmark icon</title>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-accent-500 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-neozero-elements-textSecondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Copy icon">
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
                      className="w-full text-left px-4 py-2.5 text-sm text-neozero-elements-textPrimary hover:bg-neozero-elements-item-backgroundActive transition-theme"
                    >
                      View Payment
                    </button>
                    <button
                      onClick={() => {
                        disconnectWallet()
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-neozero-elements-button-danger-text hover:bg-neozero-elements-button-danger-background transition-theme"
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
      className="px-4 py-2 rounded-md font-oswald bg-neozero-elements-button-primary-background text-neozero-elements-button-primary-text hover:bg-neozero-elements-button-primary-backgroundHover transition-theme disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
