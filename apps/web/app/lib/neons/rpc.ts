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

async function invokeFunction(
  operation: string,
  args: Array<{ type: string; value: unknown }>
): Promise<RPCResponse> {
  const result = await hClient.api.neons['rpc-proxy']
    .$post({
      json: { operation, args }
    })
    .then(toJsonResult)
    .then(throwIfFailed)

  return result as unknown as RPCResponse
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

export async function getProperties(
  domain: string
): Promise<{ properties: DomainProperties | null; error?: string }> {
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
        const owner = '0x' + Array.from(ownerBytes)
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
        const balance = typeof firstItem.value === 'string' 
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

