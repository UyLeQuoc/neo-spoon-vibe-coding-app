// import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import { DEFAULT_MODEL } from 'shared'

/**
 * Cloudflare AI Gateway configuration
 * Using BYOK (Bring Your Own Keys) feature - API keys are stored securely in Cloudflare dashboard
 * @see https://developers.cloudflare.com/ai-gateway/configuration/byok/
 */
/**
 * Get AI model instance configured to use Cloudflare AI Gateway with BYOK
 *
 * With BYOK enabled:
 * - API keys are stored securely in the Cloudflare AI Gateway dashboard
 * - No need to pass provider API keys in requests
 * - Gateway automatically injects the correct API key
 *
 * Setup instructions:
 * 1. Go to Cloudflare Dashboard > AI > AI Gateway > vibe-coding-gateway
 * 2. Navigate to Provider Keys section
 * 3. Add your Anthropic and Google API keys
 * 4. Remove ANTHROPIC_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY from environment variables
 */
export function getModel({ model = DEFAULT_MODEL, env }: { model?: string; env: Cloudflare.Env }): LanguageModel {
  // const ANTHROPIC_BASE_URL = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/anthropic`
  const OPENROUTER_BASE_URL = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/openrouter`

  if (!model) {
    throw new Error(`Unsupported model`)
  }

  // switch (model.toLowerCase()) {
  //   case 'anthropic': {
  //     if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')

  //     const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: ANTHROPIC_BASE_URL })
  //     return anthropic(model)
  //   }
  //   case 'openrouter': {
  if (!env.OPEN_ROUTER_API_KEY) throw new Error('OPENROUTER_TOKEN is not set')

  const openrouter = createOpenRouter({
    apiKey: env.OPEN_ROUTER_API_KEY,
    baseURL: OPENROUTER_BASE_URL
  })
  return openrouter(model)
  // }
  // default:
  //   throw new Error(`Unsupported provider for model: ${model}`)
  // }
}
