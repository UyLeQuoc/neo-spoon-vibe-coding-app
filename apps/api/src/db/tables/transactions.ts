import { sql } from 'drizzle-orm'
import { int, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const transactionsTable = sqliteTable('TransactionHistory', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  address: text('addr'),
  amount: int('amount'),
  note: text('note'),
  timestamp: int('timestamp', { mode: 'timestamp' }).default(sql`(unixepoch())`)
})

export type ITransaction = typeof transactionsTable.$inferSelect
