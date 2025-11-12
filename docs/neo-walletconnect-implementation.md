# NEO Token Integration with WalletConnect & CPM

## Overview

This documentation covers the implementation of NEO blockchain integration using:
- **CPM (Contract Package Manager)**: For generating type-safe TypeScript SDKs from smart contracts
- **WalletConnect SDK**: For connecting to NEO wallets (OneGate, NeoLine, etc.)
- **Neon DappKit**: For blockchain interactions on NEO TestNet

## What Was Implemented

### 1. Project Structure

```
bolt.new-extended/
├── app/
│   ├── contracts/
│   │   └── neotoken/           # Generated SDK
│   │       ├── index.ts
│   │       ├── NeoToken.ts     # Main contract class
│   │       └── api.ts          # Contract invocation helpers
│   └── routes/
│       └── test.tsx            # Demo page at /test
├── cpm.yaml                    # CPM configuration
└── docs/
    ├── plan.md                 # Original implementation plan
    └── neo-walletconnect-implementation.md  # This file
```

### 2. Key Components

#### a) CPM Configuration (`cpm.yaml`)
Configures contract SDK generation for NEO Token on TestNet.

#### b) Generated SDK (`app/contracts/neotoken/`)
Type-safe TypeScript SDK for NEO Token contract with methods like:
- `symbol()`: Get token symbol
- `decimals()`: Get token decimals
- `totalSupply()`: Get total supply
- `balanceOf()`: Get account balance
- `transfer()`: Transfer tokens
- And many more...

#### c) Test Page (`app/routes/test.tsx`)
Interactive demo page with:
- WalletConnect integration
- Contract interaction examples
- Session persistence
- Real-time status updates

---

## Setup Instructions

### Prerequisites
- Node.js >= 18.18.0
- pnpm 9.4.0
- Homebrew (for CPM installation on macOS/Linux)

### Installation Steps

#### 1. Install Dependencies

```bash
# Install WalletConnect and Neon DappKit
pnpm add @cityofzion/wallet-connect-sdk-core @cityofzion/neon-dappkit @cityofzion/neon-dappkit-types
```

#### 2. Install CPM

**macOS/Linux (Homebrew):**
```bash
brew install CityOfZion/tap/cpm
```

**Windows (Chocolatey):**
```bash
choco install cpm
```

#### 3. Generate SDK

```bash
# Download contract manifest from TestNet
cpm download manifest -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -N https://testnet1.neo.coz.io:443

# Generate TypeScript SDK
cpm generate ts -m contract.manifest.json -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -o app/contracts

# Clean up temporary manifest
rm contract.manifest.json
```

#### 4. Start Development Server

```bash
pnpm dev
```

Navigate to: `http://localhost:3000/test`

---

## How It Works

### Architecture

```
┌─────────────────┐
│   React App     │
│   (test.tsx)    │
└────────┬────────┘
         │
    ┌────┴─────────────────────┐
    │                          │
┌───▼────────┐        ┌────────▼─────┐
│ WcSdk      │        │ NeonInvoker  │
│ (Wallet)   │        │ (Read-Only)  │
└───┬────────┘        └────────┬─────┘
    │                          │
    └──────────┬───────────────┘
               │
        ┌──────▼────────┐
        │  NeoToken SDK │
        │  (Generated)  │
        └──────┬────────┘
               │
        ┌──────▼────────┐
        │  NEO TestNet  │
        │   Contract    │
        └───────────────┘
```

### Key Concepts

#### 1. **Dual Invoker Pattern**
The app uses two invokers:
- **NeonInvoker**: Read-only access (no wallet required)
- **WcSdk**: Connected wallet (for transactions)

```typescript
function getInvoker() {
  return wcSdk?.isConnected() ? wcSdk : neonInvoker;
}
```

#### 2. **Session Management**
WalletConnect sessions persist across page reloads:

```typescript
// Initialize with session listener
wcSdk.emitter.on('session', (session) => {
  if (session) {
    // User connected
  } else {
    // User disconnected
  }
});

// Restore previous session
await wcSdk.manageSession();
```

#### 3. **Generated SDK Usage**
Clean, type-safe contract interactions:

```typescript
const neo = new NeoToken({
  scriptHash: NeoToken.SCRIPT_HASH,
  invoker: getInvoker(),
});

// Type-safe methods with automatic serialization
const symbol = await neo.symbol();        // Returns: string
const decimals = await neo.decimals();    // Returns: number
const supply = await neo.totalSupply();   // Returns: number
```

---

## Usage Guide

### Basic Contract Query (No Wallet Required)

```typescript
import { NeonInvoker } from '@cityofzion/neon-dappkit';
import { NeoToken } from '~/contracts/neotoken';

// Initialize read-only invoker
const invoker = await NeonInvoker.init({
  rpcAddress: NeonInvoker.TESTNET,
});

// Create contract instance
const neo = new NeoToken({
  scriptHash: NeoToken.SCRIPT_HASH,
  invoker: invoker,
});

// Query contract
const symbol = await neo.symbol();
console.log(symbol); // "NEO"
```

