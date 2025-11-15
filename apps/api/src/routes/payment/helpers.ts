import type { IPendingPayment } from "~/db/tables";

/**
 * API response format for pending payment with Unix timestamps (seconds)
 */
export type ApiPendingPayment = Omit<IPendingPayment, 'createdAt' | 'updatedAt'> & {
  createdAt: number | null
  updatedAt: number | null
}

/**
 * Convert DB pending payment (with Date objects) to API response format (with Unix timestamps in seconds)
 */
export function toApiPendingPayment(
  payment: IPendingPayment
): ApiPendingPayment {
  return {
    id: payment.id,
    address: payment.address,
    nonce: payment.nonce,
    amount: payment.amount,
    status: payment.status,
    txDigest: payment.txDigest,
    // Convert Date to Unix timestamp (seconds) for API response
    createdAt: payment.createdAt ? Math.floor(new Date(payment.createdAt).getTime() / 1000) : null,
    updatedAt: payment.updatedAt ? Math.floor(new Date(payment.updatedAt).getTime() / 1000) : null
  }
}
