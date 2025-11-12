import { failed } from '@wal-0/shared'
import type { Context } from 'hono'
import { type AppEnv, factory } from '~/factory'

const cfHeaders = {
  'CF-Connecting-IP': 'CF-Connecting-IP',
  'CF-Connecting-IPv6': 'CF-Connecting-IPv6',
  'X-Forwarded-For': 'X-Forwarded-For'
}

const responses = {
  missingKey: failed({
    code: 'invalid_request',
    error: { code: 'invalid_request', message: 'Missing rate limit key' }
  }),
  rateLimitExceeded: failed({
    code: 'too_many_requests',
    error: { code: 'too_many_requests', message: 'Too many requests' }
  })
}

const rateLimitMiddlewareGen = (keyGetter: (c: Context<AppEnv>) => string) =>
  factory.createMiddleware(async (c, next) => {
    const key = keyGetter(c)
    if (!key) return c.json(responses.missingKey, 400)
    const { success } = await c.env.MAIN_RATE_LIMITER.limit({ key })
    if (!success) return c.json(responses.rateLimitExceeded, 429)
    await next()
  })

/**
 * Rate limiting middleware, based on request's IP address.
 *
 * Returns:
 * - HTTP 400 if the rate limit key is missing
 * - HTTP 429 if the rate limit is exceeded
 *
 * <https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/>
 */
export const ipBasedRateLimiterMiddleware = rateLimitMiddlewareGen(
  c =>
    c.req.header(cfHeaders['CF-Connecting-IP']) ||
    c.req.header(cfHeaders['CF-Connecting-IPv6']) ||
    c.req.header(cfHeaders['X-Forwarded-For']) ||
    'anonymous'
)

/**
 * Rate limiting middleware, based on authenticated user (JWT sub).
 *
 * Returns:
 * - HTTP 400 if the rate limit key is missing
 * - HTTP 429 if the rate limit is exceeded
 *
 * <https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/>
 */
export const userBasedRateLimitMiddleware = rateLimitMiddlewareGen(
  c => c.get('jwtPayload')?.sub || 'anonymous'
)
