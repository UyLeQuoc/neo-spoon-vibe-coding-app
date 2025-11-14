// Re-export all tables and types from the tables directory
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from './tables'

export * from './tables' //Re-export all tables and types from the tables directory
export type Wal0DatabaseSchema = typeof schema
export type Wal0Database = DrizzleD1Database<Wal0DatabaseSchema>
export const dbSchema = schema