### Wallet Connection

```typescript
import WcSdk from '@cityofzion/wallet-connect-sdk-core';

// Initialize WalletConnect
const wcSdk = await WcSdk.init({
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.walletconnect.com',
  metadata: {
    name: 'Your App Name',
    description: 'Your App Description',
    url: 'https://yourapp.com',
    icons: ['https://yourapp.com/icon.png'],
  },
});

// Connect to wallet
await wcSdk.connect('neo3:testnet', [
  'invokeFunction',
  'testInvoke',
  'signMessage',
  'verifyMessage',
  'traverseIterator',
  'getWalletInfo',
]);

// Get connected account
const address = wcSdk.getAccountAddress();
```

### Making Transactions

```typescript
// Use connected wallet as invoker
const neo = new NeoToken({
  scriptHash: NeoToken.SCRIPT_HASH,
  invoker: wcSdk, // Use wallet instead of read-only invoker
});

// Transfer tokens (requires wallet approval)
const txId = await neo.transfer({
  from: wcSdk.getAccountAddress(),
  to: 'NbnjKGMBJzJ6j5PHeYhjJDaQ5Vy5UYu4Fv',
  amount: 100000000, // 1 NEO (8 decimals)
  data: null,
});

console.log('Transaction ID:', txId);
```

---

## Technical Implementation Details

### 1. CommonJS Module Fix

**Problem**: Vite doesn't handle named imports from CommonJS modules well.

**Solution**: Use `import type` for type-only imports and import runtime values from the main package:

```typescript
// ❌ Before (breaks in Vite)
import { Neo3Parser, TypeChecker } from "@cityofzion/neon-dappkit-types"

// ✅ After (works in Vite)
import type { Neo3Parser } from "@cityofzion/neon-dappkit-types"
import { TypeChecker } from "@cityofzion/neon-dappkit"
```

### 2. Contract Hash Format

NEO contract hashes are in little-endian format with `0x` prefix:

```typescript
// NEO Token TestNet
const SCRIPT_HASH = '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5';
```

### 3. Method Authorization

Specify all methods your app needs when connecting:

```typescript
await wcSdk.connect('neo3:testnet', [
  'invokeFunction',   // For transactions
  'testInvoke',       // For read operations
  'signMessage',      // For message signing
  'verifyMessage',    // For signature verification
  'traverseIterator', // For paginated results
  'getWalletInfo',    // For wallet metadata
]);
```

---

## Available Contract Methods

The generated NEO Token SDK includes:

### Read Methods (No Wallet Required)
- `symbol()`: Get token symbol
- `decimals()`: Get decimal places
- `totalSupply()`: Get total supply
- `balanceOf({ account })`: Get account balance
- `getAccountState({ account })`: Get account voting state
- `getCandidates()`: Get all candidates
- `getCommittee()`: Get committee members
- `getCommitteeAddress()`: Get committee address
- `getGasPerBlock()`: Get GAS generation rate
- `getNextBlockValidators()`: Get next validators
- `getRegisterPrice()`: Get candidate registration price
- `getCandidateVote({ pubKey })`: Get votes for candidate
- `unclaimedGas({ account, end })`: Get unclaimed GAS

### Write Methods (Wallet Required)
- `transfer({ from, to, amount, data })`: Transfer tokens
- `registerCandidate({ pubkey })`: Register as candidate
- `unregisterCandidate({ pubkey })`: Unregister candidate
- `vote({ account, voteTo })`: Vote for candidate
- `setGasPerBlock({ gasPerBlock })`: Set GAS rate (committee only)
- `setRegisterPrice({ registerPrice })`: Set registration price (committee only)

### Iterators
- `getAllCandidates(itemsPerRequest)`: Async generator for all candidates

---

## Troubleshooting

### Issue: "Named export not found" Error

**Cause**: CommonJS module compatibility issue with Vite.

**Solution**: 
1. Use `import type` for type-only imports
2. Import runtime values from `@cityofzion/neon-dappkit` instead of types package

```typescript
// Fix in NeoToken.ts and api.ts
import type { Neo3Parser } from "@cityofzion/neon-dappkit-types"
import { TypeChecker } from "@cityofzion/neon-dappkit"
```

### Issue: Wallet Not Connecting

**Checklist**:
1. Ensure WalletConnect Project ID is valid
2. Check that relay URL is correct: `wss://relay.walletconnect.com`
3. Verify wallet supports NEO TestNet
4. Check browser console for errors
5. Try refreshing the page (session should restore)

### Issue: Contract Call Fails

**Common Causes**:
1. **Wrong Network**: Ensure contract hash matches network (TestNet vs MainNet)
2. **Insufficient GAS**: Transactions need GAS for fees
3. **Wrong Invoker**: Some methods require wallet, others work read-only
4. **Invalid Arguments**: Check parameter types match contract expectations

### Issue: SDK Regeneration Needed

When contract updates:

