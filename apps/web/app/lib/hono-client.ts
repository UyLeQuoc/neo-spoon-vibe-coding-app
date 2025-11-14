import type { AppType } from 'api'
import { hc } from 'hono/client'

/**
 * Fully typed hono client for the API server.
 *
 * NOTE: make sure to build the API apps to keep the types in sync:
 * ```sh
 * pnpm -F api build
 * ```
 */
export const hClient = hc<AppType>('/')
