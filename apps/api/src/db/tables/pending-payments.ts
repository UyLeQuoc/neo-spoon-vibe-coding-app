import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const pendingPaymentsTable = sqliteTable('PendingPayments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  address: text('address').notNull(),
  nonce: text('nonce').notNull(),
  amount: int('amount').notNull(),
  status: text('status', {
    enum: ['pending', 'signed', 'verified', 'failed']
  })
    .notNull()
    .default('pending'),
  txDigest: text('tx_digest'),
  createdAt: int('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: int('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
})

export type IPendingPayment = typeof pendingPaymentsTable.$inferSelect