```bash
# Download latest manifest
cpm download manifest -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -N https://testnet1.neo.coz.io:443

# Regenerate SDK
cpm generate ts -m contract.manifest.json -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -o app/contracts

# Clean up
rm contract.manifest.json
```

---

## Configuration Reference

### CPM Configuration (`cpm.yaml`)

```yaml
defaults:
  contract-source-network: testnet
  contract-destination: ""
  contract-generate-sdk: true
  off-chain:
    languages:
      - ts
    destinations:
      ts: app/contracts

contracts:
  - label: NEO Token
    script-hash: 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5
    source-network: testnet
    generate-sdk: true
    download: false

tools:
  neo-express:
    canGenerateSDK: false
    canDownloadContract: false
    config-path: ""

networks:
  - label: testnet
    hosts:
      - https://testnet1.neo.coz.io:443
      - http://seed1.neo.org:20332
```

### WalletConnect Configuration

```typescript
const wcSdk = await WcSdk.init({
  projectId: 'a9ff54e3d56a52230ed8767db4d4a810',
  relayUrl: 'wss://relay.walletconnect.com',
  metadata: {
    name: 'Bolt.new Extended',
    description: 'NEO Token Test Application',
    url: window.location.origin,
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
  },
});
```

---

## Best Practices

### 1. Error Handling

Always wrap contract calls in try-catch:

```typescript
try {
  const symbol = await neo.symbol();
  console.log('Token:', symbol);
} catch (error) {
  console.error('Contract call failed:', error);
  // Show user-friendly error message
}
```

### 2. Loading States

Provide feedback during async operations:

```typescript
const [isLoading, setIsLoading] = useState(false);

async function fetchData() {
  setIsLoading(true);
  try {
    const data = await neo.symbol();
    // Process data
  } finally {
    setIsLoading(false);
  }
}
```

### 3. Session Management

Handle session restoration on app load:

```typescript
useEffect(() => {
  async function init() {
    const wcSdk = await WcSdk.init({ /* config */ });
    
    // Restore previous session
    await wcSdk.manageSession();
    
    // Listen for changes
    wcSdk.emitter.on('session', handleSessionChange);
  }
  init();
}, []);
```

### 4. Type Safety

Leverage TypeScript for safer code:

```typescript
// SDK provides full type information
const neo = new NeoToken({
  scriptHash: NeoToken.SCRIPT_HASH, // Type: string
  invoker: getInvoker(),             // Type: Neo3Invoker
});

// Return types are known
const decimals: number = await neo.decimals();
const symbol: string = await neo.symbol();
```

---

## Resources

### Documentation
- [CPM Documentation](https://github.com/CityOfZion/cpm)
- [Neon DappKit](https://github.com/CityOfZion/neon-dappkit)
- [WalletConnect SDK](https://github.com/CityOfZion/wallet-connect-sdk)
- [NEO Documentation](https://docs.neo.org)

### Tools
- [NEO Tracker (TestNet)](https://testnet.neotube.io/)
- [WalletConnect Cloud](https://cloud.walletconnect.com) - Get Project ID
- [OneGate Wallet](https://onegate.space/)
- [NeoLine Wallet](https://neoline.io/)

### Networks
- **TestNet RPC**: https://testnet1.neo.coz.io:443
- **MainNet RPC**: https://mainnet1.neo.coz.io:443

### Contract Addresses
- **NEO Token (TestNet)**: `0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5`
- **GAS Token (TestNet)**: `0xd2a4cff31913016155e38e474a2c06d08be276cf`

---

## Next Steps

### Adding More Contracts

1. Add contract to `cpm.yaml`:
```yaml
contracts:
  - label: GAS Token
    script-hash: 0xd2a4cff31913016155e38e474a2c06d08be276cf
    source-network: testnet
    generate-sdk: true
```

2. Run CPM:
```bash
cpm run
```

3. Use in your app:
```typescript
import { GasToken } from '~/contracts/gastoken';
```

### Production Deployment

1. **Switch to MainNet**:
   - Update contract hashes in `cpm.yaml`
   - Change `source-network` to `mainnet`
   - Update WalletConnect chain to `neo3:mainnet`

2. **Security Considerations**:
   - Keep WalletConnect Project ID in environment variables
   - Validate all user inputs
   - Handle errors gracefully
   - Test thoroughly on TestNet first

3. **Performance Optimization**:
   - Cache contract responses
   - Batch multiple contract calls
   - Use session persistence
   - Implement loading states

---

## Changelog

### v1.0.0 - Initial Implementation
- ✅ CPM installation and configuration
- ✅ NEO Token SDK generation
- ✅ WalletConnect integration
- ✅ Neon DappKit setup
- ✅ Test page implementation
- ✅ Session persistence
- ✅ CommonJS module fixes
- ✅ Full documentation

---

## License

This implementation follows the project's MIT license.

## Support

For issues or questions:
- Check [NEO Discord](https://discord.io/neo)
- Open an issue on the project repository
- Review the official documentation links above

