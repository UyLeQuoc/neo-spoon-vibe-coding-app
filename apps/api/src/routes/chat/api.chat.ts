import { experimental_createMCPClient } from '@ai-sdk/mcp'
import { zValidator } from '@hono/zod-validator'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage
} from 'ai'
import { apiFailed, DEFAULT_MODEL } from 'shared'
import z from 'zod'
import type { DataPart, Metadata } from '~/ai/messages'
import type { ToolSet } from '~/ai/messages/tool-set'
import { insertTransaction } from '~/db/mutations/transactions'
import { getOrCreateUser } from '~/db/mutations/users'
import { factory } from '~/factory'
import { calculatePoints } from '~/lib/calculatePoints'
import { getModel } from '~/lib/get-model'
import { authMiddware } from '~/middlewares/auth.middleware'
import { userBasedRateLimitMiddleware } from '~/middlewares/rate-limit.middleware'
import systemPrompt from './system.prompt.md'

type Message = UIMessage<Metadata, DataPart, ToolSet>

const bodySchema = z.object({
  messages: z.array(z.any().transform(a => a as Message)),
  modelId: z.string().optional(),
  userAddress: z.string().min(1, 'User address is required'),
  sessionId: z.string()
})

function processMessages(currentMessages: Message[]): Message[] {
  return currentMessages.map(message => ({
    ...message,
    parts: message.parts.map(part => {
      if (part.type === 'data-report-errors') {
        return {
          type: 'text',
          text:
            `There are errors in the generated code. This is the summary of the errors we have:\n` +
            `\`\`\`${part.data.summary}\`\`\`\n` +
            (part.data.paths?.length
              ? `The following files may contain errors:\n\`\`\`${part.data.paths?.join('\n')}\`\`\`\n`
              : '') +
            `Fix the errors reported.`
        }
      }
      return part
    })
  }))
}

type Usage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

// AI Response Handling Functions :: Main
export async function handleTokenUsage(
  db: D1Database,
  usage: Usage,
  userAddress: string,
  txNote: string = 'Chat Usage Cost'
): Promise<void> {
  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  const totalTokens = usage.totalTokens ?? 0
  const currentPointsUsage = calculatePoints({
    inputTokens: inputTokens,
    outputTokens: outputTokens
  })

  // Record transaction for token usage
  await insertTransaction(db, {
    note: `${txNote} - Input: ${(currentPointsUsage.inputPoints).toFixed(2)} Points(${inputTokens}Tokens), Output: ${(currentPointsUsage.outputPoints).toFixed(2)} Points(${outputTokens}Tokens), Total: ${(currentPointsUsage.totalPoints).toFixed(2)} Points(${totalTokens}Tokens)`,
    timestamp: Date.now(),
    amount: -currentPointsUsage.totalPoints.toFixed(4),
    address: userAddress
  })
}

export const chatRoute = factory
  .createApp()
  .post('/chat', authMiddware, userBasedRateLimitMiddleware, zValidator('json', bodySchema), async ctx => {
    const { sub: userAddr } = ctx.get('jwtPayload') ?? {}
    console.log('🔵 /api/chat called by user:', userAddr)
    // TODO: check user balance / rate limit

    const { messages, userAddress, sessionId, modelId } = ctx.req.valid('json')

    // Get the appropriate model based on modelId
    const model = getModel({ env: ctx.env, model: modelId })
    ctx.header('Content-Encoding', 'Identity') // Fix streaming issues with Hono x Wrangler

    // Credit guard: ensure (balance + bonus) < limitBalance
    // TODO: move this to a middleware
    {
      const {
        ok,
        error,
        data: user
      } = await getOrCreateUser(ctx.env.DB, {
        address: userAddress
      })
      if (!ok) return ctx.json(apiFailed({ code: 'USER_RETRIEVAL_FAILED', message: error }), 500)
      const balance = user.balance ?? 0
      if (balance < 0) {
        return ctx.json(
          apiFailed({
            code: 'INSUFFICIENT_CREDITS',
            message: 'You have reached your points limit. Please add more points to continue.'
          }),
          402
        )
      }
    }

    // Process all messages
    const allMessages = processMessages(messages)

    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        originalMessages: allMessages,
        execute: async ({ writer }) => {
          const sseClient = await experimental_createMCPClient({
            transport: { type: 'sse', url: 'http://localhost:8000/sse' }
          })
          const result = streamText({
            model: model,
            system: systemPrompt,
            messages: convertToModelMessages(allMessages),
            stopWhen: stepCountIs(20),
            tools: await sseClient.tools(),
            onAbort: () => console.log('♦️ AI message stream aborted'),
            onError: async ({ error }) => {
              console.error('🚨 Error communicating with AI')
              console.error(JSON.stringify(error, null, 2))
              sseClient.close() // Optional
            },
            // onChunk: chunk => {
            //   console.log(
            //     '[streamText] 🟡 AI message stream chunk type:',
            //     chunk.chunk.type
            //   )
            //   console.log(JSON.stringify(chunk, null, 2))
            // },
            onStepFinish: async step => {
              console.log('🟢 AI step finished, usage:', step.usage)
            },
            onFinish: async result => {
              sseClient.close()
              // console.log('✅ AI chat finished. Total usage:', result.usage)
              try {
                await handleTokenUsage(ctx.env.DB, result.usage as Usage, userAddress, 'Chat Usage Cost')
              } catch (err) {
                console.error('🚨 Failed to handle token usage:', err)
              }
            }
          })

          writer.merge(
            result.toUIMessageStream({
              sendReasoning: true,
              sendStart: false,
              messageMetadata: () => ({
                model: modelId ?? DEFAULT_MODEL,
                sessionId
              })
            })
          )
        },
        onFinish: async ({ messages }) => {
          console.log('🟢 onFinish messages:', messages)
        }
      })
    })
  })
