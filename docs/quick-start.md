# Quick Start: NEO Token Integration

This is a condensed guide for getting the NEO Token integration up and running in **10 minutes**.

## Prerequisites

- Node.js >= 18.18.0
- pnpm 9.4.0
- Homebrew (macOS/Linux) or Chocolatey (Windows)

## Installation (4 Steps)

### 1. Install CPM

**macOS/Linux:**
```bash
brew install CityOfZion/tap/cpm
```

**Windows:**
```bash
choco install cpm
```

### 2. Install Dependencies

```bash
cd /home/uydev/code/neo-spoon-vibe-coding-app
pnpm add @cityofzion/wallet-connect-sdk-core @cityofzion/neon-dappkit @cityofzion/neon-dappkit-types
```

### 3. Generate NEO Token SDK

```bash
# Download manifest
cpm download manifest -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -N https://testnet1.neo.coz.io:443

# Generate TypeScript SDK
cpm generate ts -m contract.manifest.json -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -o app/contracts

# Cleanup
rm contract.manifest.json
```

### 4. Run Dev Server

```bash
pnpm dev
```

Visit: **http://localhost:3000/test**

## What You Get

✅ **Type-safe SDK** for NEO Token contract  
✅ **WalletConnect integration** for OneGate/NeoLine wallets  
✅ **Session persistence** across page reloads  
✅ **Dual mode**: Read-only + Wallet-connected  
✅ **Demo page** with examples

## Basic Usage

```typescript
import { NeoToken } from '~/contracts/neotoken';
import { NeonInvoker } from '@cityofzion/neon-dappkit';

// Initialize
const invoker = await NeonInvoker.init({
  rpcAddress: NeonInvoker.TESTNET,
});

// Create contract instance
const neo = new NeoToken({
  scriptHash: NeoToken.SCRIPT_HASH,
  invoker: invoker,
});

// Call contract methods
const symbol = await neo.symbol();        // "NEO"
const decimals = await neo.decimals();    // 0
const supply = await neo.totalSupply();   // 100000000
```

## Test Page Features

Go to `/test` to try:

1. **Connect Wallet** - Connect OneGate or NeoLine
2. **Get Token Info** - Query NEO Token (symbol, decimals, supply)
3. **Session Persistence** - Stays connected on refresh

## Next Steps

For detailed documentation, see:
- [Full Implementation Guide](./neo-walletconnect-implementation.md)
- [Original Plan](./plan.md)

## Troubleshooting

**Import Errors?**
```typescript
// Use type imports for CommonJS compatibility
import type { Neo3Parser } from "@cityofzion/neon-dappkit-types"
import { TypeChecker } from "@cityofzion/neon-dappkit"
```

**Wallet Won't Connect?**
- Check console for errors
- Verify TestNet is selected in your wallet
- Try refreshing the page

**Need to Regenerate SDK?**
```bash
cpm download manifest -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -N https://testnet1.neo.coz.io:443
cpm generate ts -m contract.manifest.json -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -o app/contracts
rm contract.manifest.json
```

---

**That's it!** You now have a fully functional NEO blockchain integration. 🎉

