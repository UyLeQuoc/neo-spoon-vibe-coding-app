import { zValidator } from '@hono/zod-validator'
import { and, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { factory } from '~/factory'
import { authMiddware } from '~/middlewares/auth.middleware'
import z from 'zod'
import type { IPendingPayment } from '~/db/tables'
import { dbSchema, pendingPaymentsTable } from '~/db/schema'
import { apiFailed, ok } from 'shared'
import { toApiPendingPayment } from './helpers'

const createPendingPaymentInputSchema = z.object({
  nonce: z.string().min(1, 'Nonce is required'),
  amount: z.number().min(1, 'Amount is required')
})

export type CreatePendingPaymentResponse = {
  pendingPayment: IPendingPayment | null
}
// POST /create-pending-payment
export const createPendingPaymentRoute = factory
  .createApp()
  .post(
    '/create-pending-payment',
    authMiddware,
    zValidator('json', createPendingPaymentInputSchema),
    async c => {
      const { sub: userAddr } = c.get('jwtPayload') ?? {}
      const { nonce, amount } = c.req.valid('json')

      const db = drizzle(c.env.DB, { schema: dbSchema })

      try {
        // Check if there's already a pending/signed payment with this nonce
        const existingPayment = await db
          .select()
          .from(pendingPaymentsTable)
          .where(eq(pendingPaymentsTable.nonce, nonce))
          .get()

        if (existingPayment) {
          return c.json(
            ok<CreatePendingPaymentResponse>({
              pendingPayment: toApiPendingPayment(existingPayment)
            })
          )
        }

        // Cancel any existing pending or signed payments for this user
        await db
          .update(pendingPaymentsTable)
          .set({
            status: 'failed',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(pendingPaymentsTable.address, userAddr),
              inArray(pendingPaymentsTable.status, ['pending', 'signed'])
            )
          )
          .run()

        // Create new pending payment
        const [newPayment] = await db
          .insert(pendingPaymentsTable)
          .values({
            address: userAddr,
            nonce,
            amount,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning()

        return c.json(
          ok<CreatePendingPaymentResponse>({
            pendingPayment: toApiPendingPayment(newPayment)
          })
        )
      } catch (error) {
        console.error('Failed to create pending payment:', error)
        return c.json(
          apiFailed({
            code: 'CREATE_PENDING_PAYMENT_FAILED',
            message: 'Failed to create pending payment'
          }),
          500
        )
      }
    }
  )
