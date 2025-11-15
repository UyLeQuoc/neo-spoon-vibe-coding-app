/**
 * NeoFS Client - REST API integration
 * NeoFS T5 Testnet: https://status.fs.neo.org
 * REST Gateway: https://rest.t5.fs.neo.org
 */

const NEOFS_CONTRACT_ADDRESS = 'NZAUkYbJ1Cb2HrNmwZ1pg9xYHBhm2FgtKV'
const NEOFS_REST_GATEWAY = 'https://rest.t5.fs.neo.org'
const NEOFS_RPC_URL = 'https://rpc.t5.n3.nspcc.ru:20331'

// TypeScript types based on NeoFS REST API OpenAPI spec

interface RPCResponse {
  jsonrpc: string
  id: number
  result?: {
    stack?: Array<{ type: string; value: string | number }>
    [key: string]: unknown
  }
  error?: { message: string; code: number }
}

interface ErrorResponse {
  code: number
  message: string
  type: 'GW' | 'API'
}

interface Balance {
  address: string
  precision: number
  value: string
}

interface ContainerInfo {
  attributes: Array<{ key: string; value: string }>
  basicAcl: string
  cannedAcl?: string
  containerId: string
  containerName: string
  ownerId: string
  placementPolicy: string
  version: string
}

interface ContainerList {
  containers: ContainerInfo[]
  size: number
}

interface ContainerPostInfo {
  attributes?: Array<{ key: string; value: string }>
  basicAcl?: string
  containerName?: string
  placementPolicy?: string
}

interface PostContainerOK {
  containerId: string
}

interface AddressForUpload {
  container_id: string
  object_id: string
}

interface ObjectBaseInfo {
  address: {
    containerId: string
    objectId: string
  }
  filePath?: string
  name?: string
}

interface ObjectBaseInfoV2 {
  objectId: string
  attributes: Record<string, unknown>
}

interface ObjectListV2 {
  objects: ObjectBaseInfoV2[]
  cursor: string
  incomplete?: boolean
}

interface SearchRequest {
  attributes: string[]
  filters: Array<{
    key: string
    match: string
    value: string
  }>
}

interface BearerToken {
  name?: string
  object?: Array<{
    action: 'ALLOW' | 'DENY'
    filters: Array<unknown>
    operation: 'GET' | 'HEAD' | 'PUT' | 'DELETE' | 'SEARCH' | 'RANGE' | 'RANGEHASH'
    targets: Array<{
      keys?: string[]
      role: 'USER' | 'SYSTEM' | 'OTHERS' | 'KEYS'
    }>
  }>
  container?: {
    containerId?: string
    verb: 'PUT' | 'DELETE' | 'SETEACL'
  }
}

interface TokenResponse {
  token: string
  type: 'object' | 'container'
  name?: string
}

interface NetworkInfo {
  auditFee: number
  containerFee: number
  epochDuration: number
  homomorphicHashingDisabled: boolean
  maxObjectSize: number
  namedContainerFee: number
  storagePrice: number
  withdrawalFee: number
}

/**
 * Helper function to handle API errors
 */
async function handleApiError(response: Response): Promise<never> {
  let errorMessage = `API request failed: ${response.statusText}`
  try {
    const errorData: ErrorResponse = await response.json()
    errorMessage = errorData.message || errorMessage
  } catch {
    // If response is not JSON, use status text
  }
  throw new Error(errorMessage)
}

/**
 * Make authenticated request to NeoFS REST API
 */
