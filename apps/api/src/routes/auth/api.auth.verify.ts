import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { APP_NAME, ApiAuthVerifyInput, apiFailed, generateJwtToken, ok } from 'shared'
import { dbSchema } from '~/db/schema'
import { factory } from '~/factory'
import { verifyAuthMessageAndDeleteNonce } from './_lib/auth-messages'
import { generateAndSaveRefreshToken } from './_lib/refresh-token'

//MOCK: ADMIN ADDRESSES
export const ADMIN_ADDRESSES = [
  // TODO: add real admin addresses
  '0x1234567890abcdef1234567890abcdef12345678'
]

export const authVerifyRoute = factory
  .createApp()
  .post('/auth/verify', zValidator('json', ApiAuthVerifyInput), async c => {
    const { KV, JWT_SECRET, REFRESH_TOKEN_SECRET, DB } = c.env
    const { signedMessage, walletAddress } = c.req.valid('json')

    const result = await verifyAuthMessageAndDeleteNonce(KV, walletAddress, signedMessage)
    if (!result.ok) return c.json(apiFailed({ code: 'INVALID_SIGNATURE', message: result.error }), 400)

    // Login successful, get user info (or create if first time)
    const db = drizzle(DB, { schema: dbSchema })
    let user = await db.query.usersTable.findFirst({
      where: (u, { eq }) => eq(u.address, walletAddress)
    })
    if (!user) {
      // First time login, create user and add bonus credits
      const [insertedUser] = await db
        .insert(dbSchema.usersTable)
        .values({
          address: walletAddress,
          balance: 0
        })
        .returning()
      user = insertedUser
    }

    // Generate access token
    const token = await generateJwtToken(
      {
        sub: user.address,
        iss: APP_NAME,
        roles: ADMIN_ADDRESSES.includes(user.address) ? ['admin'] : ['user']
      },
      JWT_SECRET
    )
    const refreshToken = await generateAndSaveRefreshToken(KV, user.address, REFRESH_TOKEN_SECRET)

    return c.json(ok({ token, refreshToken }))
  })
