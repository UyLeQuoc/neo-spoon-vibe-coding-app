import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import z from 'zod'
import { apiFailed, ok } from 'shared'
import { dbSchema, pendingPaymentsTable, usersTable } from '~/db/schema'
import { factory } from '~/factory'
import { authMiddware } from '~/middlewares/auth.middleware'
import { getOrCreateUser } from '../api.balance'
import { toApiPendingPayment } from './helpers'

const verifyPaymentInputSchema = z.object({
  txDigest: z.string().min(1, 'Transaction digest is required'),
  pendingPaymentId: z.string().min(1, 'Pending payment ID is required')
})

export type VerifyPaymentResponse = {
  pendingPayment: typeof pendingPaymentsTable.$inferSelect
  pointsAdded: number
  newBalance: number
}

// POST /verify-payment-transaction
export const verifyPaymentTransactionRoute = factory
  .createApp()
  .post(
    '/verify-payment-transaction',
    authMiddware,
    zValidator('json', verifyPaymentInputSchema),
    async c => {
      const { sub: userAddr } = c.get('jwtPayload') ?? {}
      const { txDigest, pendingPaymentId } = c.req.valid('json')

      const db = drizzle(c.env.DB, { schema: dbSchema })

      try {
        // Get pending payment
        const pendingPayment = await db
          .select()
          .from(pendingPaymentsTable)
          .where(eq(pendingPaymentsTable.id, pendingPaymentId))
          .get()

        if (!pendingPayment) {
          return c.json(
            apiFailed({
              code: 'PENDING_PAYMENT_NOT_FOUND',
              message: 'Pending payment not found'
            }),
            404
          )
        }

        if (pendingPayment.address !== userAddr) {
          return c.json(
            apiFailed({
              code: 'UNAUTHORIZED',
              message: 'Unauthorized to verify this payment'
            }),
            403
          )
        }

        if (pendingPayment.status !== 'signed') {
          return c.json(
            apiFailed({
              code: 'INVALID_STATUS',
              message: 'Payment must be signed before verification'
            }),
            400
          )
        }

        // TODO: Verify transaction on blockchain using RPC getapplicationlog
        // For now, we'll just mark it as verified and add points
        // In production, you should verify the transaction actually exists and contains PaymentReceived event

        // Update payment status to verified
        await db
          .update(pendingPaymentsTable)
          .set({
            status: 'verified',
            updatedAt: new Date()
          })
          .where(eq(pendingPaymentsTable.id, pendingPaymentId))
          .run()

        // Get updated payment
        const updatedPayment = await db
          .select()
          .from(pendingPaymentsTable)
          .where(eq(pendingPaymentsTable.id, pendingPaymentId))
          .get()

        if (!updatedPayment) {
          return c.json(
            apiFailed({
              code: 'PAYMENT_NOT_FOUND_AFTER_UPDATE',
              message: 'Payment not found after update'
            }),
            500
          )
        }

        // Add points to user balance (1 GAS = 1000 points, amount is in smallest unit)
        const pointsToAdd = Math.floor((pendingPayment.amount / 100000000) * 1000)
        const user = await getOrCreateUser(db, userAddr)
        const newBalance = (user.balance || 0) + pointsToAdd

        await db
          .update(usersTable)
          .set({ balance: newBalance })
          .where(eq(usersTable.address, userAddr))
          .run()

        return c.json(
          ok<VerifyPaymentResponse>({
            pendingPayment: toApiPendingPayment(updatedPayment),
            pointsAdded: pointsToAdd,
            newBalance
          })
        )
      } catch (error) {
        console.error('Failed to verify payment transaction:', error)
        return c.json(
          apiFailed({
            code: 'VERIFY_PAYMENT_FAILED',
            message: 'Failed to verify payment transaction'
          }),
          500
        )
      }
    }
  )
