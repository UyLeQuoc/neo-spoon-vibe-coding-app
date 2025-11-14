import { NeonSigner } from '@cityofzion/neon-dappkit'
import { APP_NAME, failed, NONCE_TTL, ok, type TResult } from 'shared'
import { Web3AuthMessage } from './Web3AuthMessage'

type SignedMessage = Awaited<ReturnType<NeonSigner['signMessage']>>

export async function genAuthMessageAndSaveNonce(kv: KVNamespace, walletAddr: string) {
  const key = `auth_nonce:${walletAddr.toLowerCase()}`
  let nonce = await kv.get(key)
  if (!nonce) {
    nonce = crypto.randomUUID()
    await kv.put(key, nonce, { expirationTtl: NONCE_TTL }) // expire in 5 minutes
  }
  return new Web3AuthMessage(APP_NAME, nonce)
}

export async function verifyAuthMessageAndDeleteNonce(
  kv: KVNamespace,
  walletAddress: string,
  signedMessage: SignedMessage
): Promise<TResult> {
  console.group('verifyAuthMessageAndDeleteNonce')
  console.log('» walletAddress:', walletAddress)
  console.log('» signed message:', signedMessage)
  try {
    // Validate nonce in original message
    if (!signedMessage.message) return failed('Missing original message!')
    const authMsg = Web3AuthMessage.fromString(signedMessage.message)
    const key = `auth_nonce:${walletAddress.toLowerCase()}`
    const nonce = await kv.get(key)
    if (!nonce) return failed('Nonce not found')
    if (nonce !== authMsg.nonce) {
      console.log('⚠️ Nonce does not match')
      // Nonce is valid, delete it to prevent replay
      await kv.delete(key)
      return failed('Invalid nonce')
    }

    const signer = new NeonSigner()
    const isValid = await signer.verifyMessage(signedMessage)
    if (!isValid) return failed('Invalid signature')
    return ok()
  } catch (e) {
    console.error('🚨 Error verifying message', e)
    return failed('Error verifying message')
  } finally {
    console.groupEnd()
  }
}
