/**
 * NeoLine N3 dAPI TypeScript Types
 *
 * This module contains all TypeScript type definitions for the NeoLine N3 dAPI.
 * These types are based on the official NeoLine N3 Beta dAPI documentation.
 */

// ==================== Error Types ====================

/**
 * Error types that can be thrown by NeoLine N3 dAPI methods
 */
export type NeoLineErrorType =
  | 'NO_PROVIDER'
  | 'CONNECTION_DENIED'
  | 'CONNECTION_REFUSED'
  | 'RPC_ERROR'
  | 'MALFORMED_INPUT'
  | 'CANCELED'
  | 'INSUFFICIENT_FUNDS'
  | 'CHAIN_NOT_MATCH'
  | 'SCRIPT_ERROR'
  | 'FAIL'
  | 'UNKNOWN_ERROR'

/**
 * Error object structure returned by NeoLine N3 dAPI when an error occurs
 */
export interface NeoLineError {
  /** Type of error that occurred */
  type: NeoLineErrorType
  /** Human-readable description of the error */
  description: string
  /** Optional raw data associated with the error */
  data?: string
}

// ==================== Argument Types ====================

/**
 * Supported argument types for contract invocations
 */
export type ArgumentType =
  | 'String'
  | 'Boolean'
  | 'Hash160'
  | 'Hash256'
  | 'Integer'
  | 'ByteArray'
  | 'Array'
  | 'Address'
  | 'Any'

/**
 * Argument structure for contract invocations
 */
export interface Argument {
  /** Type of the argument */
  type: ArgumentType
  /** Value of the argument (can be string, number, boolean, null, array of arguments, or any) */
  value: string | number | boolean | null | Argument[] | any
}

// ==================== Signer Types ====================

/**
 * Signer scope values that define the effective range of a signature
 *
 * - 0: Only transactions are signed and no contracts are allowed to use this signature
 * - 1: CalledByEntry - Only applies to the chain call entry (recommended default)
 * - 16: CustomContracts - Signature can be used in specified contracts
 * - 32: CustomGroups - Signature can be used in specified contract groups
 * - 64: WitnessRules - Current context must satisfy specified rules
 * - 128: Global - Extremely high risk, use only when contract is extremely trusted
 */
export type SignerScope = 0 | 1 | 16 | 32 | 64 | 128

/**
 * Signer structure defining who signs the transaction and the scope of the signature
 */
export interface Signer {
  /** Script hash of the address (account) */
  account: string
  /** Effective range of the signature (scope) */
  scopes: SignerScope
  /** Contracts where signature can take effect (required if scopes includes CustomContracts) */
  allowedContracts?: string[]
  /** Pubkeys where signature can take effect (required if scopes includes CustomGroups) */
  allowedGroups?: string[]
  /** Custom rules for witness to adhere by (required if scopes is WitnessRules) */
  rules?: WitnessRule[]
}

// ==================== Witness Rule Types ====================

/**
 * Action type for witness rules
 */
export type WitnessRuleAction = 'Deny' | 'Allow'

export type WitnessConditionType =
  | 'Boolean'
  | 'And'
  | 'Not'
  | 'Or'
  | 'ScriptHash'
  | 'Group'
  | 'CalledByEntry'
  | 'CalledByContract'
  | 'CalledByGroup'

export interface WitnessCondition {
  type: WitnessConditionType
  expression?: boolean
  expressions?: WitnessCondition[]
  hash?: string
  group?: string
}

export interface WitnessRule {
  action: WitnessRuleAction
  condition: WitnessCondition
}

// ==================== Read Methods Types ====================

/**
 * Provider information returned by getProvider()
 */
export interface ProviderInfo {
  /** Name of the wallet provider */
  name: string
  /** Website of the wallet provider */
  website: string
  /** Version of the dAPI that the wallet supports */
  version: string
  /** List of all applicable NEPs which the wallet provider supports */
  compatibility: string[]
  /** Provider-specific attributes (e.g., app theme) */
  extra: Record<string, any>
}

