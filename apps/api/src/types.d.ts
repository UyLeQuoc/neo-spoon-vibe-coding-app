declare namespace Cloudflare {
  interface Env {
    // ===============================================================
    // Configuration
    // ===============================================================
    IS_LOCAL: string
    // ===============================================================
    // Bindings
    // ===============================================================
    DB: D1Database
    KV: KVNamespace
    MAIN_RATE_LIMITER: RateLimit
    // ===============================================================
    // Secrets
    // ===============================================================
    JWT_SECRET: string
    CLOUDFLARE_ACCOUNT_ID: string
    AI_GATEWAY_NAME: string
    REFRESH_TOKEN_SECRET: string
    ANTHROPIC_API_KEY?: string
    OPENAI_API_KEY?: string
    GOOGLE_GENERATIVE_AI_API_KEY?: string
    MISTRAL_API_KEY?: string
    GROQ_API_KEY?: string
    OPEN_ROUTER_API_KEY?: string
    DEEPSEEK_API_KEY?: string
    TOGETHER_AI_API_KEY?: string
    OLLAMA_API_BASE_URL?: string
    LM_STUDIO_API_BASE_URL?: string
  }
}

declare module '*.md' {
  const value: string
  export default value
}
