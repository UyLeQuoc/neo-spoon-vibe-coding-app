import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { apiFailed, ok } from 'shared'
import { dbSchema } from '~/db/schema'
import { pendingPaymentsTable } from '~/db/tables'
import { factory } from '~/factory'
import { authMiddware } from '~/middlewares/auth.middleware'
import type { ApiPendingPayment } from './helpers'
import { toApiPendingPayment } from './helpers'

export type GetPendingPaymentResponse = {
  pendingPayment: ApiPendingPayment | null
}

// GET /pending-payment - Get user's last incomplete pending payment
export const getPendingPaymentRoute = factory.createApp().get('/pending-payment', authMiddware, async c => {
  const { sub: userAddr } = c.get('jwtPayload') ?? {}

  const db = drizzle(c.env.DB, { schema: dbSchema })

  try {
    // Get the most recent pending or signed payment for this user
    const pendingPayment = await db
      .select()
      .from(pendingPaymentsTable)
      .where(
        and(
          eq(pendingPaymentsTable.address, userAddr),
          // Get payments that are pending or signed (not verified/failed)
          eq(pendingPaymentsTable.status, 'pending')
        )
      )
      .orderBy(pendingPaymentsTable.createdAt)
      .limit(1)
      .get()

    if (!pendingPayment) {
      // Also check for signed status
      const signedPayment = await db
        .select()
        .from(pendingPaymentsTable)
        .where(and(eq(pendingPaymentsTable.address, userAddr), eq(pendingPaymentsTable.status, 'signed')))
        .orderBy(pendingPaymentsTable.createdAt)
        .limit(1)
        .get()

      if (!signedPayment) {
        return c.json(
          ok<GetPendingPaymentResponse>({
            pendingPayment: null
          })
        )
      }

      return c.json(
        ok<GetPendingPaymentResponse>({
          pendingPayment: toApiPendingPayment(signedPayment)
        })
      )
    }

    return c.json(
      ok<GetPendingPaymentResponse>({
        pendingPayment: toApiPendingPayment(pendingPayment)
      })
    )
  } catch (error) {
    console.error('Failed to get pending payment:', error)
    return c.json(
      apiFailed({
        code: 'GET_PENDING_PAYMENT_FAILED',
        message: 'Failed to get pending payment'
      }),
      500
    )
  }
})
