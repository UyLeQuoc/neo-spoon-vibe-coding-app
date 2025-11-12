import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'
import { parseSerializedSignature } from '@mysten/sui/cryptography'
import { verifyPersonalMessageSignature } from '@mysten/sui/verify'
import { APP_NAME, NONCE_TTL } from '@wal-0/shared'
import { Web3AuthMessage } from './Web3AuthMessage'

export async function genAuthMessageAndSaveNonce(kv: KVNamespace, id: string) {
  const key = `nonce:${id.toLowerCase()}`
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
  message: string,
  signature: string
): Promise<{ success: true } | { success: false; error: string }> {
  console.group('verifyAuthMessageAndDeleteNonce')
  console.log('» walletAddress:', walletAddress)
  console.log('» message:', message)
  console.log('» signature:', signature)
  try {
    const authMsg = Web3AuthMessage.fromString(message)
    console.log('» authMsg:', authMsg)
    const key = `nonce:${walletAddress.toLowerCase()}`
    const nonce = await kv.get(key)
    console.log('» stored nonce:', nonce)
    if (!nonce || nonce !== authMsg.nonce) {
      console.log('⚠️ Nonce not found or does not match')
      // Nonce is valid, delete it to prevent replay
      await kv.delete(key)
      return { success: false, error: 'Invalid nonce' }
    }

    // Verify signature
    const signatureScheme = parseSerializedSignature(signature)
    const useZkLogin = signatureScheme.signatureScheme === 'ZkLogin'
    const result = await verifyPersonalMessageSignature(
      new TextEncoder().encode(message),
      signature,
      {
        address: walletAddress,
        client: useZkLogin
          ? new SuiClient({ url: getFullnodeUrl('testnet') })
          : undefined
      }
    )
    console.log('» Verification result:', result)
    // Message is valid, delete nonce to prevent replay
    await kv.delete(key)
    return { success: true }
  } catch (e) {
    console.error('🚨 Error verifying message', e)
    return { success: false, error: 'Invalid message signature' }
  } finally {
    console.groupEnd()
  }
}
