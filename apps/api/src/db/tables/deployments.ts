import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const deploymentsTable = sqliteTable('Deployments', {
  id: text('id').primaryKey(),
  buildKey: text('build_key').notNull(),
  uploadId: text('upload_id').notNull(),
  objectId: text('object_id'),
  timestamp: int('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  status: text('status').notNull().default('pending'),
  output: text('output').notNull().default(''),
  stderr: text('stderr').default('')
})

export type IDeployment = typeof deploymentsTable.$inferSelect
