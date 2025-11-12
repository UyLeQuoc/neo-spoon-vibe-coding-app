import { factory } from '~/factory'
import { authRoutes } from './auth'

export const routes = factory
  .createApp()
  .route('/', authRoutes)
