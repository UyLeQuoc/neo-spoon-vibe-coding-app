import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import { createOllama } from 'ollama-ai-provider'
import { getAPIKey, getBaseURL } from '~/lib/.server/llm/api-key'

export function getAnthropicModel(apiKey: string, model: string): LanguageModel {
  const anthropic = createAnthropic({
    apiKey
  })

  return anthropic(model)
}

export function getOpenAIModel(apiKey: string, model: string): LanguageModel {
  const openai = createOpenAI({
    apiKey
  })

  return openai(model)
}

export function getGoogleModel(apiKey: string, model: string): LanguageModel {
  const google = createGoogleGenerativeAI({
    apiKey
  })

  return google(model)
}

export function getMistralModel(apiKey: string, model: string): LanguageModel {
  const mistral = createMistral({
    apiKey
  })

  return mistral(model)
}

export function getGroqModel(apiKey: string, model: string): LanguageModel {
  const groq = createGroq({
    apiKey
  })

  return groq(model)
}

export function getOpenRouterModel(apiKey: string, model: string): LanguageModel {
  const openRouter = createOpenRouter({
    apiKey
  })

  return openRouter.chat(model) as unknown as LanguageModel
}

export function getDeepseekModel(apiKey: string, model: string): LanguageModel {
  const deepseek = createOpenAI({
    baseURL: 'https://api.deepseek.com/beta',
    apiKey
  })

  return deepseek(model)
}

export function getTogetherAIModel(apiKey: string, model: string): LanguageModel {
  const togetherAI = createOpenAI({
    baseURL: 'https://api.together.xyz/v1',
    apiKey
  })

  return togetherAI(model)
}

export function getOllamaModel(baseURL: string, model: string): LanguageModel {
  const ollama = createOllama({
    baseURL
  })

  return ollama(model)
}

export function getLMStudioModel(baseURL: string, model: string): LanguageModel {
  const lmStudio = createOpenAI({
    baseURL: baseURL
  })

  return lmStudio(model)
}

export function getModel(provider: string, model: string, env: Env, apiKey?: string): LanguageModel {
  if (!apiKey) apiKey = getAPIKey(env, provider)
  const baseURL = getBaseURL(env, provider)

  switch (provider) {
    case 'Anthropic':
      return getAnthropicModel(apiKey, model)
    case 'OpenAI':
      return getOpenAIModel(apiKey, model)
    case 'Google':
      return getGoogleModel(apiKey, model)
    case 'Mistral':
      return getMistralModel(apiKey, model)
    case 'Groq':
      return getGroqModel(apiKey, model)
    case 'OpenRouter':
      return getOpenRouterModel(apiKey, model)
    case 'Deepseek':
      return getDeepseekModel(apiKey, model)
    case 'TogetherAI':
      return getTogetherAIModel(apiKey, model)
    case 'Ollama':
      return getOllamaModel(baseURL, model)
    case 'LMStudio':
      return getLMStudioModel(baseURL, model)
    default:
      return getOpenRouterModel(apiKey, model)
  }
}
