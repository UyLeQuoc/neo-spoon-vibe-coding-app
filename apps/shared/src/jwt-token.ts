import { decode, sign } from 'hono/jwt'
import type { JWTPayload } from 'hono/utils/jwt/types'
import { JWT_TOKEN_TTL } from './constants'

export interface AppJwtPayload extends JWTPayload {
  /** The subject identifier of the token (Wallet Address) */
  sub: string
  /** The issuer of the token (Application Name) */
  iss: string
  /** The roles assigned to the user */
  roles: string[]
}

export async function generateJwtToken(payload: AppJwtPayload, secret: string): Promise<string> {
  payload.iat = Math.floor(Date.now() / 1000)
  payload.exp = Math.floor(Date.now() / 1000) + JWT_TOKEN_TTL
  return await sign(payload, secret)
}

export function decodeJwtToken(token: string): AppJwtPayload | null {
  try {
    const { payload } = decode(token)
    const payloadTyped: AppJwtPayload = {
      ...payload,
      sub: String(payload.sub || ''),
      iss: payload.iss || '',
      roles: Array.isArray(payload.roles)
        ? payload.roles.map(String)
        : typeof payload.roles === 'string'
          ? [payload.roles]
          : []
    }
    return payloadTyped
  } catch {
    return null
  }
}
