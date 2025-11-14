import { sign, verify } from 'hono/jwt'
import type { JWTPayload } from 'hono/utils/jwt/types'
import { APP_NAME, REFRESH_TOKEN_TTL } from 'shared'

interface RefreshTokenPayload extends JWTPayload {
  sub: string
  iss: string
  type: 'refresh'
}

/**
 * Generate a refresh token for an identity (e.g., wallet address)
 */
export async function generateAndSaveRefreshToken(kv: KVNamespace, id: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: RefreshTokenPayload = {
    sub: id,
    iss: APP_NAME,
    type: 'refresh',
    iat: now,
    exp: now + REFRESH_TOKEN_TTL
  }
  const token = await sign(payload, secret)
  const key = `refresh_token:${id.toLowerCase()}`
  await kv.put(key, token, { expirationTtl: REFRESH_TOKEN_TTL })
  return token
}

/**
 * Verify and rotate a refresh token
 */
export async function verifyAndRotateRefreshToken(
  kv: KVNamespace,
  id: string,
  refreshToken: string,
  secret: string
): Promise<string | null> {
  try {
    // First verify the JWT signature
    const payload = (await verify(refreshToken, secret)) as RefreshTokenPayload
    if (!payload || !payload.sub || payload.type !== 'refresh') return null
    // Ensure the token belongs to the expected user
    if (payload.sub !== id) return null
    // Check if token exists in KV
    const key = `refresh_token:${id.toLowerCase()}`
    const storedToken = await kv.get(key)
    if (storedToken !== refreshToken) return null
    // Verification successful, rotate the token
    return await generateAndSaveRefreshToken(kv, id, secret)
  } catch {
    return null
  }
}
