declare namespace Cloudflare {
  interface Env {
    // ===============================================================
    // Configuration
    // ===============================================================
    IS_LOCAL: string
    // ===============================================================
    // Bindings
    // ===============================================================
    D1: D1Database
    // ===============================================================
    // Secrets
    // ===============================================================
    JWT_SECRET: string
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