/**
 * Balance request parameters
 */
export interface BalanceRequest {
  /** Address to check balance(s) */
  address: string
  /** List of contract hashes to query (empty array returns all balances) */
  contracts: string[]
}

/**
 * Balance response for a single asset
 */
export interface BalanceResponse {
  /** Contract hash of the asset */
  contract: string
  /** Symbol of the asset (e.g., "GAS", "NEO") */
  symbol: string
  /** Balance amount as a string (to preserve precision) */
  amount: string
}

/**
 * Balance response keyed by address
 */
export interface GetBalanceResponse {
  [address: string]: BalanceResponse[]
}

export interface GetStorageResponse {
  result: string
}

export interface InvokeReadResponse {
  script: string
  state: string
  gas_consumed: string
  stack: Argument[]
}

export interface InvokeReadMultiResponse extends Array<InvokeReadResponse> {}

export interface VerifyMessageParams {
  message: string
  data: string
  publicKey: string
}

export interface VerifyMessageResponse {
  result: boolean
}

export interface GetBlockResponse {
  hash: string
  size: number
  version: number
  previousblockhash: string
  merkleroot: string
  time: number
  index: number
  primary: number
  nextconsensus: string
  witnesses: Array<{
    invocation: string
    verification: string
  }>
  tx: string[]
  confirmations: number
  nextblockhash: string
}

export interface GetTransactionResponse {
  hash: string
  size: number
  sys_fee: string
  net_fee: string
  block_index: number
  block_time: number
  version: number
  transfers?: Array<{
    hash: string
    src: string
    contract: string
    from: string
    to: string
    amount: string
  }>
}

export interface GetApplicationLogResponse {
  blockhash: string
  executions: Array<{
    trigger: string
    vmstate: string
    gasconsumed: string
    stack: Argument[]
    notifications?: Array<{
      contract: string
      eventname: string
      state: {
        type: string
        value: Argument[]
      }
    }>
  }>
}

export interface PickAddressResponse {
  label: string
  address: string
}

export interface AddressToScriptHashParams {
  address: string
}

export interface AddressToScriptHashResponse {
  scriptHash: string
}

export interface ScriptHashToAddressParams {
  scriptHash: string
}

export interface ScriptHashToAddressResponse {
  address: string
}

// Write Methods
export interface SendParams {
  fromAddress: string
  toAddress: string
  asset: string
  amount: string
  fee?: string
  broadcastOverride?: boolean
}

export interface SendResponse {
  txid: string
  nodeURL?: string
  signedTx?: string
}

export interface InvokeParams {
  scriptHash: string
  operation: string
  args: Argument[]
  signers: Signer[]
  fee?: string
  extraSystemFee?: string
  overrideSystemFee?: string
  broadcastOverride?: boolean
}

export interface InvokeResponse {
  txid: string
  nodeURL?: string
  signedTx?: string
}

export interface InvokeArgument {
  scriptHash: string
  operation: string
  args: Argument[]
}

export interface InvokeMultipleParams {
  invokeArgs: InvokeArgument[]
  signers: Signer[]
  fee?: string
  extraSystemFee?: string
  overrideSystemFee?: string
  broadcastOverride?: boolean
}

export interface InvokeMultipleResponse {
  txid: string
  nodeURL?: string
  signedTx?: string
}

export interface SignMessageParams {
  message: string
  isJsonObject?: boolean
}

export interface SignMessageResponse {
  publicKey: string
  data: string
  salt: string
  message: string
}

export interface SignMessageWithoutSaltResponse {
  publicKey: string
  data: string
  message: string
}

export interface SignTransactionParams {
  transaction: TransactionLike
  magicNumber?: number
}

export interface TransactionLike {
  version: number
  nonce: number
  systemFee: number
  networkFee: number
  validUntilBlock: number
  attributes: any[]
  signers: Signer[]
  witnesses: any[]
  script: string
}

export interface SignTransactionResponse extends TransactionLike {}

