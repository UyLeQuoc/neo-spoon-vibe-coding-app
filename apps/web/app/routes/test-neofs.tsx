import type { MetaFunction } from '@remix-run/cloudflare'
import { useStore } from '@nanostores/react'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import type { NeoLineN3 } from '~/lib/neolineN3TS'
import {
  testNeoFSStore,
  setCurrentStep,
  setLoading,
  setStepResult,
  setStepError,
  clearStepError,
  setContainerName,
  setPlacementPolicy,
  setBasicAcl,
  setFile,
  setFileName,
  setContainerId,
  setObjectId
} from '~/lib/stores/test-neofs.store'

export const meta: MetaFunction = () => {
  return [{ title: 'NeoFS Test Page - Step by Step Flow' }]
}

// ============================================================================
// NeoFS Client Functions (merged from client.ts)
// ============================================================================

const NEOFS_REST_GATEWAY = 'https://rest.t5.fs.neo.org'

// NeoFS Testnet Contract Address
// Latest address can be found at: https://status.fs.neo.org/testnet
// Script hash: 0x3c3f4b84773ef0141576e48c3ff60e5078235891
// Address: NZAUkYbJ1Cb2HrNmwZ1pg9xYHBhm2FgtKV
const NEOFS_CONTRACT_SCRIPT_HASH = '0x3c3f4b84773ef0141576e48c3ff60e5078235891'

interface ErrorResponse {
  code: number
  message: string
  type: 'GW' | 'API'
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

async function handleApiError(response: Response): Promise<never> {
  let errorMessage = `API request failed: ${response.statusText}`
  let errorCode: number | undefined
  let errorType: string | undefined

  try {
    const errorData: ErrorResponse = await response.json()
    errorMessage = errorData.message || errorMessage
    errorCode = errorData.code
    errorType = errorData.type

    if (
      errorMessage.toLowerCase().includes('empty bearer token') ||
      (errorMessage.toLowerCase().includes('bearer token') && errorMessage.toLowerCase().includes('empty'))
    ) {
      errorMessage =
        'This operation requires authentication. Please connect your wallet and ensure you have signed the transaction with a bearer token.'
    } else if (errorMessage.includes('signature') || errorMessage.includes('key header')) {
      errorMessage =
        'This operation requires wallet authentication. Please ensure your wallet is connected and try again.'
    } else if (errorMessage.includes('balance') || errorMessage.includes('insufficient')) {
      errorMessage = 'Insufficient balance. Please deposit GAS to the NeoFS contract.'
    } else if (response.status === 403) {
      errorMessage =
        'Access denied. You may not have permission to perform this operation. This may require wallet authentication.'
    } else if (response.status === 404) {
      errorMessage = 'Resource not found. The container or object may not exist.'
    }
  } catch {
    if (response.status === 403) {
      errorMessage = 'Access denied. Authentication may be required. Please connect your wallet.'
    } else if (response.status === 404) {
      errorMessage = 'Resource not found.'
    }
  }

  const error = new Error(errorMessage) as Error & { code?: number; type?: string }
  if (errorCode !== undefined) {
    error.code = errorCode
  }
  if (errorType !== undefined) {
    error.type = errorType
  }
  throw error
}

async function neofsRequest<T>(endpoint: string, options: RequestInit = {}, bearerToken?: string): Promise<T> {
  const url = `${NEOFS_REST_GATEWAY}${endpoint}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (bearerToken) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${bearerToken}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (!response.ok) {
    await handleApiError(response)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T
  }

  return await response.json()
}

async function createBearerToken(
  ownerId: string,
  tokens: BearerToken[],
  lifetime: number = 100,
  forAllUsers: boolean = false
): Promise<TokenResponse[]> {
  const headers: HeadersInit = {
    'X-Bearer-Owner-Id': ownerId,
    'X-Bearer-Lifetime': lifetime.toString(),
    'X-Bearer-For-All-Users': forAllUsers.toString().toLowerCase()
  }

  return neofsRequest<TokenResponse[]>('/v1/auth', {
    method: 'POST',
    headers,
    body: JSON.stringify(tokens)
  })
}

async function createContainer(
  containerInfo: ContainerPostInfo,
  ownerId: string,
  signature: string,
  signatureKey: string,
  bearerToken: string,
  walletConnect: boolean = false,
  nameScopeGlobal: boolean = false
): Promise<string> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${bearerToken}`,
    'X-Bearer-Owner-Id': ownerId,
    'X-Bearer-Signature': signature,
    'X-Bearer-Signature-Key': signatureKey
  }

