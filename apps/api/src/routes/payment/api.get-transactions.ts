import { desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { apiFailed, ok } from 'shared'
import { dbSchema, transactionsTable } from '~/db/schema'
import { factory } from '~/factory'
import { authMiddware } from '~/middlewares/auth.middleware'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export type GetTransactionsResponse = {
  transactions: Array<{
    id: number
    address: string | null
    amount: number | null
    note: string | null
    timestamp: number | null // Unix timestamp in seconds
  }>
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// GET /transactions - Get user's transaction history with paging
export const getTransactionsRoute = factory.createApp().get('/transactions', authMiddware, async c => {
  const { sub: userAddr } = c.get('jwtPayload') ?? {}

  const db = drizzle(c.env.DB, { schema: dbSchema })

  try {
    // Parse query parameters
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(c.req.query('pageSize') || String(DEFAULT_PAGE_SIZE), 10))
    )

    // Get total count
    const totalCountResult = await db.select().from(transactionsTable).where(eq(transactionsTable.address, userAddr))
    const totalCount = totalCountResult.length

    // Get transactions with pagination
    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.address, userAddr))
      .orderBy(desc(transactionsTable.timestamp))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all()

    const totalPages = Math.ceil(totalCount / pageSize)

    return c.json(
      ok<GetTransactionsResponse>({
        transactions: transactions.map(tx => ({
          id: tx.id,
          address: tx.address,
          amount: tx.amount,
          note: tx.note,
          // Convert Date to Unix timestamp (seconds) for API response
          timestamp: tx.timestamp ? Math.floor(new Date(tx.timestamp).getTime() / 1000) : null
        })),
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      })
    )
  } catch (error) {
    console.error('Failed to get transactions:', error)
    return c.json(
      apiFailed({
        code: 'GET_TRANSACTIONS_FAILED',
        message: 'Failed to get transactions'
      }),
      500
    )
  }
})
