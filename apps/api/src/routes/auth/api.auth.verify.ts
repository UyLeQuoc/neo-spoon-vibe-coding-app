import { zValidator } from '@hono/zod-validator'
import { dbSchema } from '@wal-0/db'
import {
  APP_NAME,
  ApiAuthVerifyInput,
  apiFailed,
  generateJwtToken,
  ok
} from '@wal-0/shared'
import { drizzle } from 'drizzle-orm/d1'
import { factory } from '~/factory'
import { verifyCaptchaToken } from '~/lib/utils/captcha'
import { verifyAuthMessageAndDeleteNonce } from './_lib/auth-messages'
import { generateAndSaveRefreshToken } from './_lib/refresh-token'

//MOCK: ADMIN ADDRESSES
export const ADMIN_ADDRESSES = [
  '0xbd27287bb64f7dd38beb632dc8f88180de21bf720fa0d7b3c674410a8f925982',
  '0x994845a200c22d021eb08f97136a43fb04ea93fe27b1efbf8fd95f8a3034757b'
]

export const authVerifyRoute = factory
  .createApp()
  .post('/auth/verify', zValidator('json', ApiAuthVerifyInput), async c => {
    const { KV, JWT_SECRET, REFRESH_TOKEN_SECRET, DB } = c.env
    const { message, signature, walletAddress, captchaToken } =
      c.req.valid('json')

    //verify captcha token
    const captchaData = await verifyCaptchaToken(
      c.env.RECAPTCHA_SECRET_KEY,
      captchaToken
    )
    if (!captchaData?.success) {
      return c.json(
        apiFailed({
          code: 'INVALID_CAPTCHA',
          message: 'Invalid captcha token'
        }),
        400
      )
    }

    const result = await verifyAuthMessageAndDeleteNonce(
      KV,
      walletAddress,
      message,
      signature
    )
    if (!result.success)
      return c.json(
        apiFailed({ code: 'INVALID_SIGNATURE', message: result.error }),
        400
      )

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
    const refreshToken = await generateAndSaveRefreshToken(
      KV,
      user.address,
      REFRESH_TOKEN_SECRET
    )

    return c.json(ok({ token, refreshToken }))
  })