  console.log('⚡️ headers', headers)
  console.log('⚡️ bearerToken', bearerToken)
  console.log('⚡️ ownerId', ownerId)
  console.log('⚡️ signature', signature)
  console.log('⚡️ signatureKey', signatureKey)

  const params = new URLSearchParams()
  if (walletConnect) {
    params.append('walletConnect', 'true')
  } else {
    params.append('walletConnect', 'false')
  }
  if (nameScopeGlobal) {
    params.append('name-scope-global', 'true')
  } else {
    params.append('name-scope-global', 'false')
  }

  const queryString = params.toString()
  const endpoint = `/v1/containers${queryString ? `?${queryString}` : ''}`

  try {
    console.log('🪲 Making request to', endpoint, 'with headers', headers, 'and body', containerInfo)
    const result = await neofsRequest<PostContainerOK>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(containerInfo)
    })

    return result.containerId
  } catch (error: any) {
    if (
      error.message?.includes('signature') ||
      error.message?.includes('key header') ||
      error.message?.includes('session token') ||
      error.message?.includes('verb')
    ) {
      const originalError = error.message || 'Unknown error'
      throw new Error(
        `Container creation requires wallet authentication. Please connect your wallet and ensure you have signed the transaction with the correct container token (verb: PUT). Original error: ${originalError}`
      )
    }
    throw error
  }
}

async function uploadFileToNeoFS(
  file: File,
  containerId: string,
  fileName?: string,
  bearerToken?: string,
  signature?: string,
  signatureKey?: string,
  attributes?: Record<string, string>
): Promise<{ objectId: string; url: string }> {
  try {
    const url = `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}?walletConnect=true`
    const headers: HeadersInit = {
      'Content-Type': 'application/octet-stream'
    }

    if (signature && signatureKey) {
      const headerRecord = headers as Record<string, string>
      headerRecord['X-Bearer-Signature'] = signature
      headerRecord['X-Bearer-Signature-Key'] = signatureKey
    } else if (bearerToken) {
      const headerRecord = headers as Record<string, string>
      headerRecord['Authorization'] = bearerToken.startsWith('Bearer ') ? bearerToken : `Bearer ${bearerToken}`
    }

    const fileAttributes: Record<string, string> = {
      ...(fileName || file.name ? { FileName: fileName || file.name } : {}),
      ...attributes
    }

    if (Object.keys(fileAttributes).length > 0) {
      headers['X-Attributes'] = JSON.stringify(fileAttributes)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: file
    })

    if (!response.ok) {
      await handleApiError(response)
    }

    const result = (await response.json()) as AddressForUpload
    const objectId = result.object_id
    const fileUrl = `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}/by_id/${objectId}`

    return { objectId, url: fileUrl }
  } catch (error: any) {
    if (
      error.message?.includes('signature') ||
      error.message?.includes('key header') ||
      error.message?.includes('session token') ||
      error.message?.includes('verb')
    ) {
      throw new Error(
        'Upload requires authentication. Please ensure you have signed the transaction with the correct token type.'
      )
    } else if (error.message?.includes('403') || error.message?.includes('Access denied')) {
      throw new Error('Access denied. You may not have permission to upload to this container.')
    } else if (error.message?.includes('size') || error.message?.includes('too large')) {
      throw new Error('File is too large. Please check the maximum file size limit.')
    }

    throw error
  }
}

