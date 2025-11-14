import { sql } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { chatSessionsTable } from './chat-sessions'

export const sitesTable = sqliteTable('Sites', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessionsTable.id),
  title: text('title').notNull(),
  desc: text('desc'),
  icon: text('icon'),
  createdAt: int('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  isLatest: int('is_latest', { mode: 'boolean' }).default(false),
  distPackageUrl: text('dist_package_url'), // build zip file in s3
  siteId: text('site_id'), // blob id in sui
  txDigest_registerBlob: text('tx_digest_register_blob'),
  txDigest_updateSiteMetadata: text('tx_digest_update_site_metadata'),
  txDigest_certifyUpload: text('tx_digest_certify_upload')
})

export type ISite = typeof sitesTable.$inferSelect
