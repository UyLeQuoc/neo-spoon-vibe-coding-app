import type { AppType } from 'api'
import { hc } from 'hono/client'
import { walletAuthStore } from '~/lib/stores/wallet-auth.store'
import { getApiBaseUrl } from './hono-client'

/**
 * Fully typed hono client for the API server. With authentication.
 *
 * NOTE: make sure to build the API apps to keep the types in sync:
 * ```sh
 * pnpm -F api build
 * ```
 */
export const hClientWithAuth = hc<AppType>(getApiBaseUrl(), {
  headers: async () => ({
    Authorization: `Bearer ${await walletAuthStore.getOrRefreshJwtToken()}`
  })
})
