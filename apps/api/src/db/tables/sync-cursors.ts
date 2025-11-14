import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const syncCursorsTable = sqliteTable('sync_cursors', {
  id: text('id').primaryKey(), // 'balance_sync' or custom identifier
  lastCursor: text('last_cursor'),
  lastProcessedAt: int('last_processed_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  processedCount: int('processed_count').default(0),
  errorCount: int('error_count').default(0),
  status: text('status').notNull().default('active'), // 'active', 'paused', 'error'
  metadata: text('metadata', { mode: 'json' }) // Store additional sync state
})

export type ISyncCursor = typeof syncCursorsTable.$inferSelect