export interface SwitchWalletNetworkParams {
  chainId: number
}

export interface SwitchWalletAccountResponse {
  address: string
  label?: string
  isLedger: boolean
}

// Common Methods
export interface GetNetworksResponse {
  chainId: number
  networks: string[]
  defaultNetwork: string
}

export interface GetAccountResponse {
  address: string
  label?: string
  isLedger: boolean
}

export interface GetPublicKeyResponse {
  address: string
  publicKey: string
}

// Events
export interface ReadyEventData {
  name: string
  website: string
  version: string
  compatibility: string[]
  extra: Record<string, any>
}

export interface AccountChangedEventData {
  address: string
  label: string
}

export interface ConnectedEventData {
  address: string
  label: string
}

export interface NetworkChangedEventData {
  networks: string[]
  chainId: number
  defaultNetwork: string
}

export interface BlockHeightChangedEventData {
  chainId: number
  blockHeight: number
  blockTime: number
  blockHash: string
  tx: string[]
}

export interface TransactionConfirmedEventData {
  chainId: number
  txid: string
  blockHeight: number
  blockTime: number
}

/**
 * NeoLine N3 dAPI SDK Interface
 *
 * This interface provides all methods available in the NeoLine N3 dAPI.
 * The NeoLine browser extension injects the SDK directly into window.NEOLineN3.
 */
export interface NeoLineN3 {
  // ==================== Read Methods ====================

  /**
   * Returns information about the dAPI provider, including who this provider is,
   * the version of their dAPI, and the NEP that the interface is compatible with.
   *
   * @returns Promise resolving to provider information
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_DENIED - User rejected the connection request
   */
  getProvider(): Promise<ProviderInfo>

  /**
   * Returns balance of a specific asset for the given account.
   * If the asset is omitted from a request to MainNet, all asset and token balances will be returned.
   *
   * @param params - Optional list of balance request objects specifying addresses and contracts to query
   * @returns Promise resolving to balance response object keyed by address
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_DENIED - User rejected the connection request
   */
  getBalance(params?: BalanceRequest[]): Promise<GetBalanceResponse>

  /**
   * Reads the raw value in smart contract storage.
   *
   * @param params - Object containing scriptHash and key
   * @param params.scriptHash - Script hash of the smart contract
   * @param params.key - Key of the storage value to retrieve
   * @returns Promise resolving to storage result
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_REFUSED - dApp not connected
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   */
  getStorage(params: { scriptHash: string; key: string }): Promise<GetStorageResponse>

  /**
   * Executes a contract invocation in read-only mode.
   * The wallet will return the direct response from the RPC node.
   *
   * @param params - Invocation parameters
   * @param params.scriptHash - Script hash of the smart contract to invoke
   * @param params.operation - Operation on the smart contract to call
   * @param params.args - Input arguments for the operation
   * @param params.signers - Sender and effective scope of signature
   * @returns Promise resolving to invocation result with script, state, gas_consumed, and stack
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_REFUSED - dApp not connected
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   */
  invokeRead(params: {
    scriptHash: string
    operation: string
    args: Argument[]
    signers: Signer[]
  }): Promise<InvokeReadResponse>

  /**
   * Executes multiple contract invocations in read-only mode within the same transaction.
   * Similar to invokeRead but accepts multiple invoke arguments.
   *
   * @param params - Multi-invocation parameters
   * @param params.invokeReadArgs - Array of invoke arguments
   * @param params.signers - Sender and effective scope of signature
   * @returns Promise resolving to array of invocation results
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_REFUSED - dApp not connected
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   */
  invokeReadMulti(params: {
    invokeReadArgs: Array<{
      scriptHash: string
      operation: string
      args: Argument[]
    }>
    signers: Signer[]
  }): Promise<InvokeReadMultiResponse>

