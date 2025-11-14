import { streamText as _streamText, convertToCoreMessages, type Message } from 'ai'
import { getModel } from '~/lib/.server/llm/model'
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '~/utils/modelConstants'
import { getPromptById } from '~/utils/prompts'
import { MAX_TOKENS } from './constants'

export type Messages = Omit<Message, 'id'>[]

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>

export async function streamText(
  messages: Messages,
  env: Env,
  options?: StreamingOptions,
  provider?: string,
  currentModel?: string,
  apiKey?: string,
  systemPromptId?: string
) {
  if (!provider) provider = DEFAULT_PROVIDER
  if (!currentModel) currentModel = DEFAULT_MODEL
  const model = getModel(provider, currentModel, env, apiKey)

  const systemPrompt = getPromptById(systemPromptId || 'system-default')

  return _streamText({
    model,
    system: systemPrompt,
    maxTokens: MAX_TOKENS,
    messages: convertToCoreMessages(messages),
    ...options
  })
}
