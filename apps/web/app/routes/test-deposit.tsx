import { NeonInvoker } from '@cityofzion/neon-dappkit'
import WcSdk from '@cityofzion/wallet-connect-sdk-core'
import type { MetaFunction } from '@remix-run/cloudflare'
import { useEffect, useState } from 'react'
import { VibeCodingAppPaymentContract } from '~/contracts/vibecodingapppaymentcontract'

export const meta: MetaFunction = () => {
  return [{ title: 'Deposit Events Test - Payment Contract' }]
}

let wcSdk: any
let neonInvoker: any

interface PaymentEvent {
  txId: string
  blockIndex: number
  from: string
  to: string
  amount: number
  timestamp: number
}

export default function TestDepositPage() {
  const [info, setInfo] = useState('')
  const [account, setAccount] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [lastBlock, setLastBlock] = useState<number | null>(null)

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
          projectId: 'a9ff54e3d56a52230ed8767db4d4a810',
          relayUrl: 'wss://relay.walletconnect.com',
          metadata: {
            name: 'NeoZero - Vibe Coding App',
            description: 'NeoZero - Vibe Coding App',
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


  // Read PaymentReceived events from blockchain
  async function readDepositEvents() {
    if (!isInitialized) {
      setInfo('SDK not initialized yet. Please wait...')
      return
    }

    setIsLoading(true)
    try {
      const contractHash = VibeCodingAppPaymentContract.SCRIPT_HASH
      const rpcUrl = NeonInvoker.TESTNET

      // Get current block count
      const blockCountResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getblockcount',
          params: []
        })
      })
      const blockCountData = (await blockCountResponse.json()) as { result: number }
      const currentBlock = blockCountData.result

      // Start from contract deployment block (11085909) or last 100 blocks
      const startBlock = Math.max(11085909, currentBlock - 100)
      const foundEvents: PaymentEvent[] = []

      setInfo(`Scanning blocks ${startBlock} to ${currentBlock}...`)

      // Scan blocks for transactions
      for (let blockIndex = startBlock; blockIndex <= currentBlock; blockIndex++) {
        try {
          // Get block by index
          const blockResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getblock',
              params: [blockIndex, 1] // 1 = verbose
            })
          })
          const blockData = (await blockResponse.json()) as {
            result?: { tx?: Array<{ hash: string }>; time: number }
          }

          if (!blockData.result || !blockData.result.tx) {
            continue
          }

          // Check each transaction in the block
          for (const tx of blockData.result.tx) {
            try {
              // Get application log for this transaction
              const logResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'getapplicationlog',
                  params: [tx.hash]
                })
              })
              const logData = (await logResponse.json()) as {
                result?: {
                  executions?: Array<{
                    events?: Array<{
                      contract: string
                      eventname: string
                      state?: {
                        value?: Array<{
                          value?: string
                        }>
                      }
                    }>
                  }>
                }
              }

              if (!logData.result || !logData.result.executions) {
                continue
              }

              // Check each execution for events
              for (const execution of logData.result.executions) {
                if (!execution.events) continue

                for (const event of execution.events) {
                  // Check if this is a PaymentReceived event from our contract
                  if (
                    event.contract === contractHash &&
                    event.eventname === 'PaymentReceived' &&
                    event.state &&
                    event.state.value
                  ) {
                    // Parse event data: [from, to, amount]
                    const values = event.state.value
                    if (values.length >= 3) {
                      const from = values[0].value || ''
                      const to = values[1].value || ''
                      const amount = parseInt(values[2].value || '0', 10)

                      foundEvents.push({
                        txId: tx.hash,
                        blockIndex: blockIndex,
                        from: from,
                        to: to,
                        amount: amount,
                        timestamp: blockData.result.time * 1000 // Convert to milliseconds
                      })
                    }
                  }
                }
              }
            } catch {
              // Skip transactions without logs (normal for non-contract transactions)
              continue
            }
          }
        } catch (error) {
          console.error(`Error reading block ${blockIndex}:`, error)
          continue
        }
      }

      // Sort events by block index (newest first)
      foundEvents.sort((a, b) => b.blockIndex - a.blockIndex)

      setEvents(foundEvents)
      setLastBlock(currentBlock)
      setInfo(`Found ${foundEvents.length} PaymentReceived event(s)`)
    } catch (error) {
      console.error('Error reading deposit events:', error)
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
      await wcSdk.connect('neo3:testnet', [
        'invokeFunction',
        'testInvoke',
        'signMessage',
        'verifyMessage',
        'traverseIterator',
        'getWalletInfo'
      ])
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
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
      setInfo(`Disconnect error: ${error}`)
    }
  }

  // Helper function to add timeout to promises
  function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ])
  }

  // Make a test deposit (transfer GAS to contract)
  async function makeDeposit() {
    if (!wcSdk?.isConnected()) {
      setInfo('Please connect wallet first')
      return
    }

    setIsLoading(true)
    setInfo('Preparing deposit transaction...')
    
    try {
      const contractHash = VibeCodingAppPaymentContract.SCRIPT_HASH
      const fromAddress = wcSdk.getAccountAddress()

      if (!fromAddress) {
        throw new Error('No wallet address found')
      }

      setInfo('Sending transaction to wallet for approval...\n\nPlease approve the transaction in your wallet.\nIf you reject it, the process will be cancelled.')

      // Add timeout of 5 minutes for wallet approval
      const invokePromise = wcSdk.invokeFunction({
        invocations: [
          {
            scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS Token
            operation: 'transfer',
            args: [
              {
                type: 'Hash160',
                value: fromAddress
              },
              {
                type: 'Hash160',
                value: contractHash
              },
              {
                type: 'Integer',
                value: 10000000 // 0.1 GAS (8 decimals)
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

      // Wrap with timeout (5 minutes)
      const resp = (await withTimeout(
        invokePromise,
        5 * 60 * 1000,
        'Transaction timeout: No response from wallet after 5 minutes. Please try again.'
      )) as { txid: string }

      setInfo(`✅ Deposit transaction sent!\nTX ID: ${resp.txid}\n\nWaiting for block confirmation...`)
      
      // Wait a bit then refresh events
      setTimeout(async () => {
        setInfo('Scanning for new deposit events...')
        await readDepositEvents()
        setInfo(`✅ Deposit completed! Check the events table below.`)
      }, 5000)
    } catch (error: any) {
      console.error('Error making deposit:', error)
      
      let errorMessage = 'Unknown error'
      if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.toString) {
        errorMessage = error.toString()
      }

      // Check for specific error types
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        setInfo(`⏱️ ${errorMessage}\n\nPossible reasons:\n- Transaction was not approved in wallet\n- Wallet app was closed\n- Network connection issue\n\nPlease try again.`)
      } else if (errorMessage.includes('reject') || errorMessage.includes('Rejected') || errorMessage.includes('User rejected')) {
        setInfo(`❌ Transaction Rejected\n\nThe transaction was rejected in your wallet.\nYou can try again when ready.`)
      } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        setInfo(`❌ Insufficient Balance\n\nYou don't have enough GAS to complete this transaction.\nPlease ensure you have at least 0.1 GAS + network fees.`)
      } else {
        setInfo(`❌ Error: ${errorMessage}\n\nPlease check:\n- Wallet is connected\n- You have enough GAS\n- Transaction was approved in wallet\n- Network connection is stable`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Cancel current operation
  function cancelOperation() {
    setIsLoading(false)
    setInfo('Operation cancelled. You can try again.')
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

  // Format address for display
  function formatAddress(address: string) {
    if (!address) return 'N/A'
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  // Format amount (GAS has 8 decimals)
  function formatAmount(amount: number) {
    return (amount / 100000000).toFixed(8) + ' GAS'
  }

  // Format timestamp
  function formatTimestamp(timestamp: number) {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        💰 Deposit Events Test - Payment Contract
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
                ✓ Connected: {formatAddress(account)}
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
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Actions</h2>
        {isLoading && (
          <div
            style={{
              padding: '10px',
              background: '#e3f2fd',
              borderRadius: '4px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>⏳</span>
              <span>Processing... Waiting for wallet response</span>
            </div>
            <button
              onClick={cancelOperation}
              style={{
                padding: '5px 15px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={readDepositEvents}
            disabled={!isInitialized || isLoading}
            style={buttonStyle(isInitialized && !isLoading)}
          >
            {isLoading ? '⏳ Loading...' : '📊 Read Deposit Events'}
          </button>
          <button
            onClick={makeDeposit}
            disabled={!isConnected || isLoading}
            style={buttonStyle(isConnected && !isLoading, '#FF9800')}
          >
            {isLoading ? '⏳ Processing...' : '💸 Make Test Deposit (0.1 GAS)'}
          </button>
        </div>
      </div>

      {info && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Status</h2>
          <pre
            style={{
              padding: '15px',
              background: '#f5f5f5',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '12px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {info}
          </pre>
        </div>
      )}

      {events.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
            PaymentReceived Events ({events.length})
          </h2>
          <div
            style={{
              background: '#fff',
              borderRadius: '4px',
              border: '1px solid #ddd',
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    TX ID
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Block
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    From
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    To
                  </th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                    Amount
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr
                    key={`${event.txId}-${index}`}
                    style={{ borderBottom: index < events.length - 1 ? '1px solid #eee' : 'none' }}
                  >
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px' }}>
                      {formatAddress(event.txId)}
                    </td>
                    <td style={{ padding: '10px' }}>{event.blockIndex}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px' }}>
                      {formatAddress(event.from)}
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px' }}>
                      {formatAddress(event.to)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatAmount(event.amount)}
                    </td>
                    <td style={{ padding: '10px', fontSize: '11px' }}>
                      {formatTimestamp(event.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lastBlock && (
        <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '4px', fontSize: '12px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>ℹ️ Info</h3>
          <p style={{ margin: '5px 0' }}>
            <strong>Network:</strong> NEO TestNet
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Contract:</strong> {VibeCodingAppPaymentContract.SCRIPT_HASH}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Last Scanned Block:</strong> {lastBlock}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Contract Deployment Block:</strong> 11085909
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Mode:</strong> {isConnected ? 'Wallet Connected' : 'Read-Only'}
          </p>
        </div>
      )}
    </div>
  )
}

