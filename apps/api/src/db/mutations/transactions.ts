import { drizzle } from 'drizzle-orm/d1'
import { dbSchema, transactionsTable } from '../schema'

export type InsertTransactionParams = {
  note: string
  timestamp?: number
  amount: number
  address: string
}

export async function insertTransaction(db: D1Database, params: InsertTransactionParams) {
  const { note, timestamp, amount, address } = params
  return drizzle(db, { schema: dbSchema })
    .insert(transactionsTable)
    .values({
      note,
      amount,
      address,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    })
    .onConflictDoNothing()
    .run()
}
