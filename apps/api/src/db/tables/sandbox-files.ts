import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { chatSessionsTable } from './chat-sessions'

export const sandboxFilesTable = sqliteTable('SandboxFiles', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessionsTable.id),
  filePath: text('file_path').notNull(),
  content: text('content').notNull(),
  createdAt: int('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: int('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
})

export type ISandboxFile = typeof sandboxFilesTable.$inferSelect
