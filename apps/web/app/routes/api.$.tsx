import type { LoaderFunctionArgs } from '@remix-run/cloudflare'

declare global {
  interface Env {
    API: Service
  }
}

export const loader = async ({ request, context }: LoaderFunctionArgs) => context.cloudflare.env.API.fetch(request)
