import { hClient } from '~/lib/hono-client'
import { throwIfFailed, toJsonResult } from '~/lib/result'

interface RPCResponse<T = unknown> {
  jsonrpc: string
  id: number
  result?: {
    state: string
    exception?: string | null
    stack?: T[]
  }
  error?: { message: string; code: number }
}

async function invokeFunction(operation: string, args: Array<{ type: string; value: unknown }>): Promise<RPCResponse> {
  const result = await hClient.api.neons['rpc-proxy']
    .$post({
      json: { operation, args }
    })
    .then(toJsonResult)
    .then(throwIfFailed)

  return result as unknown as RPCResponse
}

async function traverseIterator(
  session: string,
  iteratorId: string,
  count: number = 100
): Promise<Array<{ type: string; value: string }>> {
  const result = await (hClient.api.neons as any)['traverse-iterator']
    .$post({
      json: { session, iteratorId, count }
    })
    .then(toJsonResult)
    .then(throwIfFailed)

  const data = result as unknown as {
    jsonrpc: string
    id: number
    result?: Array<{ type: string; value: string }>
    error?: { message: string; code: number }
  }

  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.result || []
}

export async function checkIsAvailable(name: string): Promise<{ available: boolean; error?: string }> {
  try {
    const data = await invokeFunction('isAvailable', [{ type: 'String', value: name }])

    if (data.error) {
      return { available: false, error: data.error.message }
    }

    if (data.result?.exception) {
      return { available: false, error: data.result.exception }
    }

    const stack = data.result?.stack
    if (stack && stack.length > 0) {
      const firstItem = stack[0] as { type: string; value: boolean | string | number | null }
      if (firstItem.type === 'Boolean' && typeof firstItem.value === 'boolean') {
        return { available: firstItem.value === true }
      }
    }

    return { available: false, error: 'Invalid response from RPC' }
  } catch (error) {
    console.error('Error checking domain availability:', error)
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to check domain availability'
    }
  }
}

export interface DomainProperties {
  name: string
  expiration: number | null
  admin: string | null
}

export async function getProperties(domain: string): Promise<{ properties: DomainProperties | null; error?: string }> {
  try {
    const data = await invokeFunction('properties', [{ type: 'String', value: domain }])

    if (data.error) {
      return { properties: null, error: data.error.message }
    }

    if (data.result?.exception) {
      return { properties: null, error: data.result.exception }
    }

    const stack = data.result?.stack
    if (stack && stack.length > 0) {
      const firstItem = stack[0] as { type: string; value?: unknown }
      if (firstItem.type === 'Map') {
        const mapValue = firstItem.value
        if (Array.isArray(mapValue)) {
          const properties: DomainProperties = {
            name: '',
            expiration: null,
            admin: null
          }

          for (const entry of mapValue) {
            const entryObj = entry as {
              key?: { type: string; value: string }
              value?: { type: string; value: string | number | null }
            }
            if (entryObj.key?.type === 'ByteString' && entryObj.value) {
              const key = atob(entryObj.key.value)

              if (key === 'name' && entryObj.value.type === 'ByteString') {
                properties.name = atob(entryObj.value.value as string)
              } else if (key === 'expiration' && entryObj.value.type === 'Integer') {
                properties.expiration = Number(entryObj.value.value)
              } else if (key === 'admin') {
                if (entryObj.value.type === 'ByteString') {
                  properties.admin = atob(entryObj.value.value as string)
                } else if (entryObj.value.value === null) {
                  properties.admin = null
                }
              }
            }
          }

          return { properties }
        }
      }
    }

    return { properties: null, error: 'Invalid response from RPC' }
  } catch (error) {
    console.error('Error getting domain properties:', error)
    return {
      properties: null,
      error: error instanceof Error ? error.message : 'Failed to get domain properties'
    }
  }
}

