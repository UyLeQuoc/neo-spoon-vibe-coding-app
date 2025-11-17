import { useEffect, useState } from 'react'
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'

interface SignInDialogProps {
  isOpen: boolean
  onClose: () => void
  onSignInSuccess: () => void
}

export function SignInDialog({ isOpen, onClose, onSignInSuccess }: SignInDialogProps) {
  const { neoline, account } = useNeoLineN3()
  const { isWalletAuthenticated } = useWalletAuth()
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-close if authenticated
  useEffect(() => {
    if (isWalletAuthenticated) {
      onClose()
      onSignInSuccess()
    }
  }, [isWalletAuthenticated, onClose, onSignInSuccess])

  async function handleSignIn() {
    if (!neoline || !account) {
      setError('Please connect your wallet first')
      return
    }

    setIsSigning(true)
    setError(null)

    try {
      // Get sign-in message
      const message = await walletAuthStore.getSignInMessage(account)
      if (!message) {
        setError('Failed to get sign-in message')
        setIsSigning(false)
        return
      }

      // Sign message using NeoLine
      const signResp = await neoline.signMessage({ message })

      // Login with signature
      const success = await walletAuthStore.login(account, message, {
        data: signResp.data,
        publicKey: signResp.publicKey,
        salt: signResp.salt
      })

      if (success) {
        onSignInSuccess()
        onClose()
      } else {
        setError('Failed to authenticate. Please try again.')
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      if (err?.type === 'CANCELED' || err?.description?.includes('cancel')) {
        setError('Sign in was cancelled')
      } else {
        setError(err?.description || err?.message || 'Failed to sign in')
      }
    } finally {
      setIsSigning(false)
    }
  }

  function handleLogout() {
    console.log('handleLogout click')
    walletAuthStore.logout()
    onClose()
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog onBackdrop={onClose} onClose={onClose}>
        <DialogTitle>Sign In Required</DialogTitle>
        <DialogDescription>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your wallet is connected, but you need to sign in to access your account.
            </p>
            {account && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connected Wallet:</p>
                <p className="text-sm font-mono font-medium">{account}</p>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <DialogButton type="secondary" onClick={handleLogout} disabled={isSigning}>
                Logout
              </DialogButton>
              <DialogButton type="primary" onClick={handleSignIn} disabled={!account || isSigning}>
                {isSigning ? 'Signing...' : 'Sign In'}
              </DialogButton>
            </div>
          </div>
        </DialogDescription>
      </Dialog>
    </DialogRoot>
  )
}
