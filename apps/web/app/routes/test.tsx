import { NeonInvoker } from '@cityofzion/neon-dappkit'
import WcSdk from '@cityofzion/wallet-connect-sdk-core'
import type { MetaFunction } from '@remix-run/cloudflare'
import { useEffect, useState } from 'react'
import { NeoToken } from '~/contracts/neotoken'

// Version enum for message signing
enum Version {
  DEFAULT = 1,
  WITHOUT_SALT = 2
}

export const meta: MetaFunction = () => {
  return [{ title: 'NEO Token Test - CPM + WalletConnect' }]
}

let wcSdk: any
let neonInvoker: any

export default function TestPage() {
  const [info, setInfo] = useState('')
  const [account, setAccount] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState('')

  // Initialize invoker and WalletConnect
  useEffect(() => {
    async function init() {
      try {
        // Initialize Neon Invoker for TestNet
        neonInvoker = await NeonInvoker.init({
          rpcAddress: NeonInvoker.TESTNET
        })

        // Initialize WalletConnect SDK
        wcSdk = await WcSdk.init({
          projectId: 'a9ff54e3d56a52230ed8767db4d4a810', // From plan.md
          relayUrl: 'wss://relay.walletconnect.com', // WalletConnect's official relay server
          metadata: {
            name: 'NeoZero.new Extended',
            description: 'NEO Token Test Application',
            url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
            icons: ['https://avatars.githubusercontent.com/u/37784886']
          }
        })

        // Listen for session changes
        wcSdk.emitter.on('session', (session: any) => {
          if (session) {
            const address = wcSdk.getAccountAddress()
            if (address) {
              setAccount(address)
              setInfo('Wallet connected successfully!')
            }
          } else {
            setAccount('')
            setInfo('Wallet disconnected')
          }
        })

        // Restore previous session if exists
        await wcSdk.manageSession()

        setIsInitialized(true)
      } catch (error) {
        console.error('Initialization error:', error)
        setInfo(`Initialization failed: ${error}`)
      }
    }

    if (typeof window !== 'undefined') {
      init()
    }
  }, [])

  // Get the appropriate invoker (connected wallet or read-only)
  function getInvoker() {
    return wcSdk?.isConnected() ? wcSdk : neonInvoker
  }

  // Fetch NEO Token information using generated SDK
  async function getTokenInfo() {
    if (!isInitialized) {
      setInfo('SDK not initialized yet. Please wait...')
      return
    }

    setIsLoading(true)
    try {
      const invoker = getInvoker()

      // Create NeoToken instance with generated SDK
      const neo = new NeoToken({
        scriptHash: NeoToken.SCRIPT_HASH,
        invoker: invoker
      })

      // Call contract methods using the clean SDK API
      const [symbol, decimals, supply] = await Promise.all([neo.symbol(), neo.decimals(), neo.totalSupply()])

      setInfo(`Token: ${symbol}\nDecimals: ${decimals}\nTotal Supply: ${supply}`)
    } catch (error) {
      console.error('Error fetching token info:', error)
      setInfo(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Connect wallet via WalletConnect
  async function connectWallet() {
    if (!isInitialized) {
      setInfo('SDK not initialized yet. Please wait...')
      return
    }

    setIsConnecting(true)
    try {
      // Connect with specified methods we need
      await wcSdk.connect('neo3:testnet', [
        'invokeFunction',
        'testInvoke',
        'signMessage',
        'verifyMessage',
        'traverseIterator',
        'getWalletInfo'
      ])

      // The account will be set by the session listener
    } catch (error) {
      console.error('Error connecting wallet:', error)
      setInfo(`Connection failed: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect wallet
  async function disconnectWallet() {
    try {
      await wcSdk.disconnect()
      // The account state will be cleared by the session listener
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
      setInfo(`Disconnect error: ${error}`)
    }
  }

  // Get my GAS balance
  async function getMyBalance() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const resp = await wcSdk.testInvoke({
        invocations: [
          {
            scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS Token
            operation: 'balanceOf',
            args: [
              {
                type: 'Hash160',
                value: wcSdk.getAccountAddress() ?? ''
              }
            ]
          }
        ],
        signers: [{ scopes: 1 }]
      })

      console.log(resp)
      setResult(JSON.stringify(resp, null, 2))
    } catch (error) {
      console.error('Error getting balance:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Transfer GAS
  async function transferGas() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const resp = await wcSdk.invokeFunction({
        invocations: [
          {
            scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
            operation: 'transfer',
            args: [
              {
                type: 'Hash160',
                value: wcSdk.getAccountAddress() ?? ''
              },
              {
                type: 'Hash160',
                value: 'NbnjKGMBJzJ6j5PHeYhjJDaQ5Vy5UYu4Fv'
              },
              {
                type: 'Integer',
                value: 100000000 // 1 GAS
              },
              {
                type: 'Array',
                value: []
              }
            ]
          }
        ],
        signers: [{ scopes: 1 }]
      })

      console.log(resp)
      setResult(JSON.stringify(resp, null, 2))
    } catch (error) {
      console.error('Error transferring GAS:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Transfer GAS with extra fees
  async function transferGasWithExtraFee() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const resp = await wcSdk.invokeFunction({
        invocations: [
          {
            scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
            operation: 'transfer',
            args: [
              {
                type: 'Hash160',
                value: wcSdk.getAccountAddress() ?? ''
              },
              {
                type: 'Hash160',
                value: 'NbnjKGMBJzJ6j5PHeYhjJDaQ5Vy5UYu4Fv'
              },
              {
                type: 'Integer',
                value: 100000000
              },
              {
                type: 'Array',
                value: []
              }
            ]
          }
        ],
        signers: [{ scopes: 1 }],
        extraSystemFee: 1000000,
        extraNetworkFee: 100000
      })

      console.log(resp)
      setResult(JSON.stringify(resp, null, 2))
    } catch (error) {
      console.error('Error transferring GAS with extra fee:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Multi invoke failing example
  async function multiInvokeFailing() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const resp = await wcSdk.invokeFunction({
        invocations: [
          {
            scriptHash: '0x010101c0775af568185025b0ce43cfaa9b990a2a',
            operation: 'verify',
            args: [],
            abortOnFail: true
          },
          {
            scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
            operation: 'transfer',
            args: [
              {
                type: 'Hash160',
                value: wcSdk.getAccountAddress() ?? ''
              },
              {
                type: 'Hash160',
                value: 'NbnjKGMBJzJ6j5PHeYhjJDaQ5Vy5UYu4Fv'
              },
              {
                type: 'Integer',
                value: 100000000
              },
              {
                type: 'Array',
                value: []
              }
            ],
            abortOnFail: true
          }
        ],
        signers: [{ scopes: 1 }]
      })

      console.log(resp)
      setResult(JSON.stringify(resp, null, 2))
    } catch (error) {
      console.error('Multi invoke failed (expected):', error)
      setResult(`Expected failure: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Sign and verify message
  async function signAndVerify() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const signResp = await wcSdk.signMessage({
        message: 'Hello from NeoZero.new Extended!',
        version: Version.DEFAULT
      })

      console.log('Sign response:', signResp)

      const verifyResp = await wcSdk.verifyMessage(signResp)

      console.log('Verify response:', verifyResp)
      setResult(`Sign:\n${JSON.stringify(signResp, null, 2)}\n\nVerify:\n${JSON.stringify(verifyResp, null, 2)}`)
    } catch (error) {
      console.error('Error signing/verifying:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Sign without salt and verify
  async function signWithoutSaltAndVerify() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const signResp = await wcSdk.signMessage({
        message: 'Hello from NeoZero.new Extended!',
        version: Version.WITHOUT_SALT
      })

      console.log('Sign response:', signResp)

      const verifyResp = await wcSdk.verifyMessage(signResp)

      console.log('Verify response:', verifyResp)
      setResult(`Sign:\n${JSON.stringify(signResp, null, 2)}\n\nVerify:\n${JSON.stringify(verifyResp, null, 2)}`)
    } catch (error) {
      console.error('Error signing/verifying:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Verify failing example
  async function verifyFailing() {
    setIsLoading(true)
    try {
      const resp = await wcSdk.verifyMessage({
        data: '4fe1b478cf76564b2133bdff9ba97d8a360ce36d0511918931cda207c2ce589dfc07ec5d8b93ce7c3b70fc88b676cc9e08f9811bf0d5b5710a20f10c58191bfb',
        messageHex:
          '010001f05c3733336365623464346538666664633833656363366533356334343938393939436172616c686f2c206d756c65712c206f2062616775697520656820697373756d65726d6f2074616978206c696761646f206e61206d697373e36f3f0000',
        publicKey: '031757edb62014dea820a0b33a156f6a59fc12bd966202f0e49357c81f26f5de34',
        salt: '733ceb4d4e8ffdc83ecc6e35c4498999'
      })

      console.log(resp)
      setResult(JSON.stringify(resp, null, 2))
    } catch (error) {
      console.error('Verify failed (expected):', error)
      setResult(`Expected failure: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Verify message example
  async function verifyMessage() {
    setIsLoading(true)
    try {
      const resp = await wcSdk.verifyMessage({
        publicKey: '031757edb62014dea820a0b33a156f6a59fc12bd966202f0e49357c81f26f5de34',
        data: 'aeb234ed1639e9fcc95a102633b1c70ca9f9b97e9592cc74bfc40cbc7fefdb19ae8c6b49ebd410dbcbeec6b5906e503d528e34cd5098cc7929dbcbbaf23c5d77',
        salt: '052a55a8d56b73b342a8e41da3050b09',
        messageHex:
          '010001f0a0303532613535613864353662373362333432613865343164613330353062303965794a68624763694f694a49557a49314e694973496e523563434936496b705856434a392e65794a6c654841694f6a45324e444d304e7a63324e6a4d73496d6c68644349364d5459304d7a4d354d5449324d33302e7253315f73735230364c426778744831504862774c306d7a6557563950686d5448477a324849524f4a4f340000'
      })

      console.log(resp)
      setResult(JSON.stringify(resp, null, 2))
    } catch (error) {
      console.error('Error verifying:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Traverse iterator example
  async function traverseIterator() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const resp = await wcSdk.testInvoke({
        invocations: [
          {
            operation: 'getAllCandidates',
            scriptHash: 'ef4073a0f2b305a38ec4050e4d3d28bc40ea63f5', // NEO Token
            args: []
          }
        ],
        signers: [{ scopes: 1 }]
      })

      const sessionId = resp.session
      const iteratorId = resp.stack[0].id

      const resp2 = await wcSdk.traverseIterator(sessionId, iteratorId, 10)

      console.log(resp2)
      setResult(JSON.stringify(resp2, null, 2))
    } catch (error) {
      console.error('Error traversing iterator:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Get wallet info
  async function getWalletInfo() {
    if (!wcSdk?.isConnected()) {
      setResult('Please connect wallet first')
      return
    }

    setIsLoading(true)
    try {
      const resp = await wcSdk.getWalletInfo()

      console.log(resp)
      setResult(JSON.stringify(resp, null, 2))
    } catch (error) {
      console.error('Error getting wallet info:', error)
      setResult(`Error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const isConnected = wcSdk?.isConnected()

  // Helper function for button styling
  function buttonStyle(enabled: boolean, color: string = '#2196F3') {
    return {
      padding: '10px 15px',
      background: enabled ? color : '#ccc',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: enabled ? 'pointer' : 'not-allowed',
      fontSize: '13px',
      fontWeight: '500' as const,
      transition: 'all 0.2s'
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        🔗 NEO Token Test (WalletConnect + Neon DappKit)
      </h1>

      {!isInitialized && (
        <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px', marginBottom: '20px' }}>
          ⏳ Initializing SDK...
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Wallet Connection</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isConnected ? (
            <button
              onClick={connectWallet}
              disabled={!isInitialized || isConnecting}
              style={{
                padding: '10px 20px',
                background: isInitialized ? '#4CAF50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isInitialized ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <>
              <div
                style={{
                  padding: '10px 20px',
                  background: '#e8f5e9',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                ✓ Connected: {account.slice(0, 8)}...{account.slice(-6)}
              </div>
              <button
                onClick={disconnectWallet}
                style={{
                  padding: '10px 20px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Contract Interaction</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <button onClick={getTokenInfo} disabled={!isInitialized || isLoading} style={buttonStyle(isInitialized)}>
            📊 Get NEO Token Info
          </button>
          <button onClick={getMyBalance} disabled={!isConnected || isLoading} style={buttonStyle(isConnected)}>
            💰 Get My Balance
          </button>
          <button onClick={getWalletInfo} disabled={!isConnected || isLoading} style={buttonStyle(isConnected)}>
            ℹ️ Get Wallet Info
          </button>
          <button onClick={traverseIterator} disabled={!isConnected || isLoading} style={buttonStyle(isConnected)}>
            🔄 Traverse Iterator
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Transfer Operations (Requires Wallet)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
          <button
            onClick={transferGas}
            disabled={!isConnected || isLoading}
            style={buttonStyle(isConnected, '#FF9800')}
          >
            💸 Transfer 1 GAS
          </button>
          <button
            onClick={transferGasWithExtraFee}
            disabled={!isConnected || isLoading}
            style={buttonStyle(isConnected, '#FF9800')}
          >
            💸+ Transfer GAS (Extra Fee)
          </button>
          <button
            onClick={multiInvokeFailing}
            disabled={!isConnected || isLoading}
            style={buttonStyle(isConnected, '#f44336')}
          >
            ⚠️ Multi Invoke (Failing)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Message Signing & Verification</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <button
            onClick={signAndVerify}
            disabled={!isConnected || isLoading}
            style={buttonStyle(isConnected, '#9C27B0')}
          >
            ✍️ Sign & Verify
          </button>
          <button
            onClick={signWithoutSaltAndVerify}
            disabled={!isConnected || isLoading}
            style={buttonStyle(isConnected, '#9C27B0')}
          >
            ✍️ Sign Without Salt
          </button>
          <button onClick={verifyMessage} disabled={isLoading} style={buttonStyle(true, '#673AB7')}>
            ✅ Verify Message
          </button>
          <button onClick={verifyFailing} disabled={isLoading} style={buttonStyle(true, '#f44336')}>
            ❌ Verify (Failing)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Results</h2>
        <pre
          style={{
            padding: '20px',
            background: '#f5f5f5',
            borderRadius: '4px',
            border: '1px solid #ddd',
            minHeight: '100px',
            maxHeight: '400px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            fontSize: '12px'
          }}
        >
          {result || info || 'No data yet. Try any of the functions above.'}
        </pre>
      </div>

      <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '4px', fontSize: '12px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>ℹ️ Info</h3>
        <p style={{ margin: '5px 0' }}>
          <strong>Network:</strong> NEO TestNet
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Contract:</strong> {NeoToken.SCRIPT_HASH}
        </p>
        <p style={{ margin: '5px 0' }}>
          <strong>Mode:</strong> {isConnected ? 'Wallet Connected' : 'Read-Only'}
        </p>
      </div>
    </div>
  )
}
