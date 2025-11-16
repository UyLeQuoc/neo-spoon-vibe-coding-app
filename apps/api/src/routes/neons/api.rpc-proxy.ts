import { zValidator } from '@hono/zod-validator'
import { apiFailed, ok } from 'shared'
import z from 'zod'
import { factory } from '~/factory'

const NEO_NS_CONTRACT_HASH = '0xd4dbd72c8965b8f12c14d37ad57ddd91ee1d98cb'
const RPC_URL = 'http://seed2t5.neo.org:20332'

const rpcProxyInputSchema = z.object({
  operation: z.string().min(1, 'Operation is required'),
  args: z.array(z.any())
})

const traverseIteratorInputSchema = z.object({
  session: z.string().min(1, 'Session is required'),
  iteratorId: z.string().min(1, 'Iterator ID is required'),
  count: z.number().min(1).max(100).optional().default(100)
})

export const rpcProxyRoute = factory
  .createApp()
  .post('/neons/rpc-proxy', zValidator('json', rpcProxyInputSchema), async c => {
    const { operation, args } = c.req.valid('json')

    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'invokefunction',
          params: [NEO_NS_CONTRACT_HASH, operation, args],
          id: 1
        })
      })

      if (!response.ok) {
        return c.json(
          apiFailed({
            code: 'RPC_ERROR',
            message: `RPC request failed with status ${response.status}`
          }),
          { status: 500 }
        )
      }

      const data = await response.json()
      return c.json(ok(data))
    } catch (error) {
      console.error('Error proxying RPC request:', error)
      return c.json(
        apiFailed({
          code: 'RPC_ERROR',
          message: error instanceof Error ? error.message : 'Failed to proxy RPC request'
        }),
        500
      )
    }
  })
  .post('/neons/traverse-iterator', zValidator('json', traverseIteratorInputSchema), async c => {
    const { session, iteratorId, count } = c.req.valid('json')

    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'traverseiterator',
          params: [session, iteratorId, count],
          id: 1
        })
      })

      if (!response.ok) {
        return c.json(
          apiFailed({
            code: 'RPC_ERROR',
            message: `RPC request failed with status ${response.status}`
          }),
          { status: 500 }
        )
      }

      const data = await response.json()
      return c.json(ok(data))
    } catch (error) {
      console.error('Error traversing iterator:', error)
      return c.json(
        apiFailed({
          code: 'RPC_ERROR',
          message: error instanceof Error ? error.message : 'Failed to traverse iterator'
        }),
        500
      )
    }
  })