export async function getOwnerOf(domain: string): Promise<{ owner: string | null; error?: string }> {
  try {
    // Convert domain string to base64
    const domainBytes = new TextEncoder().encode(domain)
    const domainBase64 = btoa(
      Array.from(domainBytes)
        .map(byte => String.fromCharCode(byte))
        .join('')
    )

    const data = await invokeFunction('ownerOf', [{ type: 'ByteArray', value: domainBase64 }])

    if (data.error) {
      return { owner: null, error: data.error.message }
    }

    if (data.result?.exception) {
      return { owner: null, error: data.result.exception }
    }

    const stack = data.result?.stack
    if (stack && stack.length > 0) {
      const firstItem = stack[0] as { type: string; value: string }
      if (firstItem.type === 'ByteString' && typeof firstItem.value === 'string') {
        const ownerBytes = atob(firstItem.value)
        // Convert bytes to hex string
        const owner =
          '0x' +
          Array.from(ownerBytes)
            .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
        return { owner }
      }
    }

    return { owner: null, error: 'Invalid response from RPC' }
  } catch (error) {
    console.error('Error getting domain owner:', error)
    return {
      owner: null,
      error: error instanceof Error ? error.message : 'Failed to get domain owner'
    }
  }
}

export async function getBalanceOf(owner: string): Promise<{ balance: number; error?: string }> {
  try {
    // Note: owner should be Hash160 format
    // If it's an N3 address, it needs to be converted to Hash160 first
    // For now, we'll assume it's already in the correct format
    const data = await invokeFunction('balanceOf', [{ type: 'Hash160', value: owner }])

    if (data.error) {
      return { balance: 0, error: data.error.message }
    }

    if (data.result?.exception) {
      return { balance: 0, error: data.result.exception }
    }

    const stack = data.result?.stack
    if (stack && stack.length > 0) {
      const firstItem = stack[0] as { type: string; value: string | number }
      if (firstItem.type === 'Integer') {
        const balance =
          typeof firstItem.value === 'string'
            ? Number(firstItem.value)
            : typeof firstItem.value === 'number'
              ? firstItem.value
              : 0
        return { balance }
      }
    }

    return { balance: 0, error: 'Invalid response from RPC' }
  } catch (error) {
    console.error('Error getting domain balance:', error)
    return {
      balance: 0,
      error: error instanceof Error ? error.message : 'Failed to get domain balance'
    }
  }
}

export async function getTokensOf(owner: string): Promise<{ domains: string[]; error?: string }> {
  try {
    // Note: owner should be Hash160 format
    const data = await invokeFunction('tokensOf', [{ type: 'Hash160', value: owner }])

    if (data.error) {
      return { domains: [], error: data.error.message }
    }

    if (data.result?.exception) {
      return { domains: [], error: data.result.exception }
    }

    const stack = data.result?.stack
    const session = (data.result as { session?: string }).session

    if (!stack || stack.length === 0 || !session) {
      return { domains: [], error: 'Invalid response from RPC' }
    }

    const firstItem = stack[0] as {
      type: string
      id?: string
      interface?: string
    }

    if (firstItem.type === 'InteropInterface' && firstItem.id) {
      // Traverse iterator to get all domains
      const domains: string[] = []
      const iteratorId = firstItem.id
      let hasMore = true

      while (hasMore) {
        try {
          const items = await traverseIterator(session, iteratorId, 100)

          if (items.length === 0) {
            hasMore = false
            break
          }

          // Parse domain names from iterator items
          for (const item of items) {
            if (item.type === 'ByteString' && typeof item.value === 'string') {
              try {
                // Decode base64 to get domain name
                // Example: "MTIzNC5uZW8=" -> "1234.neo"
                const domainBytes = atob(item.value)
                // Convert binary string to UTF-8 string
                const domain = Array.from(domainBytes)
                  .map(char => char.charCodeAt(0))
                  .map(byte => String.fromCharCode(byte))
                  .join('')
                if (domain) {
                  domains.push(domain)
                }
              } catch (e) {
                console.warn('Failed to decode domain:', item.value, e)
              }
            }
          }

          // If we got less than requested, we've reached the end
          if (items.length < 100) {
            hasMore = false
          }
        } catch (error) {
          console.error('Error traversing iterator:', error)
          // If traversal fails, return what we have so far
          hasMore = false
        }
      }

      return { domains }
    }

    return { domains: [], error: 'Invalid response from RPC - expected InteropInterface' }
  } catch (error) {
    console.error('Error getting tokensOf:', error)
    return {
      domains: [],
      error: error instanceof Error ? error.message : 'Failed to get tokensOf'
    }
  }
}
