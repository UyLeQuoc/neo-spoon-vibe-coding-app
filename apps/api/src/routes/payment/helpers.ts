import type { IPendingPayment } from "~/db/tables";

/**
 * Convert DB pending payment (with Date objects) to API response format (with timestamps)
 */
export function toApiPendingPayment(
  payment: IPendingPayment
): IPendingPayment {
  return {
    id: payment.id,
    address: payment.address,
    nonce: payment.nonce,
    amount: payment.amount,
    status: payment.status,
    txDigest: payment.txDigest,
    createdAt: payment.createdAt ? new Date(payment.createdAt) : null,
    updatedAt: payment.updatedAt ? new Date(payment.updatedAt) : null
  }
}
