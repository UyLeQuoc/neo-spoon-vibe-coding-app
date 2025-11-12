import { factory } from '~/factory'
import { authNonceRoute } from './api.auth.nonce'
import { authRefreshRoute } from './api.auth.refresh'
import { authVerifyRoute } from './api.auth.verify'

export const authRoutes = factory
  .createApp()
  .route('/', authNonceRoute)
  .route('/', authVerifyRoute)
  .route('/', authRefreshRoute)