async function neofsRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  bearerToken?: string
): Promise<T> {
  const url = `${NEOFS_REST_GATEWAY}${endpoint}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (bearerToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${bearerToken}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (!response.ok) {
    await handleApiError(response)
  }

  // Handle empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T
  }

  return await response.json()
}

/**
 * Create bearer token for NeoFS operations
 * @param ownerId - Base58 encoded wallet address
 * @param tokens - Array of bearer token definitions
 * @param lifetime - Token lifetime in epochs (default: 100)
 * @param forAllUsers - Form token for all users or only this gate (default: false)
 */
export async function createBearerToken(
  ownerId: string,
  tokens: BearerToken[],
  lifetime: number = 100,
  forAllUsers: boolean = false
): Promise<TokenResponse[]> {
  const headers: HeadersInit = {
    'X-Bearer-Owner-Id': ownerId,
    'X-Bearer-Lifetime': lifetime.toString(),
    'X-Bearer-For-All-Users': forAllUsers.toString()
  }

  return neofsRequest<TokenResponse[]>('/v1/auth', {
    method: 'POST',
    headers,
    body: JSON.stringify(tokens)
  })
}

/**
 * Call NeoFS contract method via RPC
 */
async function invokeNeoFSContract(
  operation: string,
  args: Array<{ type: string; value: unknown }>
): Promise<RPCResponse> {
  const response = await fetch(NEOFS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'invokefunction',
      params: [NEOFS_CONTRACT_ADDRESS, operation, args],
      id: 1
    })
  })

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Get NeoFS balance for an address using REST API
 * @param address - Base58 encoded wallet address
 */
export async function getNeoFSBalance(address: string): Promise<number> {
  try {
    const balance = await neofsRequest<Balance>(`/v1/accounting/balance/${address}`)
    // Convert value string to number and apply precision
    const value = parseFloat(balance.value) / Math.pow(10, balance.precision)
    return value
  } catch (error) {
    console.error('Error getting NeoFS balance:', error)
    throw error
  }
}

/**
 * Get network information
 */
export async function getNetworkInfo(): Promise<NetworkInfo> {
  return neofsRequest<NetworkInfo>('/v1/network-info')
}

/**
 * List containers for an owner
 * @param ownerId - Base58 encoded owner address
 * @param offset - Number of containers to skip (default: 0)
 * @param limit - Number of containers to return (default: 100, max: 10000)
 */
export async function listContainers(
  ownerId: string,
  offset: number = 0,
  limit: number = 100
): Promise<ContainerList> {
  const params = new URLSearchParams({
    ownerId,
    offset: offset.toString(),
    limit: limit.toString()
  })
  return neofsRequest<ContainerList>(`/v1/containers?${params}`)
}

/**
 * Get container information by ID
 * @param containerId - Base58 encoded container ID
 */
export async function getContainer(containerId: string): Promise<ContainerInfo> {
  return neofsRequest<ContainerInfo>(`/v1/containers/${containerId}`)
}

/**
 * Create container via NeoFS REST API
 * Note: This requires signing with wallet. For now, we'll prepare the request structure.
 * In production, you'll need to sign the request using X-Bearer-Signature headers.
 * @param containerInfo - Container creation information
 * @param signature - Base64 encoded signature (optional, for authenticated requests)
 * @param signatureKey - Hex encoded public key (optional, for authenticated requests)
 * @param walletConnect - Use wallet connect signature scheme (default: false)
 * @param nameScopeGlobal - Register container name in NNS service (default: false)
 */
export async function createContainer(
  containerInfo: ContainerPostInfo,
  signature?: string,
  signatureKey?: string,
  walletConnect: boolean = false,
  nameScopeGlobal: boolean = false
): Promise<string> {
  const headers: HeadersInit = {}
  
  if (signature) {
    headers['X-Bearer-Signature'] = signature
  }
  if (signatureKey) {
    headers['X-Bearer-Signature-Key'] = signatureKey
  }

  const params = new URLSearchParams()
  if (walletConnect) {
    params.append('walletConnect', 'true')
  }
  if (nameScopeGlobal) {
    params.append('name-scope-global', 'true')
  }

  const queryString = params.toString()
  const endpoint = `/v1/containers${queryString ? `?${queryString}` : ''}`

  const result = await neofsRequest<PostContainerOK>(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(containerInfo)
  })

  return result.containerId
}

/**
 * Create container with default settings
 * This is a convenience function that uses common defaults
 * Note: This function currently doesn't implement signing - you'll need to add signature support
 */
export async function createContainerViaNeoLine(
  _neoline: any,
  _account: string,
  policy: string = 'REP 2',
  basicAcl: string = 'eacl-public-read-write',
  containerName?: string
): Promise<string> {
  try {
    // For now, we'll need to implement signing logic
    // This requires creating a bearer token and signing it
    // For simplicity, we'll use a basic container creation without signature
    // In production, you should implement proper signing
    
    const containerInfo: ContainerPostInfo = {
      placementPolicy: policy,
      basicAcl: basicAcl,
      containerName: containerName,
      attributes: [
        { key: 'Timestamp', value: Date.now().toString() },
        ...(containerName ? [{ key: 'Name', value: containerName }] : [])
      ]
    }

    // Note: Without proper signing, this will fail for authenticated endpoints
    // You'll need to implement bearer token creation and signing
    return await createContainer(containerInfo)
  } catch (error) {
    console.error('Error creating container:', error)
    throw error
  }
}

/**
 * Delete container by ID
 * Note: Requires authentication with signature
 */
export async function deleteContainer(
  containerId: string,
  signature?: string,
  signatureKey?: string,
  walletConnect: boolean = false
): Promise<void> {
  const headers: HeadersInit = {}
  
  if (signature) {
    headers['X-Bearer-Signature'] = signature
  }
  if (signatureKey) {
    headers['X-Bearer-Signature-Key'] = signatureKey
  }

  const params = new URLSearchParams()
  if (walletConnect) {
    params.append('walletConnect', 'true')
  }

  const queryString = params.toString()
  const endpoint = `/v1/containers/${containerId}${queryString ? `?${queryString}` : ''}`

  await neofsRequest(endpoint, {
    method: 'DELETE',
    headers
  })
}

/**
 * Upload file to NeoFS via REST API
 * @param file - File to upload
 * @param containerId - Base58 encoded container ID
 * @param fileName - Optional file name (defaults to file.name)
 * @param bearerToken - Optional bearer token for authenticated upload
 * @param attributes - Optional object attributes
 * @param expiration - Optional expiration settings
 */
export async function uploadFileToNeoFS(
  file: File,
  containerId: string,
  fileName?: string,
  bearerToken?: string,
  attributes?: Record<string, string>,
  expiration?: {
    rfc3339?: string
    timestamp?: string
    duration?: string
  }
): Promise<{ objectId: string; url: string }> {
  try {
    const url = `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}`
    const headers: HeadersInit = {
      'Content-Type': 'application/octet-stream'
    }

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`
    }

    // Add FileName attribute if provided
    const fileAttributes: Record<string, string> = {
      ...(fileName || file.name ? { FileName: fileName || file.name } : {}),
      ...attributes
    }

    if (Object.keys(fileAttributes).length > 0) {
      headers['X-Attributes'] = JSON.stringify(fileAttributes)
    }

    if (expiration?.rfc3339) {
      headers['X-Neofs-Expiration-RFC3339'] = expiration.rfc3339
    } else if (expiration?.timestamp) {
      headers['X-Neofs-Expiration-Timestamp'] = expiration.timestamp
    } else if (expiration?.duration) {
      headers['X-Neofs-Expiration-Duration'] = expiration.duration
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: file
    })

    if (!response.ok) {
      await handleApiError(response)
    }

    const result = await response.json() as AddressForUpload
    const objectId = result.object_id
    const fileUrl = `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}/by_id/${objectId}`

    return { objectId, url: fileUrl }
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

