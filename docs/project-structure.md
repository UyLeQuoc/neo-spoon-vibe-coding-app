# Project Structure Guide

## 📁 Recommended Structure

```
bolt.new-extended/
│
├── contracts/                      # 🔨 Smart Contract Development
│   ├── neo-devpack-ts/            # TypeScript contract compiler
│   │   ├── samples/
│   │   │   ├── helloworld/
│   │   │   ├── tank/              # NEP-17 example
│   │   │   ├── hovercraft/        # NEP-11 example
│   │   │   └── mycontract/        # ← Your contracts here
│   │   ├── packages/
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── README.md                  # Contract development guide
│
├── app/                           # 🎨 Frontend Application
│   ├── contracts/                 # 📦 Generated SDKs (DO NOT EDIT)
│   │   ├── neotoken/             # Generated from deployed contract
│   │   │   ├── index.ts
│   │   │   ├── NeoToken.ts
│   │   │   └── api.ts
│   │   ├── mytoken/              # Your generated SDK
│   │   └── README.md
│   │
│   ├── routes/
│   │   ├── index.tsx
│   │   ├── test.tsx
│   │   └── token.tsx
│   │
│   └── ...
│
├── docs/                          # 📚 Documentation
│   ├── README.md
│   ├── quick-start.md
│   ├── neo-typescript-smart-contracts.md
│   ├── full-stack-neo-development.md
│   └── project-structure.md       # This file
│
├── scripts/                       # 🔧 Automation Scripts
│   ├── setup-contracts.sh         # Setup neo-devpack-ts
│   ├── deploy-and-sync.sh         # Deploy + Generate SDK
│   └── README.md
│
├── cpm.yaml                       # CPM configuration
├── package.json
└── README.md
```

## 🎯 Two Separate Workflows

### Workflow 1: Smart Contract Development
**Location**: `contracts/neo-devpack-ts/samples/`

```
1. Write contract      → contracts/neo-devpack-ts/samples/mycontract/mycontract.ts
2. Compile contract    → npx foy mycontract
3. Test on neo-express → neoxp run + deploy
4. Deploy to TestNet   → Get contract hash
```

### Workflow 2: Frontend Integration  
**Location**: `app/contracts/`

```
1. Get contract hash   → From deployment
2. Generate SDK        → cpm generate ts
3. Use in frontend     → import { MyContract } from '~/contracts/mycontract'
```

## 📋 Directory Purposes

### `/contracts/` - Smart Contract Source Code
**Purpose**: Develop and compile smart contracts  
**Tools**: neo-devpack-ts, TypeScript  
**Output**: `.nef` and `.manifest.json` files  
**Edit**: ✅ YES - This is where you write your contracts

### `/app/contracts/` - Generated SDKs
**Purpose**: Type-safe interfaces for deployed contracts  
**Tools**: CPM (Contract Package Manager)  
**Output**: TypeScript classes and functions  
**Edit**: ❌ NO - Auto-generated, will be overwritten

### `/docs/` - Documentation
**Purpose**: Guides, tutorials, API references  
**Edit**: ✅ YES - Keep documentation updated

### `/scripts/` - Automation
**Purpose**: Automate repetitive tasks  
**Edit**: ✅ YES - Add your own automation scripts

## 🚀 Setup Instructions

### Step 1: Clone neo-devpack-ts

```bash
cd /home/uydev/code/bolt.new-extended

# Create contracts directory
mkdir -p contracts

# Clone neo-devpack-ts
cd contracts
git clone https://github.com/N3developertoolkit/neo-devpack-ts.git

# Setup
cd neo-devpack-ts
npm install
npm run setup
npm run build
```

### Step 2: Verify Structure

```bash
cd /home/uydev/code/bolt.new-extended

# Check contract compiler
ls -la contracts/neo-devpack-ts/samples/

# Check generated SDKs
ls -la app/contracts/
```

## 📝 Example: Complete Flow

### 1. Write Smart Contract

File: `contracts/neo-devpack-ts/samples/mytoken/mytoken.ts`

```typescript
import { SmartContract, Hash160 } from '@neo-blockchain/typescript';

export class MyToken extends SmartContract {
  public static symbol(): string {
    return 'MYT';
  }
  
  public static totalSupply(): number {
    const supply = SmartContract.storage.get('totalSupply');
    return supply ? (supply as number) : 0;
  }
}
```

