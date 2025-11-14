import z from 'zod/v3'

export const ApiAuthNonceInput = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required')
})
export type ApiAuthNonceInput = z.infer<typeof ApiAuthNonceInput>
export type ApiAuthNonceOutput = { message: string }

export const ApiAuthVerifyInput = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
  signedMessage: z.object({
    data: z.string().min(1, 'Signed message data is required'),
    message: z.string().describe('Original message that was signed'),
    messageHex: z.string().optional().describe('Original message in hex format'),
    publicKey: z.string().min(1, 'Public key is required'),
    salt: z.string().optional().describe('Optional salt used in signing')
  })
})
export type ApiAuthVerifyInput = z.infer<typeof ApiAuthVerifyInput>
export type ApiAuthVerifyOutput = { token: string; refreshToken: string }

export const ApiAuthRefreshInput = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
  refreshToken: z.string().min(1, 'Refresh token is required')
})
export type ApiAuthRefreshInput = z.infer<typeof ApiAuthRefreshInput>
export type ApiAuthRefreshOutput = {
  token: string
  refreshToken: string
}
