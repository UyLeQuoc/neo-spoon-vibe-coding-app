import { persistentAtom } from '@nanostores/persistent'
import { decodeJwtToken } from 'shared'
import { computed } from 'nanostores'
import { NeonSigner } from '@cityofzion/neon-dappkit'
import { wallet } from '@cityofzion/neon-js'
import { ensureExclusive } from '~/lib/ensureExclusive'
import { toJsonResult } from '~/lib/result'
import { hClient } from '~/lib/hono-client'

class WalletAuthStore {
  /** Refresh token */
  refreshToken = persistentAtom('authRefreshToken')
  /** Authenticated JWT token */
  jwtToken = persistentAtom('authJwtToken')
  /** Authenticated JWT payload */
  jwtPayload = computed(this.jwtToken, t => (t ? decodeJwtToken(t) : null))
  /** Authenticated Wallet Address */
  authenticatedAddress = computed(this.jwtPayload, t => t?.sub ?? null)
  /** Is the user authenticated? */
  isAuthenticated = computed(this.authenticatedAddress, a => !!a)

  @ensureExclusive('WalletAuthStore_getOrRefreshJwtToken')
  async getOrRefreshJwtToken(): Promise<string | null> {
    // In a real app, you would check the token expiry and refresh if needed.
    const token = this.jwtToken.get()
    if (!token) return null // No token available
    const decoded = decodeJwtToken(token)
    if (!decoded || !decoded.exp) return null // Invalid token
    if (decoded.exp * 1000 > Date.now()) return token

    // Token is expired, refresh it
    const refreshToken = this.refreshToken.get()
    if (!refreshToken) {
      // No refresh token, cannot refresh
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
    const result = await hClient.api.auth.nonce.$post({ json: { walletAddress: address } }).then(toJsonResult)
    if (!result.ok) {
      console.error('Failed to get sign-in message', result.error)
      return null
    }
    return result.data.message
  }
  async login(walletAddress: string, message: string) {
    try {
      const account = new wallet.Account(walletAddress)
      const signer = new NeonSigner(account)
      const signedMessage = await signer.signMessage({ message })
      const result = await hClient.api.auth.verify
        .$post({
          json: {
            walletAddress,
            // include original message for verification
            signedMessage: { ...signedMessage, message }
          }
        })
        .then(toJsonResult)

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
