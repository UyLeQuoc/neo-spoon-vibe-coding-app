import { logger } from 'hono/logger'
import { timing } from 'hono/timing'
import { factory } from './factory'
import { corsMiddleware } from './middlewares/cors.middleware'
import { ipBasedRateLimiterMiddleware } from './middlewares/rate-limit.middleware'
import { routes } from './routes'

const app = factory
  .createApp()
  .use(logger())
  .use(timing())
  .use(corsMiddleware)
  .use(ipBasedRateLimiterMiddleware)
  .route('/api', routes)

export default app
