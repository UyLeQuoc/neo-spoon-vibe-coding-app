'use client'

import { useStore } from '@nanostores/react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { Dialog, DialogRoot, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog'
import { paymentDialogStore, paymentDialogActions, PaymentStep, PaymentStatus } from '~/lib/stores/payment-dialog.store'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { hClientWithAuth } from '~/lib/hono-authenticated-client'
import { VibeCodingAppPaymentContract } from '~/contracts/vibecodingapppaymentcontract'

const EXAMPLE_AMOUNTS = [0.1, 0.5, 1, 5, 10]

interface StepperProps {
  steps: Array<{ title: string; description: string }>
  currentStep: number
  isLoading: boolean
}

export function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

function Stepper({ steps, currentStep, isLoading }: StepperProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                    ? isLoading
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div className="mt-2 text-center">
              <div
                className={`text-xs font-medium ${
                  index === currentStep
                    ? 'text-blue-600 dark:text-blue-400'
                    : index < currentStep
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.title}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{step.description}</div>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const steps = [
  { title: 'Enter Amount', description: 'Enter the amount to add' },
  { title: 'Sign Transaction', description: 'Sign the payment transaction' },
  { title: 'Verify Transaction', description: 'Verify the payment on-chain' }
]

export function PaymentDialog() {
  const isOpen = useStore(paymentDialogStore).isOpen
  const amount = useStore(paymentDialogStore).amount
  const currentStep = useStore(paymentDialogStore).currentStep
  const status = useStore(paymentDialogStore).status
  const pendingPaymentId = useStore(paymentDialogStore).pendingPaymentId
  const txDigest = useStore(paymentDialogStore).txDigest
  const stepText = useStore(paymentDialogStore).stepText
  const canCancel = useStore(paymentDialogStore).canCancel
  const mustComplete = useStore(paymentDialogStore).mustComplete

  const { neoline, account } = useNeoLineN3()
  const { isWalletAuthenticated } = useWalletAuth()
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false)

  const isWorking = status !== PaymentStatus.Idle && status !== PaymentStatus.Completed && status !== PaymentStatus.Failed

  const loadExistingPayment = useCallback(async () => {
    try {
      const response = await hClientWithAuth.api['pending-payment'].$get()
      const result = await response.json()
      if (result.ok && result.data.pendingPayment) {
        const payment = result.data.pendingPayment as any
        if (payment.status === 'pending' || payment.status === 'signed') {
          paymentDialogActions.loadIncompletePayment(payment)
          if (payment.status === 'signed') {
            setShowIncompleteWarning(true)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load existing payment:', error)
    }
  }, [])

  // Load existing pending payment when dialog opens
  useEffect(() => {
    if (isOpen && isWalletAuthenticated) {
      loadExistingPayment()
    }
  }, [isOpen, isWalletAuthenticated, loadExistingPayment])

  function handleClose(open: boolean) {
    if (!open) {
      const canClose = paymentDialogActions.close()
      if (!canClose) {
        setShowIncompleteWarning(true)
        // Force dialog to stay open if cannot close
        return
      }
    }
  }

  function handleAmountChange(value: string) {
    paymentDialogActions.setAmount(value)
  }

  async function handleContinueFromEnterAmount() {
    if (!account || !isWalletAuthenticated) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      paymentDialogActions.setStatus(PaymentStatus.CreatingPending)

      // Create pending payment in backend
      const response = await hClientWithAuth.api['create-pending-payment'].$post({
        json: {
          nonce: generateNonce(),
          amount: Math.floor(Number(amount) * 100000000) // Convert GAS to smallest unit (8 decimals)
        }
      })

      const result = await response.json()
      if (!result.ok) {
        toast.error(`Failed to create payment: ${result.error?.message || 'Unknown error'}`)
        paymentDialogActions.setStatus(PaymentStatus.Failed)
        return
      }

      paymentDialogActions.setPendingPaymentId(result.data.pendingPayment?.id ?? '')
      paymentDialogActions.setStep(PaymentStep.SignTransaction)
      paymentDialogActions.setStatus(PaymentStatus.Idle)
    } catch (error: any) {
      console.error('Failed to create payment:', error)
      toast.error(`Failed to create payment: ${error?.message || 'Unknown error'}`)
      paymentDialogActions.setStatus(PaymentStatus.Failed)
    }
  }

  async function handleSignTransaction() {
    if (!neoline || !account || !pendingPaymentId) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      paymentDialogActions.setStatus(PaymentStatus.Signing)

      const contractHash = VibeCodingAppPaymentContract.SCRIPT_HASH
      const amountInSmallestUnit = Math.floor(Number(amount) * 100000000) // 8 decimals

      // Convert address to scriptHash for signers and args
      let signerAccount = account
      let fromScriptHash = account

      if (account.startsWith('N')) {
        // Convert address to scriptHash
        const scriptHashResult = await neoline.AddressToScriptHash({ address: account })
        signerAccount = scriptHashResult.scriptHash
        fromScriptHash = scriptHashResult.scriptHash
      }

      // Format contract hash (ensure it's lowercase without 0x prefix for Hash160)
      let formattedContractHash = contractHash
      if (formattedContractHash.startsWith('0x')) {
        formattedContractHash = formattedContractHash.slice(2)
      }
      formattedContractHash = formattedContractHash.toLowerCase()

      // Transfer GAS to the payment contract using NeoLine invoke
      const result = await neoline.invoke({
        scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS Token
        operation: 'transfer',
        args: [
          {
            type: 'Hash160',
            value: fromScriptHash
          },
          {
            type: 'Hash160',
            value: formattedContractHash
          },
          {
            type: 'Integer',
            value: amountInSmallestUnit.toString()
          },
          {
            type: 'Array',
            value: []
          }
        ],
        signers: [
          {
            account: signerAccount,
            scopes: 1
          }
        ],
        fee: '0.0001'
      })

      const txid = result.txid
      paymentDialogActions.setTxDigest(txid)

      // Update payment status to 'signed'
      const updateResponse = await hClientWithAuth.api['update-pending-payment-status'].$post({
        json: {
          pendingPaymentId,
          status: 'signed',
          txDigest: txid
        }
      })

      const updateResult = await updateResponse.json()
      if (!updateResult.ok) {
        toast.error(`Failed to update payment status: ${updateResult.error?.message || 'Unknown error'}`)
        paymentDialogActions.setStatus(PaymentStatus.Failed)
        return
      }

      toast.success('Transaction signed successfully! Verifying on blockchain...')
      paymentDialogActions.setStep(PaymentStep.VerifyTransaction)
      paymentDialogActions.setStatus(PaymentStatus.Idle)

      // Auto-check transaction after a short delay
      setTimeout(async () => {
        await checkAndVerifyTransaction(txid)
      }, 3000) // Wait 3 seconds for transaction to be included in a block
    } catch (error: any) {
      console.error('Failed to sign transaction:', error)
      const errorMessage = error?.description || error?.message || 'Unknown error'
      
      if (error?.type === 'CANCELED' || errorMessage.includes('cancel')) {
        toast.warning('Transaction was cancelled. You can try again.')
      } else if (error?.type === 'INSUFFICIENT_FUNDS' || errorMessage.includes('insufficient')) {
        toast.error('Insufficient balance. Please ensure you have enough GAS.')
      } else {
        toast.error(`Failed to sign transaction: ${errorMessage}`)
      }
      paymentDialogActions.setStatus(PaymentStatus.Failed)
    }
  }

  async function checkAndVerifyTransaction(txid: string, retries = 5) {
    if (!neoline || !pendingPaymentId) return

    try {
      // Try to get transaction to check if it's confirmed
      const tx = await neoline.getTransaction({ txid })
      
      if (tx && tx.block_index !== undefined && tx.block_index > 0) {
        // Transaction is confirmed, proceed with verification
        await handleVerifyTransaction(txid)
      } else if (retries > 0) {
        // Transaction not confirmed yet, retry after delay
        setTimeout(() => {
          checkAndVerifyTransaction(txid, retries - 1)
        }, 3000) // Retry every 3 seconds
      } else {
        // Max retries reached, let user manually verify
        paymentDialogActions.setStatus(PaymentStatus.Idle)
      }
    } catch {
      // Transaction might not be in blockchain yet, retry if we have retries left
      if (retries > 0) {
        setTimeout(() => {
          checkAndVerifyTransaction(txid, retries - 1)
        }, 3000)
      } else {
        // Max retries reached, let user manually verify
        paymentDialogActions.setStatus(PaymentStatus.Idle)
      }
    }
  }

  async function handleVerifyTransaction(digest?: string) {
    const verifyDigest = digest || txDigest
    if (!verifyDigest || !pendingPaymentId) {
      toast.error('No transaction digest or pending payment found')
      return
    }

    try {
      paymentDialogActions.setStatus(PaymentStatus.Verifying)

      const response = await hClientWithAuth.api['verify-payment-transaction'].$post({
        json: {
          txDigest: verifyDigest,
          pendingPaymentId
        }
      })

      const result = await response.json()
      if (!result.ok) {
        const errorMsg = result.error?.message || 'Unknown error'
        toast.error(`Failed to verify payment: ${errorMsg}`)
        paymentDialogActions.setStatus(PaymentStatus.Failed)
        return
      }

      toast.success(
        `Payment verified! Added ${result.data.pointsAdded} points. New balance: ${result.data.newBalance}`,
        { autoClose: 5000 }
      )

      paymentDialogActions.setStep(PaymentStep.Completed)
      paymentDialogActions.setStatus(PaymentStatus.Completed)

      // Reset and close after delay
      setTimeout(() => {
        paymentDialogActions.reset()
        paymentDialogActions.close()
        setShowIncompleteWarning(false)
        // Trigger refresh by dispatching custom event
        window.dispatchEvent(new CustomEvent('payment-completed'))
      }, 2000)
    } catch (error: any) {
      console.error('Failed to verify payment:', error)
      toast.error(`Failed to verify payment: ${error?.message || 'Unknown error'}`)
      paymentDialogActions.setStatus(PaymentStatus.Failed)
    }
  }

  async function handleCancelPayment() {
    if (!pendingPaymentId) {
      paymentDialogActions.reset()
      paymentDialogActions.close()
      return
    }

    try {
      const response = await hClientWithAuth.api['update-pending-payment-status'].$post({
        json: {
          pendingPaymentId,
          status: 'failed'
        }
      })

      const result = await response.json()
      if (!result.ok) {
        toast.error(`Failed to cancel payment: ${result.error?.message || 'Unknown error'}`)
        return
      }

      toast.info('Payment cancelled')
      paymentDialogActions.reset()
      paymentDialogActions.close()
    } catch (error: any) {
      console.error('Failed to cancel payment:', error)
      toast.error(`Failed to cancel payment: ${error?.message || 'Unknown error'}`)
    }
  }

  function handleCancelIncompletePayment() {
    if (paymentDialogActions.clearIncompletePayment()) {
      setShowIncompleteWarning(false)
      toast.info('Incomplete payment cleared')
    } else {
      toast.warning('Cannot cancel signed payment. Please complete verification.')
    }
  }

  function handleStep() {
    switch (currentStep) {
      case PaymentStep.EnterAmount:
        return handleContinueFromEnterAmount()
      case PaymentStep.SignTransaction:
        return handleSignTransaction()
      case PaymentStep.VerifyTransaction:
        return handleVerifyTransaction()
      default:
        return
    }
  }

  function getButtonText() {
    if (isWorking) return stepText
    switch (currentStep) {
      case PaymentStep.EnterAmount:
        return 'Continue'
      case PaymentStep.SignTransaction:
        return 'Sign Transaction'
      case PaymentStep.VerifyTransaction:
        return 'Verify Payment'
      case PaymentStep.Completed:
        return 'Completed'
      default:
        return 'Continue'
    }
  }

  if (!isOpen) return null

  return (
    <DialogRoot open={isOpen} onOpenChange={handleClose}>
      <Dialog
        onBackdrop={() => {
          if (canCancel && !mustComplete) {
            handleClose(false)
          }
        }}
        onClose={() => {
          if (canCancel && !mustComplete) {
            handleClose(false)
          }
        }}
      >
        <DialogTitle>Add Points</DialogTitle>
        <DialogDescription>
          <div className="space-y-4">
            {showIncompleteWarning && mustComplete && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                  ⚠️ Incomplete Payment Detected
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  You have a signed transaction that needs verification. Please complete the verification to add points
                  to your account and avoid losing funds.
                </p>
              </div>
            )}

            {showIncompleteWarning && canCancel && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  💡 Incomplete Payment Found
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  You have an incomplete payment. Would you like to continue or start over?
                </p>
                <button
                  onClick={handleCancelIncompletePayment}
                  className="px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel & Start Over
                </button>
              </div>
            )}

            <Stepper steps={steps} currentStep={currentStep} isLoading={isWorking} />

            {currentStep === PaymentStep.EnterAmount && (
              <>
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Amount (GAS)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    placeholder="1"
                    value={amount}
                    onChange={e => handleAmountChange(e.target.value)}
                    disabled={isWorking}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_AMOUNTS.map(num => (
                    <button
                      key={num}
                      onClick={() => handleAmountChange(num.toString())}
                      disabled={isWorking}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      {num} GAS
                    </button>
                  ))}
                </div>
                {amount && Number(amount) > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      You will get: <span className="font-bold">{(Number(amount) * 1000).toLocaleString()} Points</span>
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 italic mt-1">(1 GAS = 1,000 Points)</p>
                  </div>
                )}
              </>
            )}

            {currentStep === PaymentStep.SignTransaction && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                <p className="text-sm font-medium mb-2">Ready to Sign</p>
                <div className="space-y-1 mb-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Amount: <span className="font-mono font-bold">{amount} GAS</span>
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                    You will get:{' '}
                    <span className="font-mono font-bold">{(Number(amount) * 1000).toLocaleString()} Points</span>
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Click the button below to sign the transaction with your NeoLine wallet.
                </p>
              </div>
            )}

            {currentStep === PaymentStep.VerifyTransaction && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                <p className="text-sm font-medium mb-2">Transaction Signed</p>
                {txDigest && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    TX ID: <span className="font-mono text-[10px]">{txDigest.slice(0, 16)}...</span>
                  </p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Click the button below to verify your payment on-chain.
                </p>
                {isWorking && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Verifying...</p>
                )}
              </div>
            )}

            {currentStep === PaymentStep.Completed && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded text-center">
                <p className="text-sm font-medium mb-1">✅ Payment Completed</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Points have been added to your account!</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              {currentStep === PaymentStep.SignTransaction ? (
                <>
                  <DialogButton type="secondary" onClick={handleCancelPayment} disabled={isWorking}>
                    Cancel
                  </DialogButton>
                  <DialogButton type="primary" onClick={handleStep} disabled={!account || isWorking}>
                    {isWorking ? stepText : getButtonText()}
                  </DialogButton>
                </>
              ) : (
                <>
                  <DialogButton type="secondary" onClick={() => handleClose(false)} disabled={isWorking || mustComplete}>
                    {mustComplete ? 'Cannot Close' : 'Cancel'}
                  </DialogButton>
                  <DialogButton
                    type="primary"
                    onClick={handleStep}
                    disabled={!account || isWorking || currentStep === PaymentStep.Completed}
                  >
                    {isWorking ? stepText : getButtonText()}
                  </DialogButton>
                </>
              )}
            </div>

            {!account && (
              <div className="text-center py-2">
                <p className="text-sm text-red-600 dark:text-red-400">Please connect your wallet first</p>
              </div>
            )}

            <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ⚠️ Once you sign the transaction, you must complete the verification step. Do not close this dialog
                until the process is complete.
              </p>
            </div>
          </div>
        </DialogDescription>
      </Dialog>
    </DialogRoot>
  )
}
