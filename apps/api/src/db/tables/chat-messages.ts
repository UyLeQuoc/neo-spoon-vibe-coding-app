import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { chatSessionsTable } from './chat-sessions'

export const chatMessagesTable = sqliteTable('ChatMessages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessionsTable.id),
  messageId: text('message_id'),
  content: text('content').notNull(),
  timestamp: int('timestamp', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

export type IChatMessage = typeof chatMessagesTable.$inferSelect
