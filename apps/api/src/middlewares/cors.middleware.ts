import { cors } from 'hono/cors'
import { factory } from '~/factory'

export const corsMiddleware = factory.createMiddleware((c, n) => {
  const corsHandler = cors({
    origin: '*',
    maxAge: 600
  })
  return corsHandler(c, n)
})