  /**
   * Returns whether the provided signature data matches the provided message
   * and was signed by the account of the provided public key.
   * A randomized salt prefix is added to the input string before it is signed,
   * and the specific string 010001f0 0000 is added to the hexString before signed.
   *
   * @param params - Verification parameters
   * @param params.message - Salt prefix + original message
   * @param params.data - Signed message
   * @param params.publicKey - Public key of account that signed message
   * @returns Promise resolving to verification result (boolean)
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_DENIED - User rejected the request
   */
  verifyMessage(params: VerifyMessageParams): Promise<VerifyMessageResponse>

  /**
   * Returns whether the provided signature data matches the provided message
   * and was signed by the account of the provided public key.
   * A randomized salt prefix is added to the input string before it is signed,
   * and it is encased in a non-executable transaction before signed.
   * This ensures compatibility with Ledger devices.
   *
   * @param params - Verification parameters
   * @param params.message - Salt prefix + original message
   * @param params.data - Signed message
   * @param params.publicKey - Public key of account that signed message
   * @returns Promise resolving to verification result (boolean)
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_DENIED - User rejected the request
   */
  verifyMessageV2(params: VerifyMessageParams): Promise<VerifyMessageResponse>

  /**
   * Gets information about a specific block.
   * The wallet will return the direct response from the RPC node.
   *
   * @param params - Block query parameters
   * @param params.blockHeight - The height of the block to get information about
   * @returns Promise resolving to block information
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   */
  getBlock(params: { blockHeight: number }): Promise<GetBlockResponse>

  /**
   * Gets information about a specific transaction.
   * The wallet will return the direct response from the RPC node.
   *
   * @param params - Transaction query parameters
   * @param params.txid - The id of the transaction to get information about
   * @returns Promise resolving to transaction details
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   */
  getTransaction(params: { txid: string }): Promise<GetTransactionResponse>

  /**
   * Gets the application log for a given transaction.
   * The wallet will return the direct response from the RPC node.
   *
   * @param params - Application log query parameters
   * @param params.txid - The id of the transaction to get application logs for
   * @returns Promise resolving to application log with executions and notifications
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   */
  getApplicationLog(params: { txid: string }): Promise<GetApplicationLogResponse>

  /**
   * Returns the NEO N3 account selected by the user.
   * Opens a dialog for the user to select an account.
   *
   * @returns Promise resolving to selected account with label and address
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CANCELED - User cancelled or refused the request
   */
  pickAddress(): Promise<PickAddressResponse>

  /**
   * Converts an N3 account address to script hash.
   *
   * @param params - Address conversion parameters
   * @param params.address - N3 account address
   * @returns Promise resolving to script hash
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} MALFORMED_INPUT - Invalid address format
   */
  AddressToScriptHash(params: AddressToScriptHashParams): Promise<AddressToScriptHashResponse>

  /**
   * Converts a script hash to N3 account address.
   *
   * @param params - Script hash conversion parameters
   * @param params.scriptHash - Script hash of the N3 account
   * @returns Promise resolving to N3 account address
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} MALFORMED_INPUT - Invalid script hash format
   */
  ScriptHashToAddress(params: ScriptHashToAddressParams): Promise<ScriptHashToAddressResponse>

  // ==================== Write Methods ====================

  /**
   * Invokes a transfer of a specified amount of a given asset from the connected account to another account.
   *
   * @param params - Send parameters
   * @param params.fromAddress - Address of the connected account to send assets from
   * @param params.toAddress - Address of the receiver
   * @param params.asset - Asset script hash or symbol (symbol only for MainNet)
   * @param params.amount - The parsed amount of the asset to be sent (as string)
   * @param params.fee - Optional parsed amount of network fee (in GAS)
   * @param params.broadcastOverride - If true, returns signed transaction instead of broadcasting
   * @returns Promise resolving to transaction ID and node URL (or signedTx if broadcastOverride is true)
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   * @throws {NeoLineError} MALFORMED_INPUT - Invalid receiver address
   * @throws {NeoLineError} CANCELED - User cancelled the transaction
   * @throws {NeoLineError} INSUFFICIENT_FUNDS - Insufficient balance
   */
  send(params: SendParams): Promise<SendResponse>

