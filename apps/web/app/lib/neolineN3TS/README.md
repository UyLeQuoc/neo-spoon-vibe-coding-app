# NeoLine N3 TypeScript Library

A TypeScript library for integrating NeoLine N3 wallet into your dApp. This library provides type-safe wrappers and React hooks for the NeoLine N3 dAPI.

## Installation

The library is already included in the project. No additional installation needed.

## Prerequisites

- NeoLine browser extension installed: [https://neoline.io/](https://neoline.io/)
- The NeoLine extension automatically injects the SDK into `window.NEOLineN3`

## Quick Start

### Using React Hook (Recommended)

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function MyComponent() {
  const { 
    neoline, 
    isInitialized, 
    account, 
    balance, 
    error, 
    connect, 
    disconnect, 
    refreshBalance 
  } = useNeoLineN3()

  if (!isInitialized) {
    return <div>Initializing NeoLine...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!account) {
    return <button onClick={connect}>Connect Wallet</button>
  }

  return (
    <div>
      <p>Connected: {account}</p>
      <p>Balance: {balance ? JSON.stringify(balance) : 'Loading...'}</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  )
}
```

### Using Direct Initialization

```typescript
import { initNeoLineN3 } from '~/lib/neolineN3TS'

async function connectWallet() {
  const neoline = await initNeoLineN3()
  
  if (!neoline) {
    console.error('NeoLine extension not detected')
    return
  }

  try {
    const account = await neoline.getAccount()
    console.log('Connected:', account.address)
  } catch (error) {
    console.error('Connection failed:', error)
  }
}
```

## API Reference

### React Hook: `useNeoLineN3()`

Returns an object with the following properties:

#### Properties

- **`neoline: NeoLineN3 | null`** - The NeoLine N3 SDK instance (null if not initialized)
- **`isInitialized: boolean`** - Whether the SDK has finished initializing
- **`account: string | null`** - Currently connected account address
- **`accountInfo: GetAccountResponse | null`** - Full account information (address, label, isLedger)
- **`balance: GetBalanceResponse | null`** - Balance information for the connected account
- **`error: string | null`** - Error message if initialization or connection failed

#### Methods

- **`connect(): Promise<void>`** - Connect to NeoLine wallet
- **`disconnect(): void`** - Disconnect from wallet (clears local state)
- **`refreshBalance(): Promise<void>`** - Refresh the balance for the connected account

### Initialization Functions

#### `initNeoLineN3(): Promise<NeoLineN3 | null>`

Initializes the NeoLine N3 SDK. Returns the SDK instance or null if not available.

```typescript
import { initNeoLineN3 } from '~/lib/neolineN3TS'

const neoline = await initNeoLineN3()
if (neoline) {
  // SDK is ready
}
```

#### `waitForNeoLine(timeoutMs?: number): Promise<NeoLineN3 | null>`

Waits for NeoLine extension to be ready. Default timeout is 2000ms.

```typescript
import { waitForNeoLine } from '~/lib/neolineN3TS'

const neoline = await waitForNeoLine(5000) // Wait up to 5 seconds
```

#### `isNeoLineInstalled(): boolean`

Checks if NeoLine extension is installed.

```typescript
import { isNeoLineInstalled } from '~/lib/neolineN3TS'

if (isNeoLineInstalled()) {
  console.log('NeoLine is installed')
}
```

## Common Use Cases

### 1. Get Account Information

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function AccountInfo() {
  const { neoline, account } = useNeoLineN3()

  const getAccountInfo = async () => {
    if (!neoline) return
    
    try {
      const accountInfo = await neoline.getAccount()
      console.log('Address:', accountInfo.address)
      console.log('Label:', accountInfo.label)
      console.log('Is Ledger:', accountInfo.isLedger)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={getAccountInfo}>Get Account Info</button>
}
```

### 2. Get Balance

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import type { BalanceRequest } from '~/lib/neolineN3TS'

function Balance() {
  const { neoline, account } = useNeoLineN3()

  const getBalance = async () => {
    if (!neoline || !account) return
    
    try {
      // Get all balances
      const balances = await neoline.getBalance()
      
      // Or get specific contract balances
      const specificBalances = await neoline.getBalance([
        {
          address: account,
          contracts: ['0xd2a4cff31913016155e38e474a2c06d08be276cf'] // GAS token
        }
      ])
      
      console.log('Balances:', balances)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={getBalance}>Get Balance</button>
}
```

### 3. Read Contract Storage

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function ReadStorage() {
  const { neoline } = useNeoLineN3()

  const readStorage = async () => {
    if (!neoline) return
    
    try {
      const result = await neoline.getStorage({
        scriptHash: '0x006b26dd0d2aa076b11082847a094772450f05af',
        key: 'token0'
      })
      
      console.log('Storage value:', result.result)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={readStorage}>Read Storage</button>
}
```

### 4. Invoke Read-Only Contract Method

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import type { Argument, Signer } from '~/lib/neolineN3TS'

function ReadContract() {
  const { neoline, account } = useNeoLineN3()

  const invokeRead = async () => {
    if (!neoline || !account) return
    
    try {
      // Convert address to script hash for signer
      const scriptHashResult = await neoline.AddressToScriptHash({ address: account })
      
      const result = await neoline.invokeRead({
        scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS token
        operation: 'balanceOf',
        args: [
          {
            type: 'Address',
            value: account
          }
        ],
        signers: [
          {
            account: scriptHashResult.scriptHash,
            scopes: 1 // CalledByEntry
          }
        ]
      })
      
      console.log('Result:', result.stack)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={invokeRead}>Read Contract</button>
}
```

### 5. Send Transaction

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function SendTransaction() {
  const { neoline, account } = useNeoLineN3()

  const send = async () => {
    if (!neoline || !account) return
    
    try {
      const result = await neoline.send({
        fromAddress: account,
        toAddress: 'NaUjKgf5vMuFt7Ffgfffcpc41uH3adx1jq',
        asset: 'GAS', // Or contract hash for TestNet
        amount: '1',
        fee: '0.0001'
      })
      
      console.log('Transaction ID:', result.txid)
      console.log('Node URL:', result.nodeURL)
    } catch (error: any) {
      if (error.type === 'CANCELED') {
        console.log('User cancelled the transaction')
      } else if (error.type === 'INSUFFICIENT_FUNDS') {
        console.log('Insufficient funds')
      } else {
        console.error('Error:', error)
      }
    }
  }

  return <button onClick={send}>Send GAS</button>
}
```

### 6. Invoke Contract Method

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import type { Argument, Signer } from '~/lib/neolineN3TS'

function InvokeContract() {
  const { neoline, account } = useNeoLineN3()

  const invoke = async () => {
    if (!neoline || !account) return
    
    try {
      // Convert address to script hash
      const scriptHashResult = await neoline.AddressToScriptHash({ address: account })
      
      const result = await neoline.invoke({
        scriptHash: '0x1415ab3b409a95555b77bc4ab6a7d9d7be0eddbd',
        operation: 'transfer',
        args: [
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Address',
            value: 'NaUjKgf5vMuFt7Ffgfffcpc41uH3adx1jq'
          },
          {
            type: 'Integer',
            value: '100000000' // 1 token (8 decimals)
          },
          {
            type: 'Any',
            value: null
          }
        ],
        signers: [
          {
            account: scriptHashResult.scriptHash,
            scopes: 1 // CalledByEntry (recommended)
          }
        ],
        fee: '0.0001'
      })
      
      console.log('Transaction ID:', result.txid)
    } catch (error: any) {
      console.error('Error:', error)
    }
  }

  return <button onClick={invoke}>Invoke Contract</button>
}
```

### 7. Sign Message

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function SignMessage() {
  const { neoline } = useNeoLineN3()

  const signMessage = async () => {
    if (!neoline) return
    
    try {
      const result = await neoline.signMessage({
        message: 'Hello, Neo!'
      })
      
      console.log('Public Key:', result.publicKey)
      console.log('Signed Data:', result.data)
      console.log('Salt:', result.salt)
      console.log('Original Message:', result.message)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={signMessage}>Sign Message</button>
}
```

### 8. Verify Message

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function VerifyMessage() {
  const { neoline } = useNeoLineN3()

  const verifyMessage = async () => {
    if (!neoline) return
    
    try {
      const result = await neoline.verifyMessage({
        message: '42e038cec78bed9f1e503c4b23254b23Hello world',
        data: 'be506bf7e6851960bfe45968bf5dbbf79a9dc5dc63ee5b88629acfb288c435649c2766e977d4bc76253d8590bb3ca3d9b70efd71d6f7eebdf060dfa58c6601fd',
        publicKey: '03ba9524bd7479414be713c3a4f6f3ef35f90bb4b08f0f552211bf734c24415230'
      })
      
      console.log('Verification result:', result.result)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={verifyMessage}>Verify Message</button>
}
```

### 9. Listen to Events

```typescript
import { useEffect } from 'react'
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function EventListener() {
  const { neoline } = useNeoLineN3()

  useEffect(() => {
    if (!neoline) return

    const handleAccountChanged = (result: any) => {
      const accountData = result.detail || result
      console.log('Account changed:', accountData.address)
    }

    const handleConnected = (result: any) => {
      const accountData = result.detail || result
      console.log('Connected:', accountData.address)
    }

    const handleDisconnected = () => {
      console.log('Disconnected')
    }

    // Add event listeners
    neoline.addEventListener('NEOLine.N3.EVENT.ACCOUNT_CHANGED', handleAccountChanged)
    neoline.addEventListener('NEOLine.N3.EVENT.CONNECTED', handleConnected)
    neoline.addEventListener('NEOLine.N3.EVENT.DISCONNECTED', handleDisconnected)

    // Cleanup
    return () => {
      neoline.removeEventListener('NEOLine.N3.EVENT.ACCOUNT_CHANGED', handleAccountChanged)
      neoline.removeEventListener('NEOLine.N3.EVENT.CONNECTED', handleConnected)
      neoline.removeEventListener('NEOLine.N3.EVENT.DISCONNECTED', handleDisconnected)
    }
  }, [neoline])

  return <div>Event listeners active</div>
}
```

### 10. Get Transaction Information

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function GetTransaction() {
  const { neoline } = useNeoLineN3()

  const getTransaction = async () => {
    if (!neoline) return
    
    try {
      const tx = await neoline.getTransaction({
        txid: '0xe5a5fdacad0ba4e8d34d2fa0638357adb0f05e7fc902ec150739616320870f50'
      })
      
      console.log('Transaction:', tx)
      console.log('Hash:', tx.hash)
      console.log('Block Index:', tx.block_index)
      console.log('Transfers:', tx.transfers)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={getTransaction}>Get Transaction</button>
}
```

### 11. Get Application Log

```typescript
import { useNeoLineN3 } from '~/lib/neolineN3TS'

function GetApplicationLog() {
  const { neoline } = useNeoLineN3()

  const getLog = async () => {
    if (!neoline) return
    
    try {
      const log = await neoline.getApplicationLog({
        txid: '0xe5a5fdacad0ba4e8d34d2fa0638357adb0f05e7fc902ec150739616320870f50'
      })
      
      console.log('Application Log:', log)
      
      // Check for events/notifications
      log.executions.forEach(execution => {
        if (execution.notifications) {
          execution.notifications.forEach(notification => {
            console.log('Event:', notification.eventname)
            console.log('Contract:', notification.contract)
            console.log('State:', notification.state)
          })
        }
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return <button onClick={getLog}>Get Application Log</button>
}
```

## Error Handling

All methods can throw errors. Handle them appropriately:

```typescript
try {
  const account = await neoline.getAccount()
} catch (error: any) {
  switch (error.type) {
    case 'NO_PROVIDER':
      console.log('No provider available')
      break
    case 'CONNECTION_DENIED':
      console.log('User rejected the connection')
      break
    case 'CONNECTION_REFUSED':
      console.log('dApp not connected. Call connect() first')
      break
    case 'RPC_ERROR':
      console.log('RPC connection error')
      break
    case 'MALFORMED_INPUT':
      console.log('Invalid input format')
      break
    case 'CANCELED':
      console.log('User cancelled the operation')
      break
    case 'INSUFFICIENT_FUNDS':
      console.log('Insufficient balance')
      break
    case 'CHAIN_NOT_MATCH':
      console.log('Chain mismatch. Switch network')
      break
    default:
      console.error('Unknown error:', error)
  }
}
```

## Signer Scopes

When invoking contracts, you need to specify signer scopes:

- **`0`** - No contracts allowed (only transaction signing)
- **`1`** - CalledByEntry (recommended default) - Only applies to the chain call entry
- **`16`** - CustomContracts - Signature can be used in specified contracts
- **`32`** - CustomGroups - Signature can be used in specified contract groups
- **`64`** - WitnessRules - Current context must satisfy specified rules
- **`128`** - Global - Extremely high risk, use only when contract is extremely trusted

Example:

```typescript
signers: [
  {
    account: scriptHash,
    scopes: 1 // CalledByEntry (recommended)
  }
]
```

## Argument Types

Supported argument types:

- `'String'` - String value
- `'Boolean'` - Boolean value
- `'Hash160'` - 20-byte hash (address)
- `'Hash256'` - 32-byte hash
- `'Integer'` - Integer value (as string)
- `'ByteArray'` - Byte array
- `'Array'` - Array of arguments
- `'Address'` - NEO address
- `'Any'` - Any type (usually null)

Example:

```typescript
args: [
  {
    type: 'Address',
    value: 'NaUjKgf5vMuFt7Ffgfffcpc41uH3adx1jq'
  },
  {
    type: 'Integer',
    value: '100000000' // Always use string for Integer
  },
  {
    type: 'Array',
    value: [] // Empty array
  }
]
```

## Chain IDs

NeoLine supports the following chain IDs:

- **`1`** - Neo2 MainNet
- **`2`** - Neo2 TestNet
- **`3`** - N3 MainNet
- **`6`** - N3 TestNet
- **`0`** - N3 Private Network

## Events

Available events:

- `NEOLine.N3.EVENT.READY` - SDK ready
- `NEOLine.N3.EVENT.ACCOUNT_CHANGED` - Account changed
- `NEOLine.N3.EVENT.CONNECTED` - Wallet connected
- `NEOLine.N3.EVENT.DISCONNECTED` - Wallet disconnected
- `NEOLine.N3.EVENT.NETWORK_CHANGED` - Network changed
- `NEOLine.N3.EVENT.BLOCK_HEIGHT_CHANGED` - New block mined
- `NEOLine.N3.EVENT.TRANSACTION_CONFIRMED` - Transaction confirmed

## TypeScript Support

All types are exported from the library:

```typescript
import type {
  NeoLineN3,
  ProviderInfo,
  GetAccountResponse,
  GetBalanceResponse,
  BalanceRequest,
  BalanceResponse,
  Argument,
  Signer,
  SignerScope,
  InvokeParams,
  InvokeResponse,
  SendParams,
  SendResponse,
  // ... and more
} from '~/lib/neolineN3TS'
```

## Examples

See `apps/web/app/routes/test-wallet.tsx` for a complete example implementation.

## Troubleshooting

### NeoLine extension not detected

1. Make sure NeoLine extension is installed: [https://neoline.io/](https://neoline.io/)
2. Make sure the extension is enabled in your browser
3. Refresh the page after installing/enabling the extension

### Initialization fails

- Check browser console for errors
- Make sure you're not blocking extension scripts
- Try refreshing the page

### Connection denied

- User needs to approve the connection in NeoLine popup
- Make sure NeoLine extension is unlocked

### Transaction cancelled

- User cancelled the transaction in NeoLine
- This is normal user behavior, handle gracefully

## License

This library is part of the project and follows the project's license.

