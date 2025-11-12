Hướng dẫn AI Setup CPM + WalletConnect tại /test
Mục tiêu: Tạo trang /test để gọi NEO Token contract bằng TypeScript SDK tự sinh (CPM) + WalletConnect
→ AI có thể đọc & tự động setup → Chạy trong 10 phút

1. Cài CPM & Sinh SDK (1 lệnh)
bash# Cài CPM toàn cục
pnpm add -g @cityofzion/cpm

# Tạo config CPM
cpm init
File cpm.yaml (dán nguyên vào root)
yamldefaults:
  contract-source-network: testnet
  contract-generate-sdk: true
  contract-download: false
  off-chain:
    languages:
      - ts
    destinations:
      ts: src/contracts

contracts:
  - label: NEO Token
    script-hash: '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'

networks:
  - label: testnet
    hosts:
      - 'https://testnet1.neo.coz.io:443'
      - 'http://seed1.neo.org:20332'
bash# Sinh SDK
cpm run
Kết quả:
src/contracts/neotoken/ → có index.ts, NeoToken.ts

2. Cài WalletConnect + Neon DappKit
bashpnpm add @cityofzion/wallet-connect-sdk-core @cityofzion/neon-dappkit @cityofzion/neon-dappkit-types

3. Tạo trang /test
File: app/routes/test.tsx
tsximport { NeoToken } from '~/contracts/neotoken'
import { NeonInvoker } from '@cityofzion/neon-dappkit'
import WcSdk from '@cityofzion/wallet-connect-sdk-core'
import { useEffect, useState } from 'react'

let wcSdk: any
let neonInvoker: any

export default function TestPage() {
  const [info, setInfo] = useState('')
  const [account, setAccount] = useState('')

  // Khởi tạo invoker
  useEffect(() => {
    async function init() {
      neonInvoker = await NeonInvoker.init({
        rpcAddress: NeonInvoker.TESTNET
      })

      wcSdk = await WcSdk.init({
        projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Thay bằng ID thật
        metadata: { name: 'Bolt Test', url: 'http://localhost:3000' }
      })
    }
    init()
  }, [])

  // Lấy invoker phù hợp
  const getInvoker = () => wcSdk?.isConnected() ? wcSdk : neonInvoker

  // Gọi contract
  const getTokenInfo = async () => {
    const neo = new NeoToken({
      scriptHash: NeoToken.SCRIPT_HASH,
      invoker: getInvoker()
    })

    const [symbol, decimals, supply] = await Promise.all([
      neo.symbol(),
      neo.decimals(),
      neo.totalSupply()
    ])

    setInfo(`${symbol} | ${decimals} decimals | ${supply} supply`)
  }

  // Kết nối ví
  const connectWallet = async () => {
    await wcSdk.connect()
    const accounts = await wcSdk.getAccountAddress()
    setAccount(accounts[0])
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>NEO Token Test (CPM + WalletConnect)</h1>

      <button onClick={connectWallet} disabled={wcSdk?.isConnected()}>
        {wcSdk?.isConnected() ? `Connected: ${account.slice(0, 8)}...` : 'Connect Wallet'}
      </button>

      <br /><br />

      <button onClick={getTokenInfo}>
        Lấy thông tin NEO Token
      </button>

      <pre style={{ marginTop: 20, background: '#f0f0f0', padding: 10 }}>
        {info || 'Chưa có dữ liệu'}
      </pre>
    </div>
  )
}

4. Tạo .env (nếu cần)
envWALLETCONNECT_PROJECT_ID=a9ff54e3d56a52230ed8767db4d4a810
Lấy Project ID tại: https://cloud.walletconnect.com

5. Chạy dev
bashpnpm dev
Truy cập: http://localhost:3000/test

Kết quả mong đợi

















Hành độngKết quảBấm Connect WalletMở OneGate / NeoLine → kết nốiBấm Lấy thông tinHiển thị: `NEO

Cập nhật SDK (khi contract thay đổi)
bashcpm run
→ Tự động cập nhật src/contracts/neotoken

Tóm tắt lệnh AI có thể chạy
bashpnpm add -g @cityofzion/cpm
cpm init
# → Dán cpm.yaml
cpm run
pnpm add @cityofzion/wallet-connect-sdk-core @cityofzion/neon-dappkit @cityofzion/neon-dappkit-types
# → Tạo app/routes/test.tsx
pnpm dev

AI chỉ cần đọc file này → tự động setup CPM + WalletConnect tại /test → Done!