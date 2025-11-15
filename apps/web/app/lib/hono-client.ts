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
// Use relative URL for production (same origin), localhost for dev
export const getApiBaseUrl = () => {
  return 'http://localhost:8787'
}

export const hClient = hc<AppType>(getApiBaseUrl())
