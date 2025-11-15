import { persistentAtom } from '@nanostores/persistent'
import { computed } from 'nanostores'
import { decodeJwtToken } from 'shared'
import { hClient } from '~/lib/hono-client'
import { toJsonResult } from '../result'
import { ensureExclusive } from '../ensureExclusive'

class WalletAuthStore {
  /** Refresh token */
  refreshToken = persistentAtom<string>('authRefreshToken')

  /** Authenticated JWT token */
  jwtToken = persistentAtom<string>('authJwtToken')

  /** Authenticated JWT payload */
  jwtPayload = computed(this.jwtToken, t => (t ? decodeJwtToken(t) : null))

  /** Authenticated Wallet Address */
  authenticatedAddress = computed(this.jwtPayload, t => t?.sub ?? null)

  /** Is the user authenticated? */
  isAuthenticated = computed(this.authenticatedAddress, a => !!a)

  async getOrRefreshJwtToken(): Promise<string | null> {
    const token = this.jwtToken.get()
    if (!token) return null

    const decoded = decodeJwtToken(token)
    if (!decoded || !decoded.exp) return null

    // Check if token is expired (exp is in seconds)
    if (decoded.exp * 1000 > Date.now()) return token

    // Token is expired, refresh it
    const refreshToken = this.refreshToken.get()
    if (!refreshToken) {
      this.logout()
      return null
    }

    const result = await hClient.api.auth.refresh
      .$post({ json: { refreshToken, walletAddress: decoded.sub } })
      .then(toJsonResult)
    if (!result.ok) {
      console.error('Token refresh failed', result.error)
      // Refresh failed, logout
      this.logout()
      return null
    }

    // Refresh successful, update tokens
    this.jwtToken.set(result.data.token)
    this.refreshToken.set(result.data.refreshToken)
    return result.data.token
  }

  logout() {
    this.jwtToken.set('')
    this.refreshToken.set('')
  }

  async getSignInMessage(address: string) {
    const result = await hClient.api.auth.nonce
      .$post({ json: { walletAddress: address } })
      .then(toJsonResult)
    if (!result.ok) {
      console.error('Failed to get sign-in message', result.error)
      return null
    }
    return result.data.message
  }

  async login(
    walletAddress: string,
    message: string,
    signedMessage: {
      data: string
      messageHex?: string
      publicKey: string
      salt?: string
    }
  ): Promise<boolean> {
    try {
      const result = await hClient.api.auth.verify.$post({
        json: {
          walletAddress,
          signedMessage: {
            data: signedMessage.data,
            message: message, // Original message that was signed
            messageHex: signedMessage.messageHex,
            publicKey: signedMessage.publicKey,
            salt: signedMessage.salt
          }
        }
      }).then(toJsonResult)

      if (!result.ok) {
        console.error('Login failed', result.error)
        return false
      }

      this.jwtToken.set(result.data.token)
      this.refreshToken.set(result.data.refreshToken)
      return true
    } catch (error) {
      console.error('Login failed', error)
      return false
    }
  }
}

export const walletAuthStore = new WalletAuthStore()
