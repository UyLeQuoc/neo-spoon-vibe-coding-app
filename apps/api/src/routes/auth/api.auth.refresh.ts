import { zValidator } from '@hono/zod-validator'
import { APP_NAME, ApiAuthRefreshInput, type ApiAuthRefreshOutput, apiFailed, generateJwtToken, ok } from 'shared'
import { factory } from '~/factory'
import { verifyAndRotateRefreshToken } from './_lib/refresh-token'
import { ADMIN_ADDRESSES } from './api.auth.verify'

export const authRefreshRoute = factory
  .createApp()
  .post('/auth/refresh', zValidator('json', ApiAuthRefreshInput), async c => {
    const { KV, JWT_SECRET, REFRESH_TOKEN_SECRET } = c.env
    const { walletAddress, refreshToken } = c.req.valid('json')

    // Verify the refresh token
    const nextRefreshToken = await verifyAndRotateRefreshToken(KV, walletAddress, refreshToken, REFRESH_TOKEN_SECRET)

    if (!nextRefreshToken)
      return c.json(
        apiFailed({
          code: 'invalid_refresh_token',
          message: 'Invalid or expired refresh token'
        }),
        401
      )

    const nextToken = await generateJwtToken(
      {
        sub: walletAddress,
        iss: APP_NAME,
        roles: ADMIN_ADDRESSES.includes(walletAddress) ? ['admin'] : ['user'] // TODO: fetch user roles from DB
      },
      JWT_SECRET
    )

    return c.json(
      ok<ApiAuthRefreshOutput>({
        token: nextToken,
        refreshToken: nextRefreshToken
      })
    )
  })
