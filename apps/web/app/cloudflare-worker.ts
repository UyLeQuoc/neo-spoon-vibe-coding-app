interface Env {
  API: {
    fetch: (request: Request) => Promise<Response>
  }
}
interface WorkerEntrypoint {
  fetch: (request: Request, env: Env) => Promise<Response>
}

// Simple Cloudflare Worker that proxy the request to API service binding
export default { fetch: (request, env) => env.API.fetch(request) } satisfies WorkerEntrypoint
