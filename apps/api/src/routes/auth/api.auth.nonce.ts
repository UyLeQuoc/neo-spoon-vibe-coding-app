import { zValidator } from '@hono/zod-validator'
import { ApiAuthNonceInput, type ApiAuthNonceOutput } from '@wal-0/shared'
import { ok } from 'node_modules/@wal-0/shared/src/result'
import { factory } from '~/factory'
import { genAuthMessageAndSaveNonce } from './_lib/auth-messages'

export const authNonceRoute = factory
  .createApp()
  .post('/auth/nonce', zValidator('json', ApiAuthNonceInput), async c => {
    const { walletAddress } = c.req.valid('json')
    const { KV } = c.env
    const msg = await genAuthMessageAndSaveNonce(KV, walletAddress)
    return c.json(ok<ApiAuthNonceOutput>({ message: msg.toString() }))
  })