  /**
   * Invokes a generic execution of smart contracts on behalf of the user.
   * Recommended to have a general understanding of the NEO blockchain before using.
   *
   * @param params - Invoke parameters
   * @param params.scriptHash - Script hash of the smart contract to invoke
   * @param params.operation - Operation on the smart contract to call
   * @param params.args - Input arguments for the operation
   * @param params.signers - Sender and effective scope of signature
   * @param params.fee - Optional parsed amount of network fee (in GAS)
   * @param params.extraSystemFee - Optional fee added to system fee
   * @param params.overrideSystemFee - Optional fee that overrides the system fee
   * @param params.broadcastOverride - If true, returns signed transaction instead of broadcasting
   * @returns Promise resolving to transaction ID and node URL (or signedTx if broadcastOverride is true)
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   * @throws {NeoLineError} CANCELED - User cancelled the transaction
   */
  invoke(params: InvokeParams): Promise<InvokeResponse>

  /**
   * Invokes multiple contract functions in the same transaction.
   * Same as invoke, but accepts inputs to execute multiple invokes in one transaction.
   *
   * @param params - Multiple invoke parameters
   * @param params.invokeArgs - Array of contract invoke inputs
   * @param params.signers - Sender and effective scope of signature
   * @param params.fee - Optional parsed amount of network fee (in GAS)
   * @param params.extraSystemFee - Optional fee added to system fee
   * @param params.overrideSystemFee - Optional fee that overrides the system fee
   * @param params.broadcastOverride - If true, returns signed transaction instead of broadcasting
   * @returns Promise resolving to transaction ID and node URL (or signedTx if broadcastOverride is true)
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} RPC_ERROR - RPC connection error
   * @throws {NeoLineError} CANCELED - User cancelled the transaction
   */
  invokeMultiple(params: InvokeMultipleParams): Promise<InvokeMultipleResponse>

  /**
   * Signs a provided message with an account selected by user.
   * A randomized salt prefix is added to the input string before it is signed,
   * and the specific string 010001f0 0000 is added to the hexString before signed.
   *
   * @param params - Sign message parameters
   * @param params.message - The message to sign
   * @param params.isJsonObject - Optional flag indicating if message is a JSON object
   * @returns Promise resolving to signed message with publicKey, data, salt, and message
   * @throws {NeoLineError} UNKNOWN_ERROR - Unknown error occurred
   */
  signMessage(params: SignMessageParams): Promise<SignMessageResponse>

  /**
   * Signs a provided message with an account selected by user.
   * A randomized salt prefix is added to the input string before it is signed,
   * and it is encased in a non-executable transaction before signed.
   * This ensures compatibility with Ledger devices.
   *
   * @param params - Sign message parameters
   * @param params.message - The message to sign
   * @param params.isJsonObject - Optional flag indicating if message is a JSON object
   * @returns Promise resolving to signed message with publicKey, data, salt, and message
   * @throws {NeoLineError} UNKNOWN_ERROR - Unknown error occurred
   */
  signMessageV2(params: SignMessageParams): Promise<SignMessageResponse>

  /**
   * Signs a provided message with an account selected by user.
   * The specific string 010001f0 0000 is added to the hexString before signed.
   * No salt prefix is added.
   *
   * @param params - Sign message parameters
   * @param params.message - The message to sign
   * @param params.isJsonObject - Optional flag indicating if message is a JSON object
   * @returns Promise resolving to signed message with publicKey, data, and message (no salt)
   * @throws {NeoLineError} UNKNOWN_ERROR - Unknown error occurred
   */
  signMessageWithoutSalt(params: SignMessageParams): Promise<SignMessageWithoutSaltResponse>

