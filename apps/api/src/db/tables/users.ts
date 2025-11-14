import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('Users', {
  address: text('addr').primaryKey(),
  balance: int('balance'), // POINTS
  createdAt: int('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
})

export type IUser = typeof usersTable.$inferSelect