/**
 * Search objects in container using v2 search API
 * @param containerId - Base58 encoded container ID
 * @param searchRequest - Search filters and attributes to return
 * @param bearerToken - Optional bearer token for authenticated search
 * @param cursor - Cursor for pagination (default: empty string)
 * @param limit - Number of objects to return (default: 100, max: 1000)
 */
export async function searchObjects(
  containerId: string,
  searchRequest: SearchRequest,
  bearerToken?: string,
  cursor: string = '',
  limit: number = 100
): Promise<ObjectListV2> {
  const params = new URLSearchParams({
    cursor,
    limit: limit.toString()
  })

  return neofsRequest<ObjectListV2>(
    `/v2/objects/${containerId}/search?${params}`,
    {
      method: 'POST',
      body: JSON.stringify(searchRequest)
    },
    bearerToken
  )
}

/**
 * List files in container via NeoFS REST API
 * @param containerId - Base58 encoded container ID
 * @param bearerToken - Optional bearer token for authenticated requests
 */
export async function listFilesInContainer(
  containerId: string,
  bearerToken?: string
): Promise<Array<{
  id: string
  name: string
  size: number
  uploadedAt: string
  url: string
}>> {
  try {
    // Search for all objects (no filters)
    const searchRequest: SearchRequest = {
      attributes: ['FileName', 'Timestamp', 'Content-Type', 'Content-Length'],
      filters: []
    }

    const result = await searchObjects(containerId, searchRequest, bearerToken)
    
    return result.objects.map((obj) => {
      const attributes = obj.attributes as Record<string, string>
      const fileName = attributes.FileName || attributes['FileName'] || 'unnamed'
      const timestamp = attributes.Timestamp || attributes['Timestamp'] || Date.now().toString()
      const contentLength = attributes['Content-Length'] || attributes['Content-Length'] || '0'
      
      return {
        id: obj.objectId,
        name: fileName,
        size: parseInt(contentLength, 10) || 0,
        uploadedAt: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
        url: `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}/by_id/${obj.objectId}`
      }
    })
  } catch (error) {
    console.error('Error listing files:', error)
    throw error
  }
}

