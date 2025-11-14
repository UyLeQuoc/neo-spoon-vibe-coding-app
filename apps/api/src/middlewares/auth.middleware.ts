import { jwt } from 'hono/jwt'
import { APP_NAME, apiFailed } from 'shared'
import { factory } from '~/factory'

export const authMiddware = factory.createMiddleware(async (c, next) => {
  const m = jwt({ secret: c.env.JWT_SECRET, verification: { iss: APP_NAME } })
  await m(c, next)
})

export const requiredRole = (role: string) =>
  factory.createMiddleware(async (c, next) => {
    const jwtPayload = c.get('jwtPayload')
    if (!jwtPayload || !jwtPayload.roles.includes(role))
      return c.json(apiFailed({ code: 'FORBIDDEN_ROLE', message: 'Forbidden role' }), 403)

    await next()
  })