### 2. Compile Contract

```bash
cd /home/uydev/code/bolt.new-extended/contracts/neo-devpack-ts
npx foy mytoken

# Output:
# ✓ Compiled: samples/mytoken/build/mytoken.nef
# ✓ Manifest: samples/mytoken/build/mytoken.manifest.json
```

### 3. Deploy Contract

```bash
# Deploy to TestNet (you'll get contract hash)
neoxp contract deploy samples/mytoken/build/mytoken.nef \
  --wallet your-wallet.json \
  --rpc https://testnet1.neo.coz.io:443

# Output: Contract deployed: 0x1234...abcd
```

### 4. Generate SDK

```bash
cd /home/uydev/code/bolt.new-extended

# Generate TypeScript SDK
cpm download manifest -c 0x1234...abcd -N https://testnet1.neo.coz.io:443
cpm generate ts -m contract.manifest.json -c 0x1234...abcd -o app/contracts
rm contract.manifest.json

# Output: SDK generated at app/contracts/mytoken/
```

### 5. Use in Frontend

File: `app/routes/token.tsx`

```typescript
import { MyToken } from '~/contracts/mytoken';
import { NeonInvoker } from '@cityofzion/neon-dappkit';

const invoker = await NeonInvoker.init({
  rpcAddress: NeonInvoker.TESTNET,
});

const token = new MyToken({
  scriptHash: MyToken.SCRIPT_HASH,
  invoker: invoker,
});

const symbol = await token.symbol();
const supply = await token.totalSupply();
```

## 🔄 Development Cycle

```
┌─────────────────────────────────────────────┐
│  1. Write Contract (contracts/neo-devpack-ts)│
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  2. Compile (.nef + .manifest.json)         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  3. Test Locally (neo-express)              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  4. Deploy to TestNet                       │
│     → Get Contract Hash                     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  5. Generate SDK (app/contracts/)           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  6. Use in Frontend                         │
└─────────────────────────────────────────────┘
```

## ⚠️ Important Notes

### DO NOT Mix Directories

❌ **Wrong**: 
```
app/contracts/
├── mytoken.ts           # Contract source (WRONG PLACE!)
└── neotoken/            # Generated SDK
```

✅ **Correct**:
```
contracts/neo-devpack-ts/samples/mytoken/
└── mytoken.ts           # Contract source (CORRECT!)

app/contracts/
├── mytoken/             # Generated SDK
└── neotoken/            # Generated SDK
```

### Git Ignore

Add to `.gitignore`:

```gitignore
# Smart contract builds (optional - you may want to commit these)
contracts/neo-devpack-ts/samples/*/build/

# Generated SDKs (you may want to commit these for team)
# app/contracts/*/

# Contract manifests (temporary files)
contract.manifest.json
*.manifest.json
```

### When to Regenerate SDK

Regenerate SDK when:
- ✅ Smart contract is updated and redeployed
- ✅ Contract methods are added/removed
- ✅ Contract parameters change
- ❌ Frontend code changes (no need)
- ❌ UI styling changes (no need)

## 📚 Quick Reference

| Task | Location | Command |
|------|----------|---------|
| Write contract | `contracts/neo-devpack-ts/samples/` | Edit `.ts` file |
| Compile | `contracts/neo-devpack-ts/` | `npx foy <name>` |
| Test | `contracts/neo-devpack-ts/` | `neoxp run` |
| Deploy | Any | `neoxp contract deploy` |
| Generate SDK | Root | `cpm generate ts` |
| Use SDK | `app/routes/` | `import { X } from '~/contracts/x'` |

## 🎓 Learning Path

1. **Beginner**: Use existing contracts (NEO Token, GAS Token)
2. **Intermediate**: Modify sample contracts (Tank, Hovercraft)
3. **Advanced**: Write your own contracts from scratch

## 🔗 Related Documentation

- [Neo TypeScript Contracts Guide](./neo-typescript-smart-contracts.md)
- [Full-Stack Development Guide](./full-stack-neo-development.md)
- [Quick Start Guide](./quick-start.md)

---

**Remember**: 
- `contracts/` = Write smart contracts 
- `app/contracts/` = Use smart contracts

