import { map } from 'nanostores'

export enum PaymentStep {
  EnterAmount = 0,
  SignTransaction = 1,
  VerifyTransaction = 2,
  Completed = 3
}

export enum PaymentStatus {
  Idle = 'idle',
  CreatingPending = 'creating_pending',
  Signing = 'signing',
  Verifying = 'verifying',
  Completed = 'completed',
  Failed = 'failed'
}

interface PaymentDialogState {
  isOpen: boolean
  amount: string
  currentStep: PaymentStep
  status: PaymentStatus
  pendingPaymentId: string | null
  txDigest: string | null
  stepText: string
  canCancel: boolean
  mustComplete: boolean
}

const initialState: PaymentDialogState = {
  isOpen: false,
  amount: '',
  currentStep: PaymentStep.EnterAmount,
  status: PaymentStatus.Idle,
  pendingPaymentId: null,
  txDigest: null,
  stepText: '',
  canCancel: true,
  mustComplete: false
}

export const paymentDialogStore = map<PaymentDialogState>(initialState)

// Generate random nonce
function _generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// Actions
export const paymentDialogActions = {
  open() {
    paymentDialogStore.set({
      ...initialState,
      isOpen: true
    })
  },

  close() {
    const current = paymentDialogStore.get()
    if (current.mustComplete) {
      return false // Cannot close if must complete
    }
    paymentDialogStore.set({ ...current, isOpen: false })
    return true
  },

  setAmount(amount: string) {
    const current = paymentDialogStore.get()
    paymentDialogStore.set({ ...current, amount })
  },

  setStep(step: PaymentStep) {
    const current = paymentDialogStore.get()
    paymentDialogStore.set({ ...current, currentStep: step })
  },

  setStatus(status: PaymentStatus) {
    const current = paymentDialogStore.get()
    let stepText = ''
    let canCancel = true
    let mustComplete = false

    switch (status) {
      case PaymentStatus.CreatingPending:
        stepText = 'Creating payment...'
        canCancel = true
        break
      case PaymentStatus.Signing:
        stepText = 'Waiting for wallet approval...'
        canCancel = true
        break
      case PaymentStatus.Verifying:
        stepText = 'Verifying transaction...'
        canCancel = false
        mustComplete = true
        break
      case PaymentStatus.Completed:
        stepText = 'Completed!'
        canCancel = false
        break
      case PaymentStatus.Failed:
        stepText = 'Failed'
        canCancel = true
        break
    }

    paymentDialogStore.set({
      ...current,
      status,
      stepText,
      canCancel,
      mustComplete
    })
  },

  setPendingPaymentId(id: string) {
    const current = paymentDialogStore.get()
    paymentDialogStore.set({ ...current, pendingPaymentId: id })
  },

  setTxDigest(digest: string) {
    const current = paymentDialogStore.get()
    paymentDialogStore.set({ ...current, txDigest: digest })
  },

  loadIncompletePayment(payment: { id: string; amount: number; status: string; txDigest?: string; nonce: string }) {
    const current = paymentDialogStore.get()
    const amountInGas = (payment.amount / 100000000).toFixed(8)
    paymentDialogStore.set({
      ...current,
      amount: amountInGas,
      pendingPaymentId: payment.id,
      txDigest: payment.txDigest || null,
      currentStep: payment.status === 'signed' ? PaymentStep.VerifyTransaction : PaymentStep.SignTransaction,
      mustComplete: payment.status === 'signed'
    })
  },

  reset() {
    paymentDialogStore.set({
      ...initialState
    })
  },

  clearIncompletePayment(): boolean {
    const current = paymentDialogStore.get()
    // Can only clear if not signed
    if (current.currentStep === PaymentStep.VerifyTransaction) {
      return false
    }
    this.reset()
    return true
  }
}
