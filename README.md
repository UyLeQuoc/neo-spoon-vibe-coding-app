# NeoZero: AI-Powered Website Generation on NEO Blockchain

[![Bolt.new: AI-Powered Full-Stack Web Development in the Browser](./public/social_preview_index.jpg)](https://bolt.new)

**NeoZero** is a blockchain-powered platform that enables users to generate complete, production-ready websites using AI. Built on the NEO blockchain, users deposit GAS tokens into a smart contract to pay for AI-powered website generation, then seamlessly integrate with NeoNS (NEO Name Service) to assign domain names to their generated sites.

## 🎯 Project Overview

NeoZero combines the power of AI website generation with blockchain-based payments and decentralized domain management. The platform provides a complete workflow:

1. **Deposit**: Users deposit GAS tokens into a NEO smart contract
2. **Generate**: Call SpoonOS AI Agent to create websites from natural language prompts
3. **Domain**: Integrate with NeoNS to assign domain names to generated websites

### Key Features

- **Blockchain Payments**: Deposit GAS tokens via NEO smart contract for AI services
- **AI Website Generation**: Powered by SpoonOS framework with Claude Sonnet models
- **NeoNS Integration**: Assign and manage domain names for generated websites
- **Real-time Streaming**: Server-Sent Events (SSE) for live generation progress
- **Wallet Integration**: Support for NeoLine and other NEO wallets
- **Type-safe SDKs**: Auto-generated TypeScript SDKs from smart contracts using CPM

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      NeoZero Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │   Web App    │──────│  API Server  │──────│   Agent    │ │
│  │  (Remix)     │      │   (Hono)     │      │ (SpoonOS)   │ │
│  └──────┬───────┘      └──────┬───────┘      └─────┬──────┘ │
│         │                      │                     │        │
│         │                      │                     │        │
│  ┌──────▼──────────────────────▼─────────────────────▼──────┐ │
│  │              NEO Blockchain (TestNet)                     │ │
│  │  ┌──────────────────┐      ┌──────────────────┐          │ │
│  │  │ Payment Contract │      │   NeoNS Contract │          │ │
│  │  │  (GAS Deposits)  │      │  (Domain Names)  │          │ │
│  │  └──────────────────┘      └──────────────────┘          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **Web Application** (`apps/web`)
- **Framework**: Remix (React-based)
- **Features**:
  - Wallet connection (NeoLine integration)
  - Payment flow UI
  - Chat interface for website generation
  - NeoNS domain management
  - Balance and transaction history

#### 2. **API Server** (`apps/api`)
- **Framework**: Hono (Cloudflare Workers)
- **Endpoints**:
  - `/api/balance` - User balance management
  - `/api/create-pending-payment` - Create payment requests
  - `/api/verify-payment-transaction` - Verify blockchain transactions
  - `/api/neons/rpc-proxy` - NeoNS contract interactions
  - `/api/avatar/:seed` - Avatar proxy for DiceBear API

#### 3. **AI Agent** (`apps/agent`)
- **Framework**: SpoonOS (Python)
- **Capabilities**:
  - Website generation using Claude Sonnet models
  - Real-time SSE streaming
  - Template-based workflow
  - File management for generated sites

#### 4. **Shared** (`apps/shared`)
- Common types and utilities shared across apps

## 🔄 Main Flow

### 1. User Deposit Flow

```
User → Connect Wallet → Deposit GAS → Smart Contract → Balance Updated
```

1. User connects their NEO wallet (NeoLine,)
2. User initiates a deposit by transferring GAS tokens to the payment contract
3. Smart contract receives the deposit and emits events
4. Backend verifies the transaction and updates user balance
5. User receives "points" that can be used for AI generation

### 2. Website Generation Flow

```
User Prompt → API → SpoonOS Agent → Generate Site → Return HTML → Store Site
```

1. User enters requirements for website generation
2. Web app calls API server with user prompt
3. API server forwards request to SpoonOS AI Agent
4. Agent generates complete HTML website using Claude Sonnet
5. Generated site is stored with unique `site_id`
6. HTML is returned to user via SSE streaming

### 3. NeoNS Domain Integration Flow

```
Generated Site → Search Domain → Register Domain → Set DNS Record → Site Live
```

1. User generates a website and receives `site_id`
2. User searches for available domain names via NeoNS
3. User registers domain name (if available)
4. User sets DNS records pointing to generated site
5. Website becomes accessible via NeoNS domain

## 📁 Project Structure

```
bolt.new-extended/
├── apps/
│   ├── web/                    # Frontend application (Remix)
│   │   ├── app/
│   │   │   ├── components/     # React components
│   │   │   ├── routes/         # Remix routes
│   │   │   ├── contracts/     # Generated SDKs (CPM)
│   │   │   ├── lib/            # Utilities and stores
│   │   │   └── hooks/          # React hooks
│   │   └── uno.config.ts       # UnoCSS configuration
│   │
│   ├── api/                    # API server (Hono)
│   │   └── src/
│   │       ├── routes/         # API endpoints
│   │       │   ├── payment/    # Payment endpoints
│   │       │   ├── neons/      # NeoNS endpoints
│   │       │   └── avatar/     # Avatar proxy
│   │       └── middlewares/   # Auth, CORS, rate limiting
│   │
│   ├── agent/                  # AI Agent (SpoonOS)
│   │   ├── agents/             # Agent implementations
│   │   ├── tools/              # Generation tools
│   │   ├── generated_sites/   # Generated websites
│   │   └── main.py            # FastAPI SSE server
│   │
│   └── shared/                 # Shared code
│       └── src/                # Common types and utilities
│
├── docs/                       # Documentation
│   ├── project-structure.md
│   ├── quick-start.md
│   ├── neo-typescript-smart-contracts.md
│   ├── full-stack-neo-development.md
│   └── neo-walletconnect-implementation.md
│
├── contracts/                  # Smart contract development (optional)
│   └── neo-devpack-ts/        # TypeScript contract compiler
│
└── package.json                # Root package.json (monorepo)
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.18.0
- **pnpm** 9.4.0+
- **Python** 3.10+ (for agent)
- **NEO Wallet** (NeoLine or OneGate)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bolt.new-extended
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:

   **Web App** (`apps/web/.env`):
   ```env
   # API base URL
   VITE_API_BASE_URL=http://localhost:8787
   ```

   **API Server** (`apps/api/.dev.vars`):
   ```env
   JWT_SECRET=your-jwt-secret
   REFRESH_TOKEN_SECRET=your-refresh-token-secret
   DB=your-d1-database-binding
   ```

   **Agent** (`apps/agent/.env`):
   ```env
   OPENROUTER_API_KEY=your-openrouter-api-key
   ```

4. **Start development servers**:

   ```bash
   # Terminal 1: Web app
   cd apps/web
   pnpm dev

   # Terminal 2: API server
   cd apps/api
   pnpm dev

   # Terminal 3: AI Agent
   cd apps/agent
   python main.py
   ```

5. **Access the application**:
   - Web App: http://localhost:3000
   - API Server: http://localhost:8787
   - AI Agent: http://localhost:8000

## 💻 Development

### Smart Contract Integration

The project uses **CPM (Contract Package Manager)** to generate type-safe TypeScript SDKs from deployed smart contracts.

#### Generate SDK for NEO Token:

```bash
# Install CPM (macOS/Linux)
brew install CityOfZion/tap/cpm

# Download manifest and generate SDK
cpm download manifest -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -N https://testnet1.neo.coz.io:443
cpm generate ts -m contract.manifest.json -c 0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5 -o apps/web/app/contracts
rm contract.manifest.json
```

#### Use Generated SDK:

```typescript
import { NeoToken } from '~/contracts/neotoken';
import { NeonInvoker } from '@cityofzion/neon-dappkit';

const invoker = await NeonInvoker.init({
  rpcAddress: NeonInvoker.TESTNET,
});

const neo = new NeoToken({
  scriptHash: NeoToken.SCRIPT_HASH,
  invoker: invoker,
});

const symbol = await neo.symbol();
```

### Payment Flow Implementation

1. **Create Pending Payment**:
   ```typescript
   const response = await hClientWithAuth.api['create-pending-payment'].$post({
     json: { amount: 10.5 }
   });
   ```

2. **User Signs Transaction**:
   ```typescript
   await neoline.invoke({
     scriptHash: GAS_TOKEN_HASH,
     operation: 'transfer',
     args: [/* ... */],
   });
   ```

3. **Verify Transaction**:
   ```typescript
   await hClientWithAuth.api['verify-payment-transaction'].$post({
     json: { txDigest, pendingPaymentId }
   });
   ```

### Website Generation

**Call AI Agent**:
```typescript
const response = await fetch('http://localhost:8000/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requirements: 'Create a landing page for a tech startup',
    site_type: 'landing page',
    style_preferences: 'Modern, purple to blue gradient'
  }),
});

