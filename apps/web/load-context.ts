import type { PlatformProxy } from 'wrangler'

type Cloudflare = Omit<PlatformProxy<Env>, 'dispose'>

declare module 'react-router' {
  interface AppLoadContext {
    cloudflare: Cloudflare
  }
}

export {}; // necessary for TS to treat this as a module
