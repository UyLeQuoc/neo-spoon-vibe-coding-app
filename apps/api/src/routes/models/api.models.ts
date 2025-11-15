import { ok } from 'shared'
import { factory } from '~/factory'

export type Provider =
  | 'Anthropic'
  | 'OpenAI'
  | 'Google'
  | 'Mistral'
  | 'Groq'
  | 'OpenRouter'
  | 'Deepseek'
  | 'TogetherAI'
  | 'Ollama'
  | 'LMStudio'

export type ModelInfo = {
  name: string
  provider: Provider
  label: string
  inputPrice?: number
  outputPrice?: number
  maxOutputTokens?: number
  description?: string
  deprecated?: boolean
}

// Static models available in the backend
// These are hardcoded OpenRouter models (fetched from OpenRouter API and hardcoded)
// Only Anthropic Haiku 4.5 is enabled - all other models disabled
const STATIC_MODELS: ModelInfo[] = [
  {
    name: 'anthropic/claude-haiku-4.5',
    label: 'Anthropic: Claude Haiku 4.5',
    provider: 'OpenRouter',
    inputPrice: 0.000001, // $0.000001 per 1K tokens (prompt)
    outputPrice: 0.000005, // $0.000005 per 1K tokens (completion)
    description:
      "Claude Haiku 4.5 is Anthropic's fastest and most efficient model, delivering near-frontier intelligence at a fraction of the cost and latency of larger Claude models. Matching Claude Sonnet 4's performance across reasoning, coding, and computer-use tasks, Haiku 4.5 brings frontier-level capability to real-time and high-volume applications."
  }
  // All other models disabled - only keeping Anthropic Haiku 4.5
]

// GET /models - Get available models with optional search filter
export const modelsRoute = factory.createApp().get('/models', async c => {
  const search = c.req.query('search')?.toLowerCase() || ''

  // Filter models based on search query
  const filteredModels = STATIC_MODELS.filter(
    model =>
      model.name.toLowerCase().includes(search) ||
      model.provider.toLowerCase().includes(search) ||
      model.label.toLowerCase().includes(search) ||
      model.description?.toLowerCase().includes(search)
  )

  return c.json(ok<ModelInfo[]>(filteredModels))
})
