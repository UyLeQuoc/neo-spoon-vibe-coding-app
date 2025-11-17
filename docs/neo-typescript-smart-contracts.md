# Viết NEO Smart Contracts Bằng TypeScript

## Tổng Quan

NEO hỗ trợ viết smart contracts bằng TypeScript thông qua [neo-devpack-ts](https://github.com/N3developertoolkit/neo-devpack-ts) - TypeScript Smart Contract Compiler cho NEO N3.

## 🏗️ Cấu Trúc Project Đầy Đủ

```
my-neo-dapp/
├── contracts/                  # Smart contracts (TypeScript)
│   ├── src/
│   │   └── MyToken.ts         # Contract code
│   ├── build/
│   │   ├── MyToken.nef        # Compiled contract
│   │   └── MyToken.manifest.json
│   └── package.json
│
└── dapp/                       # Frontend (neo-spoon-vibe-coding-app)
    ├── app/
    │   ├── contracts/          # Generated SDK từ smart contract
    │   │   └── mytoken/
    │   └── routes/
    │       └── test.tsx
    └── cpm.yaml
```

## 📥 Setup Neo Devpack TypeScript

### 1. Clone Repository

```bash
# Clone neo-devpack-ts
git clone https://github.com/N3developertoolkit/neo-devpack-ts.git
cd neo-devpack-ts

# Install dependencies
npm install

# Setup (installs Neo-Express for testing)
npm run setup

# Build devpack
npm run build
```

### 2. Yêu Cầu

- **Node.js 18+** (LTS recommended)
- **Neo-Express** (được cài tự động qua `npm run setup`)

## 📝 Viết Smart Contract Đầu Tiên

### Hello World Contract

Tạo file `samples/mycontract/mycontract.ts`:

```typescript
import { SmartContract } from '@neo-blockchain/typescript';

export class MyContract extends SmartContract {
  private static readonly storageKey = 'message';

  /**
   * Store a message in contract storage
   */
  public static setMessage(message: string): void {
    SmartContract.storage.put(this.storageKey, message);
  }

  /**
   * Retrieve the stored message
   */
  public static getMessage(): string {
    return SmartContract.storage.get(this.storageKey) as string;
  }

  /**
   * Contract entry point
   */
  public static main(operation: string, args: any[]): any {
    if (operation === 'setMessage') {
      this.setMessage(args[0] as string);
      return true;
    }
    if (operation === 'getMessage') {
      return this.getMessage();
    }
    return false;
  }
}
```

### NEP-17 Token (Fungible Token)

Ví dụ từ samples - `samples/tank/tank.ts`:

```typescript
import { 
  SmartContract, 
  Address, 
  Deploy,
  Hash160,
  UInt160 
} from '@neo-blockchain/typescript';

@Deploy
export class TankToken extends SmartContract {
  // Token metadata
  public static symbol(): string {
    return 'TANK';
  }

  public static decimals(): number {
    return 8;
  }

  public static totalSupply(): number {
    const totalSupply = SmartContract.storage.get('totalSupply');
    return totalSupply ? totalSupply as number : 0;
  }

  // Balance of address
  public static balanceOf(account: Hash160): number {
    const balance = SmartContract.storage.get(account);
    return balance ? balance as number : 0;
  }

  // Transfer tokens
  public static transfer(
    from: Hash160,
    to: Hash160, 
    amount: number,
    data: any
  ): boolean {
    // Verify caller is the owner
    if (!SmartContract.runtime.checkWitness(from)) {
      return false;
    }

    // Check balance
    const fromBalance = this.balanceOf(from);
    if (fromBalance < amount) {
      return false;
    }

    // Update balances
    if (fromBalance === amount) {
      SmartContract.storage.delete(from);
    } else {
      SmartContract.storage.put(from, fromBalance - amount);
    }

    const toBalance = this.balanceOf(to);
    SmartContract.storage.put(to, toBalance + amount);

    // Emit transfer event
    SmartContract.events.Transfer(from, to, amount);

    // Call onNEP17Payment if receiver is contract
    if (SmartContract.contract.call(to, 'onNEP17Payment', [from, amount, data])) {
      // Payment received
    }

    return true;
  }

  // Mint tokens (owner only)
  public static mint(to: Hash160, amount: number): boolean {
    // Implement owner check here
    const balance = this.balanceOf(to);
    SmartContract.storage.put(to, balance + amount);

    const totalSupply = this.totalSupply();
    SmartContract.storage.put('totalSupply', totalSupply + amount);

    SmartContract.events.Transfer(null, to, amount);
    return true;
  }
}
```

### NEP-11 Token (Non-Fungible Token)

Ví dụ từ samples - `samples/hovercraft/hovercraft.ts`:

```typescript
import { SmartContract, Hash160, ByteString } from '@neo-blockchain/typescript';

export class HovercraftNFT extends SmartContract {
  // Token metadata
  public static symbol(): string {
    return 'HOVER';
  }

  public static decimals(): number {
    return 0; // NFTs have 0 decimals
  }

  // Total supply of NFTs
  public static totalSupply(): number {
    const supply = SmartContract.storage.get('totalSupply');
    return supply ? supply as number : 0;
  }

  // Get owner of token
  public static ownerOf(tokenId: ByteString): Hash160 {
    const owner = SmartContract.storage.get(tokenId);
    return owner as Hash160;
  }

  // Transfer NFT
  public static transfer(
    to: Hash160,
    tokenId: ByteString,
    data: any
  ): boolean {
    const owner = this.ownerOf(tokenId);
    
    // Verify caller is owner
    if (!SmartContract.runtime.checkWitness(owner)) {
      return false;
    }

    // Update ownership
    SmartContract.storage.put(tokenId, to);

    // Emit transfer event
    SmartContract.events.Transfer(owner, to, 1, tokenId);

    return true;
  }

  // Mint new NFT
  public static mint(to: Hash160, tokenId: ByteString): boolean {
    // Check if token already exists
    const existingOwner = SmartContract.storage.get(tokenId);
    if (existingOwner) {
      return false; // Token already minted
    }

    // Store new token
    SmartContract.storage.put(tokenId, to);

    // Update total supply
    const supply = this.totalSupply();
    SmartContract.storage.put('totalSupply', supply + 1);

    // Emit transfer event
    SmartContract.events.Transfer(null, to, 1, tokenId);

    return true;
  }
}
```

## 🔨 Compile Smart Contract

### Compile Một Contract

```bash
# Compile sample contract
npx foy helloworld

# Compile tank token
npx foy tank

# Compile hovercraft NFT
npx foy hovercraft
```

Kết quả:
- `samples/<name>/build/<name>.nef` - Compiled contract
- `samples/<name>/build/<name>.manifest.json` - Contract manifest

### Compile Tất Cả Samples

```bash
npm run samples
```

## 🚀 Deploy Contract

### 1. Deploy Lên Neo-Express (Local TestNet)

```bash
# Start neo-express
neoxp run

# Create wallet
neoxp wallet create myWallet

# Deploy contract
neoxp contract deploy samples/mycontract/build/mycontract.nef myWallet
```

### 2. Deploy Lên TestNet

```bash
# Using neo-cli or neo-express
neoxp contract deploy samples/mycontract/build/mycontract.nef \
  --rpc https://testnet1.neo.coz.io:443 \
  --wallet your-wallet.json
```

Sau khi deploy, bạn sẽ nhận được **Contract Hash** (ví dụ: `0x1234567890abcdef...`)

## 🔗 Integrate Với Frontend (neo-spoon-vibe-coding-app)

### 1. Lấy Contract Hash Sau Khi Deploy

```bash
# Contract hash sẽ hiện sau khi deploy thành công
Contract deployed: 0x1234567890abcdef1234567890abcdef12345678
```

### 2. Cập Nhật cpm.yaml

```yaml
contracts:
  - label: My Token
    script-hash: 0x1234567890abcdef1234567890abcdef12345678
    source-network: testnet
    generate-sdk: true
```

### 3. Generate TypeScript SDK

```bash
cd /home/uydev/code/neo-spoon-vibe-coding-app

# Download manifest from deployed contract
cpm download manifest \
  -c 0x1234567890abcdef1234567890abcdef12345678 \
  -N https://testnet1.neo.coz.io:443

# Generate TypeScript SDK
cpm generate ts \
  -m contract.manifest.json \
  -c 0x1234567890abcdef1234567890abcdef12345678 \
  -o app/contracts

# Cleanup
rm contract.manifest.json
```

### 4. Sử Dụng Trong Frontend

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

// Call contract methods
const symbol = await token.symbol();
const balance = await token.balanceOf({ account: myAddress });
```

## 🔄 Complete Workflow

```
1. Viết Contract (TypeScript)
   ↓
2. Compile (neo-devpack-ts)
   → Tạo .nef + .manifest.json
   ↓
3. Deploy lên Blockchain
   → Nhận Contract Hash
   ↓
4. Generate SDK (CPM)
   → Tạo TypeScript SDK
   ↓
5. Sử Dụng trong Frontend
   → Import và call methods
```

## 📚 Contract Development Best Practices

### 1. Storage Management

```typescript
// Good: Use constants for keys
private static readonly KEY_TOTAL_SUPPLY = 'totalSupply';

public static getTotalSupply(): number {
  return SmartContract.storage.get(this.KEY_TOTAL_SUPPLY) as number;
}
```

### 2. Access Control

```typescript
// Check if caller is contract owner
public static mint(to: Hash160, amount: number): boolean {
  const owner = SmartContract.storage.get('owner') as Hash160;
  
  if (!SmartContract.runtime.checkWitness(owner)) {
    throw new Error('Only owner can mint');
  }
  
  // Mint logic...
  return true;
}
```

### 3. Event Emission

```typescript
// Emit events for important state changes
public static transfer(from: Hash160, to: Hash160, amount: number): boolean {
  // Transfer logic...
  
  // Emit event
  SmartContract.events.Transfer(from, to, amount);
  
  return true;
}
```

### 4. Input Validation

```typescript
public static transfer(from: Hash160, to: Hash160, amount: number): boolean {
  // Validate inputs
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  if (!to) {
    throw new Error('Invalid recipient');
  }
  
  // Transfer logic...
}
```

## 🧪 Testing Contracts

### Using Neo-Express Batch Files

Tạo file `express.batch` trong thư mục contract:

```batch
# Create test wallet
wallet create test-wallet

# Transfer GAS for deployment
transfer gas genesis test-wallet 1000

# Deploy contract
contract deploy mycontract.nef test-wallet

# Invoke contract methods
contract invoke mycontract.nef setMessage "Hello World"
contract invoke mycontract.nef getMessage
```

Chạy test:

```bash
npx foy mycontract
# Tự động chạy express.batch nếu có
```

## 📖 Available Samples

Neo-devpack-ts đi kèm với các samples:

### 1. Hello World
- **File**: `samples/helloworld/helloworld.ts`
- **Mục đích**: Contract đơn giản nhất để học
- **Features**: Storage get/set

### 2. Tank (NEP-17 Token)
- **File**: `samples/tank/tank.ts`
- **Mục đích**: Fungible token standard
- **Features**: transfer, mint, balanceOf, totalSupply

### 3. Hovercraft (NEP-11 NFT)
- **File**: `samples/hovercraft/hovercraft.ts`
- **Mục đích**: Non-fungible token standard
- **Features**: mint NFT, transfer NFT, ownerOf

## 🔧 Troubleshooting

### Contract Compilation Errors

```bash
# Clean build artifacts
npm run clean

# Rebuild devpack
npm run build

# Try compiling again
npx foy mycontract
```

### Deployment Issues

**Problem**: "Insufficient GAS"
```bash
# Transfer more GAS to your wallet
neoxp transfer gas genesis myWallet 1000
```

**Problem**: "Contract already exists"
```bash
# Use update instead of deploy, or deploy with different parameters
```

### SDK Generation Issues

**Problem**: "Contract not found"
```bash
# Wait a few blocks after deployment
# Verify contract hash is correct
neoxp contract get <hash>
```

## 📚 Resources

### Official Documentation
- [neo-devpack-ts GitHub](https://github.com/N3developertoolkit/neo-devpack-ts)
- [NEO Smart Contract Docs](https://docs.neo.org/docs/en-us/develop/write/basics.html)
- [NEP-17 Standard](https://github.com/neo-project/proposals/blob/master/nep-17.mediawiki)
- [NEP-11 Standard](https://github.com/neo-project/proposals/blob/master/nep-11.mediawiki)

### Tools
- [Neo-Express](https://github.com/neo-project/neo-express) - Local blockchain
- [Neo-CLI](https://github.com/neo-project/neo-node) - Full node
- [CPM](https://github.com/CityOfZion/cpm) - SDK generator

### Community
- [NEO Discord](https://discord.io/neo)
- [NEO Developer Portal](https://developers.neo.org/)

## 🎯 Next Steps

1. **Clone neo-devpack-ts** và chạy samples
2. **Modify sample contracts** để hiểu cách hoạt động
3. **Viết contract của bạn** dựa trên templates
4. **Deploy lên neo-express** để test
5. **Deploy lên TestNet** khi đã sẵn sàng
6. **Generate SDK** và integrate với frontend
7. **Deploy lên MainNet** cho production

---

## 💡 Tips

- Start với Hello World sample trước
- Test kỹ trên neo-express trước khi deploy TestNet
- Luôn backup wallet và private keys
- Document contract methods rõ ràng
- Emit events cho mọi state changes quan trọng
- Implement proper access control
- Validate all inputs
- Test edge cases kỹ càng

---

**Happy Smart Contract Development!** 🚀

