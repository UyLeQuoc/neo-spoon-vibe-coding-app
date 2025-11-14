import type { ClientResponse } from 'hono/client'
import type { TApiResult } from 'shared'

export async function toJsonResult<T>(resp: ClientResponse<TApiResult<T>>) {
  return (await resp.json()) as TApiResult<T>
}

export function throwIfFailed<T>(result: TApiResult<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