// Handle SSE stream
const reader = response.body.getReader();
// ... process SSE events
```

### NeoNS Domain Management

**Search Domain**:
```typescript
const isAvailable = await getIsAvailable(domainName);
```

**Register Domain**:
```typescript
await neoline.invoke({
  scriptHash: NEO_NS_CONTRACT_HASH,
  operation: 'register',
  args: [domainName, ownerHash],
});
```

**Set DNS Record**:
```typescript
await neoline.invoke({
  scriptHash: NEO_NS_CONTRACT_HASH,
  operation: 'setRecord',
  args: [domainName, recordType, recordData],
});
```

## 🧪 Testing

### Test Payment Flow

1. Connect wallet on `/test-wallet`
2. Make a deposit transaction
3. Verify balance updates

### Test Website Generation

1. Visit `/test` page (agent server)
2. Enter website requirements
3. Watch real-time generation progress
4. View generated HTML

### Test NeoNS Integration

1. Navigate to `/neo-ns-management`
2. Search for available domains
3. Register a domain
4. Set DNS records

## 📚 Documentation

- [Project Structure](./docs/project-structure.md) - Detailed project organization
- [Quick Start](./docs/quick-start.md) - Getting started guide
- [NEO Smart Contracts](./docs/neo-typescript-smart-contracts.md) - Contract development
- [Full-Stack Development](./docs/full-stack-neo-development.md) - Complete workflow guide
- [WalletConnect Implementation](./docs/neo-walletconnect-implementation.md) - Wallet integration

## 🔧 Tech Stack

### Frontend
- **Remix** - React framework with SSR
- **TypeScript** - Type safety
- **UnoCSS** - Atomic CSS engine
- **React Query** - Data fetching
- **Nanostores** - State management

### Backend
- **Hono** - Fast web framework for Cloudflare Workers
- **Drizzle ORM** - Type-safe database queries
- **Cloudflare D1** - SQLite database
- **JWT** - Authentication

### Blockchain
- **NEO N3** - Blockchain platform
- **CPM** - Contract Package Manager
- **Neon DappKit** - Blockchain interactions
- **WalletConnect** - Wallet connections

### AI
- **SpoonOS** - AI agent framework
- **Claude Sonnet** - Language model (via OpenRouter)
- **FastAPI** - Python web framework
- **Server-Sent Events** - Real-time streaming

## 🌐 Networks

### TestNet
- **RPC**: `https://testnet1.neo.coz.io:443`
- **Payment Contract**: `0x...` (configure in code)
- **NeoNS Contract**: `0xd4dbd72c8965b8f12c14d37ad57ddd91ee1d98cb`
- **GAS Token**: `0xd2a4cff31913016155e38e474a2c06d08be276cf`
- **NEO Token**: `0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is based on [bolt.new](https://github.com/stackblitz/bolt.new) and follows its license terms.

## 🙏 Acknowledgments

- [Bolt.new](https://bolt.new) - Original project inspiration
- [NEO Blockchain](https://neo.org) - Blockchain platform
- [SpoonOS](https://github.com/spoon-ai/spoon-os) - AI agent framework
- [City of Zion](https://cityofzion.io) - NEO development tools

## 📞 Support

For issues or questions:
- Check the [documentation](./docs/)
- Open an issue on GitHub
- Join the NEO developer community

---

**Built with ❤️ on the NEO blockchain**
