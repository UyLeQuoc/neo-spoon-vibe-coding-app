import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const chatSessionsTable = sqliteTable('ChatSessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userAddress: text('user_address').notNull(),
  title: text('title').notNull().default('New Chat'),
  isFirstRun: int('is_first_run', { mode: 'boolean' }).default(true),
  previewUrl: text('preview_url'),
  inputToken: int('input_token').default(0),
  outputToken: int('output_token').default(0),
  totalToken: int('total_token').default(0),
  initMessage: text('init_message'),
  modelId: text('model_id'),
  activeStreamId: text('active_stream_id'), // For resume streams feature
  status: text('status', {
    enum: ['initializing', 'active', 'archived', 'deleted']
  })
    .notNull()
    .default('active'), // active, archived, deleted
  codeGenStatus: text('code_gen_status', {
    enum: ['draft', 'ready']
  }).default('draft'),
  createdAt: int('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: int('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`)
})

export type IChatSession = typeof chatSessionsTable.$inferSelect
