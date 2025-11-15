import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { apiFailed, ok } from 'shared'
import z from 'zod'
import { dbSchema, pendingPaymentsTable } from '~/db/schema'
import { factory } from '~/factory'
import { authMiddware } from '~/middlewares/auth.middleware'
import type { ApiPendingPayment } from './helpers'
import { toApiPendingPayment } from './helpers'

const updatePaymentStatusInputSchema = z.object({
  pendingPaymentId: z.string().min(1, 'Pending payment ID is required'),
  status: z.enum(['pending', 'signed', 'verified', 'failed']),
  txDigest: z.string().optional()
})

export type UpdatePaymentStatusResponse = {
  pendingPayment: ApiPendingPayment | null
}

// POST /update-pending-payment-status
export const updatePendingPaymentStatusRoute = factory
  .createApp()
  .post('/update-pending-payment-status', authMiddware, zValidator('json', updatePaymentStatusInputSchema), async c => {
    const { sub: userAddr } = c.get('jwtPayload') ?? {}
    const { pendingPaymentId, status, txDigest } = c.req.valid('json')

    const db = drizzle(c.env.DB, { schema: dbSchema })

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
          message: 'Unauthorized to update this payment'
        }),
        403
      )
    }

    try {
      await db
        .update(pendingPaymentsTable)
        .set({
          status,
          ...(txDigest && { txDigest }),
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

      return c.json(
        ok<UpdatePaymentStatusResponse>({
          pendingPayment: toApiPendingPayment(updatedPayment)
        })
      )
    } catch (error) {
      console.error('Failed to update pending payment status:', error)
      return c.json(
        apiFailed({
          code: 'UPDATE_PENDING_PAYMENT_FAILED',
          message: 'Failed to update pending payment status'
        }),
        500
      )
    }
  })