  /**
   * Signs a provided message with an account selected by user.
   * It is encased in a non-executable transaction before signed.
   * This ensures compatibility with Ledger devices.
   * No salt prefix is added.
   *
   * @param params - Sign message parameters
   * @param params.message - The message to sign
   * @param params.isJsonObject - Optional flag indicating if message is a JSON object
   * @returns Promise resolving to signed message with publicKey, data, and message (no salt)
   * @throws {NeoLineError} UNKNOWN_ERROR - Unknown error occurred
   */
  signMessageWithoutSaltV2(params: SignMessageParams): Promise<SignMessageWithoutSaltResponse>

  /**
   * Signs the provided transaction with the account selected by the user.
   *
   * @param params - Sign transaction parameters
   * @param params.transaction - The transaction to sign
   * @param params.magicNumber - Optional magic number of network found in protocol.json
   * @returns Promise resolving to signed transaction
   * @throws {NeoLineError} UNKNOWN_ERROR - Unknown error occurred
   */
  signTransaction(params: SignTransactionParams): Promise<SignTransactionResponse>

  /**
   * Allows NeoLine applications ('dapps') to request that the wallet switches its active Neo network.
   *
   * Chain IDs:
   * - 1: Neo2 MainNet
   * - 2: Neo2 TestNet
   * - 3: N3 MainNet
   * - 6: N3 TestNet
   * - 0: N3 Private Network
   *
   * @param params - Network switch parameters
   * @param params.chainId - Chain ID of the network to switch to
   * @returns Promise resolving to null on success
   * @throws {NeoLineError} UNKNOWN_ERROR - Unknown error occurred
   */
  switchWalletNetwork(params: SwitchWalletNetworkParams): Promise<null>

  /**
   * Allows NeoLine applications ('dapps') to request that the wallet switches its active account.
   * Opens a dialog for the user to select a different account.
   *
   * @returns Promise resolving to selected account information
   * @throws {NeoLineError} UNKNOWN_ERROR - Unknown error occurred
   */
  switchWalletAccount(): Promise<SwitchWalletAccountResponse>

  // ==================== Common Methods ====================

  /**
   * Returns the networks the wallet provider has available to connect to,
   * along with the default network the wallet is currently set to.
   *
   * @returns Promise resolving to network information
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_DENIED - User rejected the request
   * @throws {NeoLineError} CHAIN_NOT_MATCH - Currently opened chain does not match
   */
  getNetworks(): Promise<GetNetworksResponse>

  /**
   * Returns the Account that is currently connected to the dApp.
   *
   * @returns Promise resolving to account information
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_DENIED - User rejected the request
   * @throws {NeoLineError} CHAIN_NOT_MATCH - Currently opened chain does not match
   */
  getAccount(): Promise<GetAccountResponse>

  /**
   * Returns the public key of the Account that is currently connected to the dApp.
   *
   * @returns Promise resolving to public key information
   * @throws {NeoLineError} NO_PROVIDER - No provider available
   * @throws {NeoLineError} CONNECTION_DENIED - User rejected the request
   */
  getPublicKey(): Promise<GetPublicKeyResponse>

  // ==================== Event Methods ====================

  /**
   * Adds a callback method to be triggered on a specified event.
   *
   * Available events:
   * - NEOLine.N3.EVENT.READY - SDK ready
   * - NEOLine.N3.EVENT.ACCOUNT_CHANGED - Account changed
   * - NEOLine.N3.EVENT.CONNECTED - Wallet connected
   * - NEOLine.N3.EVENT.DISCONNECTED - Wallet disconnected
   * - NEOLine.N3.EVENT.NETWORK_CHANGED - Network changed
   * - NEOLine.N3.EVENT.BLOCK_HEIGHT_CHANGED - New block mined
   * - NEOLine.N3.EVENT.TRANSACTION_CONFIRMED - Transaction confirmed
   *
   * @param event - Event name to listen for
   * @param callback - Callback function to execute when event fires
   */
  addEventListener(event: string, callback: (data: any) => void): void

  /**
   * Removes an existing callback event listener.
   *
   * @param event - Event name to remove listener from
   * @param callback - Callback function to remove
   */
  removeEventListener(event: string, callback: (data: any) => void): void
}

// Window Extension - declared in init.ts to avoid conflicts