async function searchObjects(
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

async function listFilesInContainer(
  containerId: string,
  bearerToken?: string
): Promise<
  Array<{
    id: string
    name: string
    size: number
    uploadedAt: string
    url: string
  }>
> {
  try {
    const searchRequest: SearchRequest = {
      attributes: ['FileName', 'Timestamp', 'Content-Type', 'Content-Length'],
      filters: []
    }

    const result = await searchObjects(containerId, searchRequest, bearerToken)

    return result.objects.map(obj => {
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
  } catch (error: any) {
    if (
      error?.message?.toLowerCase().includes('empty bearer token') ||
      error?.message?.toLowerCase().includes('bearer token')
    ) {
      throw new Error(
        'This container requires authentication. Please use listFilesInContainerViaNeoLine() with your wallet connected.'
      )
    }
    throw error
  }
}

async function getObject(
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
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${bearerToken}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    await handleApiError(response)
  }

  return await response.blob()
}

async function getObjectHead(containerId: string, objectId: string, bearerToken?: string): Promise<Headers> {
  const url = `${NEOFS_REST_GATEWAY}/v1/objects/${containerId}/by_id/${objectId}`

  const headers: HeadersInit = {}
  if (bearerToken) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${bearerToken}`
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

function createObjectBearerTokenDefinition(
  containerId?: string,
  operations: Array<'GET' | 'HEAD' | 'PUT' | 'DELETE' | 'SEARCH' | 'RANGE' | 'RANGEHASH'> = [
    'GET',
    'HEAD',
    'PUT',
    'DELETE',
    'SEARCH'
  ],
  forOthers: boolean = true
): BearerToken {
  return {
    name: `object-operations-token-${Date.now()}`,
    object: operations.map(operation => ({
      action: 'ALLOW' as const,
      filters: containerId ? [{ key: 'ContainerID', match: 'STRING_EQUAL', value: containerId }] : [],
      operation,
      targets: [
        {
          role: 'USER' as const,
          keys: []
        },
        ...(forOthers
          ? [
              {
                role: 'OTHERS' as const,
                keys: []
              }
            ]
          : [])
      ]
    }))
  }
}

async function formBinaryBearerToken(
  _bearerToken: string,
  signature: string,
  signatureKey: string,
  walletConnect: boolean = false
): Promise<string> {
  const url = `${NEOFS_REST_GATEWAY}/v1/auth/bearer`

  const headers: HeadersInit = {
    'X-Bearer-Signature': signature,
    'X-Bearer-Signature-Key': signatureKey
  }

  const params = new URLSearchParams()
  if (walletConnect) {
    params.append('walletConnect', 'true')
  }

  const queryString = params.toString()
  const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    await handleApiError(response)
  }

  const result = (await response.json()) as { token: string }
  return result.token
}

async function createAndSignBearerToken(
  neoline: NeoLineN3,
  ownerId: string,
  tokens: BearerToken[],
  lifetime: number = 100,
  forAllUsers: boolean = false,
  tokenType?: 'object' | 'container'
): Promise<{ token: string; signature: string; signatureKey: string; type: string }> {
  if (!neoline || !ownerId) {
    throw new Error('NeoLine wallet and owner ID are required')
  }

  try {
    const tokenResponses = await createBearerToken(ownerId, tokens, lifetime, forAllUsers)

    let selectedToken: TokenResponse | undefined
    if (tokenType) {
      selectedToken = tokenResponses.find(t => t.type === tokenType)
    } else {
      selectedToken = tokenResponses[0]
    }

    if (!selectedToken) {
      throw new Error(`Failed to create ${tokenType || 'bearer'} token`)
    }

    const signResult = await neoline.signMessage({
      message: selectedToken.token,
      isJsonObject: false
    })

    if (!signResult || !signResult.data || !signResult.publicKey) {
      throw new Error('Failed to sign bearer token. Please ensure your wallet is connected.')
    }

    // Reference implementation concatenates data + salt for signature
    const signature = signResult.data + (signResult.salt || '')

    return {
      token: selectedToken.token,
      signature: signature,
      signatureKey: signResult.publicKey,
      type: selectedToken.type
    }
  } catch (error: any) {
    const errorMsg = error?.description || error?.message || 'Failed to create and sign bearer token'

    if (errorMsg.includes('cancel') || errorMsg.includes('Cancel')) {
      throw new Error('Token signing was cancelled. Please try again.')
    } else if (errorMsg.includes('signature') || errorMsg.includes('key')) {
      throw new Error('Failed to sign token. Please ensure your wallet is connected and try again.')
    }

    throw new Error(errorMsg)
  }
}

async function createAndSignContainerBearerToken(
  neoline: NeoLineN3,
  ownerId: string
): Promise<{ token: string; signature: string; signatureKey: string }> {
  const containerTokenDef: BearerToken = {
    container: {
      verb: 'PUT'
    }
  }

  const tokenResponses = await createBearerToken(ownerId, [containerTokenDef], 50000, false)
  console.log('⚡️ tokenResponses', tokenResponses)
  const containerToken = tokenResponses.find(t => t.type === 'container')

  if (!containerToken) {
    throw new Error('Failed to create container bearer token. No container token found in response.')
  }

  console.log('⚡️ containerToken.token', containerToken.token, ', signing...')
  const signResult = await neoline.signMessage({
    message: containerToken.token,
    isJsonObject: false
  })
  console.log('⚡️ signResult', signResult)

  if (!signResult || !signResult.data || !signResult.publicKey) {
    throw new Error('Failed to sign bearer token. Please ensure your wallet is connected.')
  }

  // Reference implementation concatenates data + salt for signature
  const signature = signResult.data + (signResult.salt || '')

  const result = {
    token: containerToken.token,
    signature: signature,
    signatureKey: signResult.publicKey
  }
  console.log('⚡️ result', result)
  return result
}

async function createAndSignObjectBearerToken(
  neoline: any,
  ownerId: string,
  containerId?: string,
  operations: Array<'GET' | 'HEAD' | 'PUT' | 'DELETE' | 'SEARCH' | 'RANGE' | 'RANGEHASH'> = [
    'GET',
    'HEAD',
    'PUT',
    'DELETE',
    'SEARCH'
  ],
  lifetime: number = 100
): Promise<{ token: string; signature: string; signatureKey: string }> {
  const objectTokenDef = createObjectBearerTokenDefinition(containerId, operations, true)
  const result = await createAndSignBearerToken(neoline, ownerId, [objectTokenDef], lifetime, false, 'object')

  return {
    token: result.token,
    signature: result.signature,
    signatureKey: result.signatureKey
  }
}

async function uploadFileToNeoFSViaNeoLine(
  neoline: any,
  account: string,
  file: File,
  containerId: string,
  fileName?: string,
  attributes?: Record<string, string>
): Promise<{ objectId: string; url: string }> {
  if (!neoline || !account) {
    throw new Error('NeoLine wallet and account are required')
  }

  try {
    // const { signature, signatureKey } = await createAndSignObjectBearerToken(
    //   neoline,
    //   account,
    //   containerId,
    //   ['PUT'],
    //   100
    // )

    const { token, signature, signatureKey } = await createAndSignContainerBearerToken(neoline, account)

    return await uploadFileToNeoFS(file, containerId, fileName, token, signature, signatureKey, attributes)
  } catch (error: any) {
    if (
      error.message?.includes('signature') ||
      error.message?.includes('key header') ||
      error.message?.includes('session token') ||
      error.message?.includes('verb')
    ) {
      throw new Error(
        'Failed to authenticate file upload. Please ensure you have signed the transaction with the correct token type (object token, not container token).'
      )
    } else if (error.message?.includes('cancel') || error.message?.includes('Cancel')) {
      throw new Error('File upload was cancelled. Please try again.')
    } else if (error.message?.includes('balance') || error.message?.includes('insufficient')) {
      throw new Error('Insufficient balance. Please deposit GAS to your NeoFS account first.')
    }

    throw error
  }
}

async function listFilesInContainerViaNeoLine(
  neoline: any,
  account: string,
  containerId: string
): Promise<
  Array<{
    id: string
    name: string
    size: number
    uploadedAt: string
    url: string
  }>
> {
  if (!neoline || !account) {
    throw new Error('NeoLine wallet and account are required')
  }

  try {
    const tokenDef = createObjectBearerTokenDefinition(containerId, ['SEARCH'], true)

    const { token, signature, signatureKey } = await createAndSignBearerToken(
      neoline,
      account,
      [tokenDef],
      100,
      false,
      'object'
    )

    const binaryToken = await formBinaryBearerToken(token, signature, signatureKey, false)

    return await listFilesInContainer(containerId, binaryToken)
  } catch (error: any) {
    if (error?.message?.includes('cancel') || error?.message?.includes('Cancel')) {
      throw new Error('Operation was cancelled. Please try again.')
    } else if (error?.message?.includes('signature') || error?.message?.includes('key')) {
      throw new Error('Failed to authenticate. Please ensure your wallet is connected and try again.')
    }

    throw error
  }
}

// ============================================================================
// React Component
// ============================================================================

type StepStatus = 'pending' | 'active' | 'completed' | 'error'

interface Step {
  id: string
  title: string
  description: string
  status: StepStatus
}

export default function TestNeoFSPage() {
  const { neoline, isInitialized, account, error, connect, disconnect } = useNeoLineN3()

  const {
    currentStep,
    loading,
    stepResults,
    stepErrors,
    containerName,
    placementPolicy,
    basicAcl,
    file,
    fileName,
    containerId,
    objectId
  } = useStore(testNeoFSStore)

  const steps: Step[] = [
    {
      id: 'auth',
      title: 'Step 1: Connect Wallet & Create Bearer Token',
      description: 'Connect your NeoLine wallet and create a bearer token for authentication',
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'container',
      title: 'Step 2: Create Container',
      description: 'Create a new container in NeoFS',
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      title: 'Step 3: Upload File',
      description: 'Upload a file to the container',
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending'
    },
    {
      id: 'read',
      title: 'Step 4: Read/List Files',
      description: 'List and read files from the container',
      status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending'
    }
  ]

  const handleStep1 = async () => {
    if (!neoline || !account) {
      await connect()
      return
    }

    setLoading(true)
    clearStepError(1)

    try {
      const { token, signature, signatureKey } = await createAndSignContainerBearerToken(neoline, account)

      setStepResult(1, {
        containerToken: token,
        containerSignature: signature,
        containerSignatureKey: signatureKey,
        message: 'Container token created and signed successfully'
      })
      setCurrentStep(2)
    } catch (err: any) {
      console.error('Error creating tokens:', err)
      setStepError(1, err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async () => {
    const step1Result = stepResults[1]
    if (!step1Result || !step1Result.containerSignature || !step1Result.containerSignatureKey) {
      setStepError(2, 'Please complete Step 1 first')
      return
    }

    setLoading(true)
    clearStepError(2)

    try {
      const containerInfo = {
        placementPolicy,
        basicAcl,
        containerName: containerName || undefined,
        attributes: []
      }

      if (!step1Result.containerToken || !step1Result.containerSignature || !step1Result.containerSignatureKey) {
        throw new Error('[Step 2] Missing required token or signature data from Step 1')
      }

      if (!account) {
        throw new Error('[Step 2] Account address is required')
      }

      const newContainerId = await createContainer(
        containerInfo,
        account,
        step1Result.containerSignature,
        step1Result.containerSignatureKey,
        step1Result.containerToken,
        true,
        false
      )

      setContainerId(newContainerId)
      setStepResult(2, { containerId: newContainerId, message: 'Container created successfully' })
      setCurrentStep(3)
    } catch (err: any) {
      setStepError(2, err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleStep3 = async () => {
    if (!neoline || !account || !file || !containerId) {
      setStepError(3, 'Please complete previous steps and select a file')
      return
    }

    setLoading(true)
    clearStepError(3)

    try {
      const result = await uploadFileToNeoFSViaNeoLine(neoline, account, file, containerId, fileName || undefined)

      setObjectId(result.objectId)
      setStepResult(3, { ...result, message: 'File uploaded successfully' })
      setCurrentStep(4)
    } catch (err: any) {
      setStepError(3, err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleStep4 = async () => {
    if (!neoline || !account || !containerId) {
      setStepError(4, 'Please complete previous steps')
      return
    }

    setLoading(true)
    clearStepError(4)

    try {
      const files = await listFilesInContainerViaNeoLine(neoline, account, containerId)

      let objectHead = null
      if (files.length > 0 && files[0]?.id) {
        try {
          const headers = await getObjectHead(containerId, files[0].id)
          const metadata: Record<string, string> = {}
          headers.forEach((value, key) => {
            metadata[key] = value
          })
          objectHead = metadata
        } catch {
          // Ignore if head fails
        }
      }

      setStepResult(4, {
        files,
        objectHead,
        message: `Found ${files.length} file(s)`
      })

      if (files.length > 0 && !objectId) {
        setObjectId(files[0].id)
      }
    } catch (err: any) {
      setStepError(4, err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!fileName) {
        setFileName(selectedFile.name)
      }
    }
  }

  const downloadFile = async () => {
    if (!containerId || !objectId) return

    try {
      const blob = await getObject(containerId, objectId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || `file-${objectId.slice(0, 8)}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(`Failed to download file: ${err?.message || String(err)}`)
    }
  }

  const handleDepositGAS = async () => {
    if (!neoline || !account) {
      alert('Please connect your wallet first')
      return
    }

    try {
      const contractHash = NEOFS_CONTRACT_SCRIPT_HASH
      const amountInSmallestUnit = 1_000_000_000_000 // 1 GAS (8 decimals)

      // Convert address to scriptHash for signers and args
      let signerAccount = account
      let fromScriptHash = account

      if (account.startsWith('N')) {
        // Convert address to scriptHash
        try {
          const scriptHashResult = await neoline.AddressToScriptHash({ address: account })
          const scriptHash = scriptHashResult.scriptHash
          signerAccount = scriptHash
          fromScriptHash = scriptHash
        } catch (error) {
          console.warn('Failed to convert address to scriptHash:', error)
          alert('Error: Failed to convert address to scriptHash')
          return
        }
      }

      // Format contract hash (ensure it's lowercase without 0x prefix for Hash160)
      let formattedContractHash = contractHash
      if (formattedContractHash.startsWith('0x')) {
        formattedContractHash = formattedContractHash.slice(2)
      }
      formattedContractHash = formattedContractHash.toLowerCase()

      // Transfer GAS to the NeoFS contract using invoke
      const result = await neoline.invoke({
        scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS Token
        operation: 'transfer',
        args: [
          {
            type: 'Hash160',
            value: fromScriptHash
          },
          {
            type: 'Hash160',
            value: formattedContractHash
          },
          {
            type: 'Integer',
            value: amountInSmallestUnit.toString()
          },
          {
            type: 'Array',
            value: []
          }
        ],
        signers: [
          {
            account: signerAccount,
            scopes: 1
          }
        ],
        fee: '0.0001'
      })

      alert(`GAS deposit transaction sent successfully!\nTransaction ID: ${result.txid}`)
    } catch (error: any) {
      const errorMsg = error?.description || error?.message || 'Failed to deposit GAS'
      if (errorMsg.includes('cancel') || errorMsg.includes('Cancel')) {
        alert('Deposit transaction was cancelled.')
      } else {
        alert(`Failed to deposit GAS: ${errorMsg}`)
      }
    }
  }

  const isDepositError = (errorMessage: string): boolean => {
    if (!errorMessage) return false
    const lowerError = errorMessage.toLowerCase()
    return (
      lowerError.includes('deposit') ||
      lowerError.includes('insufficient balance') ||
      (lowerError.includes('balance') && lowerError.includes('neofs'))
    )
  }

  return (
    <div className="max-w-[1000px] mx-auto p-5 font-sans">
      <div className="text-center mb-10">
        <h1 className="m-0 mb-2 text-gray-800">NeoFS Test - Step by Step Flow</h1>
        <p className="text-gray-600 m-0">Complete each step in order to test all NeoFS features with authentication</p>
      </div>

      <div className="mb-8 p-5 bg-gray-100 rounded-lg">
        <h2>Wallet Connection</h2>
        <div className="flex gap-2 items-center flex-wrap">
          {!account ? (
            <button
              onClick={connect}
              disabled={!isInitialized}
              className="px-6 py-3 border-none rounded bg-green-500 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Connect Wallet
            </button>
          ) : (
            <>
              <div className="px-5 py-2.5 bg-green-100 rounded text-sm">
                ✓ Connected: {account.slice(0, 8)}...{account.slice(-6)}
              </div>
              <button
                onClick={disconnect}
                className="px-6 py-3 border-none rounded bg-red-500 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
        {error && <div className="mt-4 p-4 rounded text-xs bg-red-50 border border-red-500">⚠️ {error}</div>}
      </div>

      <div className="flex flex-col gap-5">
        <div
          className={`border-2 rounded-lg p-5 bg-white transition-all duration-300 ${
            steps[0].status === 'active'
              ? 'border-green-500 shadow-[0_0_0_3px_rgba(76,175,80,0.1)]'
              : steps[0].status === 'completed'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                steps[0].status === 'pending' ? 'bg-gray-300 text-gray-500' : 'bg-green-500 text-white'
              }`}
            >
              1
            </div>
            <div className="flex-1">
              <h3 className="m-0 mb-1 text-gray-800">{steps[0].title}</h3>
              <p className="m-0 text-gray-600 text-sm">{steps[0].description}</p>
            </div>
          </div>
          {currentStep === 1 && (
            <div className="mt-5">
              {!account ? (
                <div className="p-4 bg-blue-50 border border-blue-300 rounded mb-5 text-sm text-blue-700">
                  Please connect your wallet first using the button above.
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-300 rounded mb-5 text-sm text-blue-700">
                    Wallet connected: {account}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleStep1}
                      disabled={loading || !neoline || !account}
                      className="px-6 py-3 border-none rounded bg-green-500 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating Token...' : 'Create Bearer Token'}
                    </button>
                  </div>
                  {stepErrors[1] && (
                    <div className="mt-5 p-4 rounded text-xs bg-red-50 border border-red-500">
                      ✗ Error: {stepErrors[1]}
                      {isDepositError(stepErrors[1]) && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <button
                            onClick={handleDepositGAS}
                            disabled={!neoline || !account}
                            className="px-4 py-2 border-none rounded bg-blue-500 text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Deposit GAS to NeoFS Contract
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {stepResults[1] && (
                    <div className="mt-5 p-4 rounded text-xs bg-green-50 border border-green-500">
                      ✓ {stepResults[1].message}
                      <pre className="m-0 p-2.5 bg-black/5 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                        Token: {stepResults[1].token?.slice(0, 50)}...
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div
          className={`border-2 rounded-lg p-5 bg-white transition-all duration-300 ${
            steps[1].status === 'active'
              ? 'border-green-500 shadow-[0_0_0_3px_rgba(76,175,80,0.1)]'
              : steps[1].status === 'completed'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                steps[1].status === 'pending' ? 'bg-gray-300 text-gray-500' : 'bg-green-500 text-white'
              }`}
            >
              2
            </div>
            <div className="flex-1">
              <h3 className="m-0 mb-1.25 text-gray-800">{steps[1].title}</h3>
              <p className="m-0 text-gray-600 text-sm">{steps[1].description}</p>
            </div>
          </div>
          {currentStep >= 2 && (
            <div className="mt-5">
              {currentStep === 2 ? (
                <>
                  <div className="flex flex-col gap-4 mb-5">
                    <label className="flex flex-col gap-1 text-sm text-gray-800">
                      Container Name:
                      <input
                        type="text"
                        value={containerName}
                        onChange={e => setContainerName(e.target.value)}
                        placeholder="My Container"
                        className="px-3 py-2.5 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1.25 text-sm text-gray-800">
                      Placement Policy:
                      <select
                        value={placementPolicy}
                        onChange={e => setPlacementPolicy(e.target.value)}
                        className="px-3 py-2.5 border border-gray-300 rounded text-sm"
                      >
                        <option value="REP 1">REP 1 (1 replica, default CBF 3)</option>
                        <option value="REP 2">REP 2 (2 replicas, default CBF 3)</option>
                        <option value="REP 3">REP 3 (3 replicas, default CBF 3)</option>
                        <option value="REP 2 CBF 4">REP 2 CBF 4 (2 replicas, CBF 4)</option>
                        <option value="REP 3 CBF 4">REP 3 CBF 4 (3 replicas, CBF 4)</option>
                        <option value="REP 2 SELECT 6 FROM *">REP 2 SELECT 6 FROM * (2 replicas, min 6 nodes)</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.25 text-sm text-gray-800">
                      Basic ACL:
                      <select
                        value={basicAcl}
                        onChange={e => setBasicAcl(e.target.value)}
                        className="px-3 py-2.5 border border-gray-300 rounded text-sm"
                      >
                        <option value="private">private</option>
                        <option value="public-read">public-read</option>
                        <option value="public-read-write">public-read-write</option>
                        <option value="eacl-public-read-write">eacl-public-read-write</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleStep2}
                      disabled={loading || !neoline || !account}
                      className="px-6 py-3 border-none rounded bg-green-500 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create Container'}
                    </button>
                  </div>
                  {stepErrors[2] && (
                    <div className="mt-5 p-4 rounded text-xs bg-red-50 border border-red-500">
                      ✗ Error: {stepErrors[2]}
                      {isDepositError(stepErrors[2]) && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <button
                            onClick={handleDepositGAS}
                            disabled={!neoline || !account}
                            className="px-4 py-2 border-none rounded bg-blue-500 text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Deposit GAS to NeoFS Contract
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-5 p-4 rounded text-xs bg-green-50 border border-green-500">
                  ✓ Container created: {containerId.slice(0, 12)}...{containerId.slice(-8)}
                </div>
              )}
              {stepResults[2] && (
                <div className="mt-5 p-4 rounded text-xs bg-green-50 border border-green-500">
                  ✓ {stepResults[2].message}
                  <pre className="m-0 p-2.5 bg-black/5 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                    Container ID: {stepResults[2].containerId}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`border-2 rounded-lg p-5 bg-white transition-all duration-300 ${
            steps[2].status === 'active'
              ? 'border-green-500 shadow-[0_0_0_3px_rgba(76,175,80,0.1)]'
              : steps[2].status === 'completed'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                steps[2].status === 'pending' ? 'bg-gray-300 text-gray-500' : 'bg-green-500 text-white'
              }`}
            >
              3
            </div>
            <div className="flex-1">
              <h3 className="m-0 mb-1.25 text-gray-800">{steps[2].title}</h3>
              <p className="m-0 text-gray-600 text-sm">{steps[2].description}</p>
            </div>
          </div>
          {currentStep >= 3 && (
            <div className="mt-5">
              {currentStep === 3 ? (
                <>
                  <div className="flex flex-col gap-4 mb-5">
                    <label className="flex flex-col gap-1 text-sm text-gray-800">
                      File:
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="px-3 py-2.5 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    {file && (
                      <label className="flex flex-col gap-1.25 text-sm text-gray-800">
                        File Name (optional):
                        <input
                          type="text"
                          value={fileName}
                          onChange={e => setFileName(e.target.value)}
                          placeholder={file.name}
                          className="px-3 py-2.5 border border-gray-300 rounded text-sm"
                        />
                      </label>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleStep3}
                      disabled={loading || !file || !containerId}
                      className="px-6 py-3 border-none rounded bg-green-500 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Uploading...' : 'Upload File'}
                    </button>
                  </div>
                  {stepErrors[3] && (
                    <div className="mt-5 p-4 rounded text-xs bg-red-50 border border-red-500">
                      ✗ Error: {stepErrors[3]}
                      {isDepositError(stepErrors[3]) && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <button
                            onClick={handleDepositGAS}
                            disabled={!neoline || !account}
                            className="px-4 py-2 border-none rounded bg-blue-500 text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Deposit GAS to NeoFS Contract
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-5 p-4 rounded text-xs bg-green-50 border border-green-500">
                  ✓ File uploaded: {fileName || 'unnamed'}
                </div>
              )}
              {stepResults[3] && (
                <div className="mt-5 p-4 rounded text-xs bg-green-50 border border-green-500">
                  ✓ {stepResults[3].message}
                  <pre className="m-0 p-2.5 bg-black/5 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                    Object ID: {stepResults[3].objectId}
                    URL: {stepResults[3].url}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`border-2 rounded-lg p-5 bg-white transition-all duration-300 ${
            steps[3].status === 'active'
              ? 'border-green-500 shadow-[0_0_0_3px_rgba(76,175,80,0.1)]'
              : steps[3].status === 'completed'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                steps[3].status === 'pending' ? 'bg-gray-300 text-gray-500' : 'bg-green-500 text-white'
              }`}
            >
              4
            </div>
            <div className="flex-1">
              <h3 className="m-0 mb-1.25 text-gray-800">{steps[3].title}</h3>
              <p className="m-0 text-gray-600 text-sm">{steps[3].description}</p>
            </div>
          </div>
          {currentStep >= 4 && (
            <div className="mt-5">
              {currentStep === 4 ? (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleStep4}
                      disabled={loading || !containerId}
                      className="px-6 py-3 border-none rounded bg-green-500 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Loading...' : 'List & Read Files'}
                    </button>
                  </div>
                  {stepErrors[4] && (
                    <div className="mt-5 p-4 rounded text-xs bg-red-50 border border-red-500">
                      ✗ Error: {stepErrors[4]}
                      {isDepositError(stepErrors[4]) && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <button
                            onClick={handleDepositGAS}
                            disabled={!neoline || !account}
                            className="px-4 py-2 border-none rounded bg-blue-500 text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            Deposit GAS to NeoFS Contract
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-5 p-4 rounded text-xs bg-green-50 border border-green-500">
                  ✓ Files listed successfully
                </div>
              )}
              {stepResults[4] && (
                <div className="mt-5 p-4 rounded text-xs bg-green-50 border border-green-500">
                  ✓ {stepResults[4].message}
                  {stepResults[4].files && stepResults[4].files.length > 0 && (
                    <div className="mt-4">
                      {stepResults[4].files.map((f: any, idx: number) => (
                        <div key={idx} className="p-2 bg-gray-100 rounded mb-2 flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{f.name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Size: {f.size} bytes | ID: {f.id.slice(0, 12)}...
                            </div>
                          </div>
                          {f.id === objectId && (
                            <button
                              onClick={downloadFile}
                              className="px-4 py-2 border-none rounded bg-blue-500 text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-blue-600"
                            >
                              Download
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {stepResults[4].objectHead && (
                    <div className="mt-4">
                      <strong>Object Metadata:</strong>
                      <pre className="m-0 p-2.5 bg-black/5 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs">
                        {JSON.stringify(stepResults[4].objectHead, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