/**
 * Get file URL from NeoFS REST API
 */
export function getFileUrl(containerId: string, objectId: string): string {
  return `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}/by_id/${objectId}`
}

/**
 * Get object by container ID and object ID
 * @param containerId - Base58 encoded container ID
 * @param objectId - Base58 encoded object ID
 * @param bearerToken - Optional bearer token for authenticated requests
 * @param download - Set Content-Disposition header as attachment (default: false)
 */
export async function getObject(
  containerId: string,
  objectId: string,
  bearerToken?: string,
  download: boolean = false
): Promise<Blob> {
  const params = new URLSearchParams()
  if (download) {
    params.append('download', 'true')
  }

  const queryString = params.toString()
  const url = `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}/by_id/${objectId}${queryString ? `?${queryString}` : ''}`

  const headers: HeadersInit = {}
  if (bearerToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${bearerToken}`
  }

  const response = await fetch(url, { headers })
  
  if (!response.ok) {
    await handleApiError(response)
  }

  return await response.blob()
}

/**
 * Get object metadata (HEAD request)
 */
export async function getObjectHead(
  containerId: string,
  objectId: string,
  bearerToken?: string
): Promise<Headers> {
  const url = `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}/by_id/${objectId}`

  const headers: HeadersInit = {}
  if (bearerToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${bearerToken}`
  }

  const response = await fetch(url, {
    method: 'HEAD',
    headers
  })
  
  if (!response.ok) {
    await handleApiError(response)
  }

  return response.headers
}

/**
 * Delete object from NeoFS
 * Note: Requires authentication with signature
 * @param containerId - Base58 encoded container ID
 * @param objectId - Base58 encoded object ID
 * @param signature - Base64 encoded signature
 * @param signatureKey - Hex encoded public key
 * @param walletConnect - Use wallet connect signature scheme (default: false)
 */
export async function deleteFileFromNeoFS(
  containerId: string,
  objectId: string,
  signature?: string,
  signatureKey?: string,
  walletConnect: boolean = false
): Promise<void> {
  const headers: HeadersInit = {}
  
  if (signature) {
    headers['X-Bearer-Signature'] = signature
  }
  if (signatureKey) {
    headers['X-Bearer-Signature-Key'] = signatureKey
  }

  const params = new URLSearchParams()
  if (walletConnect) {
    params.append('walletConnect', 'true')
  }

  const queryString = params.toString()
  const endpoint = `/v1/objects/${containerId}/${objectId}${queryString ? `?${queryString}` : ''}`

  await neofsRequest(endpoint, {
    method: 'DELETE',
    headers
  })
}

/**
 * Deposit GAS to NeoFS contract
 */
export async function depositToNeoFS(
  neoline: any,
  account: string,
  amount: number
): Promise<string> {
  try {
    // Convert address to scriptHash
    const scriptHashResult = await neoline.AddressToScriptHash({ address: account })
    
    // Format contract address (remove 0x if present, lowercase for Hash160)
    let formattedContractHash = NEOFS_CONTRACT_ADDRESS
    if (formattedContractHash.startsWith('0x')) {
      formattedContractHash = formattedContractHash.slice(2)
    }
    formattedContractHash = formattedContractHash.toLowerCase()

    // Transfer GAS to NeoFS contract
    const result = await neoline.invoke({
      scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS Token
      operation: 'transfer',
      args: [
        {
          type: 'Hash160',
          value: scriptHashResult.scriptHash
        },
        {
          type: 'Hash160',
          value: formattedContractHash
        },
        {
          type: 'Integer',
          value: Math.floor(amount * 100000000).toString() // Convert to smallest unit (8 decimals)
        },
        {
          type: 'Array',
          value: []
        }
      ],
      signers: [
        {
          account: scriptHashResult.scriptHash,
          scopes: 1 // CalledByEntry
        }
      ],
      fee: '0.0001'
    })

    return result.txid
  } catch (error) {
    console.error('Error depositing to NeoFS:', error)
    throw error
  }
}

