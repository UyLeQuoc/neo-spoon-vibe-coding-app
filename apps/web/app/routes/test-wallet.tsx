import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { VibeCodingAppPaymentContract } from '~/contracts/vibecodingapppaymentcontract'
import { useNeoLineN3 } from '~/lib/neolineN3TS'

export const meta: MetaFunction = () => {
  return [{ title: 'NeoLine Wallet Test - Payment Contract' }]
}

interface PaymentEvent {
  txId: string
  blockIndex: number
  from: string
  to: string
  amount: number
  timestamp: number
}

const RPC_URL = 'http://seed3t5.neo.org:20332'

export default function TestWalletPage() {
  const { neoline, isInitialized, account, balance, error, connect, disconnect } = useNeoLineN3()
  const [info, setInfo] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [lastBlock, setLastBlock] = useState<number | null>(null)

  // Format balance display
  const balanceDisplay =
    balance && account
      ? (() => {
          const gasBalance = balance[account]?.find(b => b.contract === '0xd2a4cff31913016155e38e474a2c06d08be276cf')
          return gasBalance ? `${parseFloat(gasBalance.amount).toFixed(4)} GAS` : '0 GAS'
        })()
      : null

  // Connect wallet via NeoLine
  async function connectWallet() {
    setIsConnecting(true)
    try {
      await connect()
      setInfo('Wallet connected successfully!')
    } catch (err: any) {
      const errorMessage = err?.description || err?.message || 'Failed to connect wallet'
      if (err?.type === 'CONNECTION_DENIED') {
        setInfo('Connection denied. Please approve the connection in NeoLine.')
      } else if (err?.type === 'NO_PROVIDER') {
        setInfo('No provider available. Please install NeoLine extension.')
      } else {
        setInfo(`Connection failed: ${errorMessage}`)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect wallet
  function disconnectWallet() {
    disconnect()
    setInfo('Wallet disconnected')
  }

  // Read PaymentReceived events from blockchain
  async function readDepositEvents() {
    if (!isInitialized || !neoline) {
      setInfo('SDK not initialized yet. Please wait...')
      return
    }

    setIsLoading(true)
    try {
      const contractHash = VibeCodingAppPaymentContract.SCRIPT_HASH

      // Get current block count (still use RPC as NeoLine SDK doesn't have getBlockCount)
      const blockCountResponse = await fetch(RPC_URL, {
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
          // Get block by index using NeoLine SDK
          const blockData = await neoline.getBlock({ blockHeight: blockIndex })

          if (!blockData || !blockData.tx || blockData.tx.length === 0) {
            continue
          }

          // Check each transaction in the block
          for (const txHash of blockData.tx) {
            try {
              // Get application log for this transaction using NeoLine SDK
              const logData = await neoline.getApplicationLog({ txid: txHash })

              if (!logData || !logData.executions) {
                continue
              }

              // Check each execution for events
              for (const execution of logData.executions) {
                if (!execution.notifications) continue

                // NeoLine SDK returns notifications instead of events
                for (const notification of execution.notifications) {
                  // Check if this is a PaymentReceived event from our contract
                  if (
                    notification.contract === contractHash &&
                    notification.eventname === 'PaymentReceived' &&
                    notification.state &&
                    notification.state.value
                  ) {
                    // Parse event data: [from, to, amount]
                    const values = notification.state.value
                    if (values.length >= 3) {
                      // Extract values from notification state
                      const fromValue = values[0]
                      const toValue = values[1]
                      const amountValue = values[2]

                      // Handle different value formats
                      const from =
                        typeof fromValue === 'object' && 'value' in fromValue
                          ? (fromValue.value as string)
                          : (fromValue as string) || ''
                      const to =
                        typeof toValue === 'object' && 'value' in toValue
                          ? (toValue.value as string)
                          : (toValue as string) || ''
                      const amountStr =
                        typeof amountValue === 'object' && 'value' in amountValue
                          ? (amountValue.value as string)
                          : (amountValue as string) || '0'
                      const amount = parseInt(amountStr, 10)

                      foundEvents.push({
                        txId: txHash,
                        blockIndex: blockIndex,
                        from: from,
                        to: to,
                        amount: amount,
                        timestamp: blockData.time * 1000 // Convert to milliseconds
                      })
                    }
                  }
                }
              }
            } catch {}
          }
        } catch (error) {
          console.error(`Error reading block ${blockIndex}:`, error)
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

  // Make a test deposit (transfer GAS to contract)
  async function makeDeposit() {
    if (!neoline || !account) {
      setInfo('Please connect wallet first')
      return
    }

    setIsLoading(true)
    setInfo('Preparing deposit transaction...\n\nPlease approve the transaction in NeoLine.')

    try {
      const contractHash = VibeCodingAppPaymentContract.SCRIPT_HASH
      const amountInSmallestUnit = 10000000 // 0.1 GAS (8 decimals)

      // Convert address to scriptHash for signers and args
      let signerAccount = account
      let fromScriptHash = account

      if (account.startsWith('N')) {
        // Convert address to scriptHash
        try {
          const scriptHashResult = await neoline.AddressToScriptHash({ address: account })
          const scriptHash = scriptHashResult.scriptHash
          signerAccount = scriptHash
          fromScriptHash = scriptHash
        } catch (error) {
          console.warn('Failed to convert address to scriptHash:', error)
          setInfo('Error: Failed to convert address to scriptHash')
          return
        }
      }

      // Format contract hash (ensure it's lowercase without 0x prefix for Hash160)
      let formattedContractHash = contractHash
      if (formattedContractHash.startsWith('0x')) {
        formattedContractHash = formattedContractHash.slice(2)
      }
      formattedContractHash = formattedContractHash.toLowerCase()

      // Transfer GAS to the payment contract using invoke
      const result = await neoline.invoke({
        scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf', // GAS Token
        operation: 'transfer',
        args: [
          {
            type: 'Hash160',
            value: fromScriptHash
          },
          {
            type: 'Hash160',
            value: formattedContractHash
          },
          {
            type: 'Integer',
            value: amountInSmallestUnit.toString()
          },
          {
            type: 'Array',
            value: []
          }
        ],
        signers: [
          {
            account: signerAccount,
            scopes: 1
          }
        ],
        fee: '0.0001'
      })

      setInfo(`✅ Deposit transaction sent!\nTX ID: ${result.txid}\n\nWaiting for block confirmation...`)

      // Wait a bit then refresh events
      setTimeout(async () => {
        setInfo('Scanning for new deposit events...')
        await readDepositEvents()
        setInfo(`✅ Deposit completed! Check the events table below.`)
      }, 5000)
    } catch (error: any) {
      console.error('Error making deposit:', error)

      let errorMessage = 'Unknown error'
      if (error?.description) {
        errorMessage = error.description
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error?.toString) {
        errorMessage = error.toString()
      }

      // Check for specific error types
      if (error?.type === 'CANCELED' || errorMessage.includes('cancel')) {
        setInfo(`❌ Transaction Cancelled\n\nThe transaction was cancelled in NeoLine.\nYou can try again when ready.`)
      } else if (
        error?.type === 'INSUFFICIENT_FUNDS' ||
        errorMessage.includes('insufficient') ||
        errorMessage.includes('balance')
      ) {
        setInfo(
          `❌ Insufficient Balance\n\nYou don't have enough GAS to complete this transaction.\nPlease ensure you have at least 0.1 GAS + network fees.`
        )
      } else if (error?.type === 'RPC_ERROR') {
        setInfo(`❌ RPC Error\n\nThere was an error broadcasting the transaction.\nPlease try again.`)
      } else {
        setInfo(
          `❌ Error: ${errorMessage}\n\nPlease check:\n- Wallet is connected\n- You have enough GAS\n- Transaction was approved in NeoLine\n- Network connection is stable`
        )
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

  const isConnected = !!account

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
    return `${(amount / 100000000).toFixed(8)} GAS`
  }

  // Format timestamp
  function formatTimestamp(timestamp: number) {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#333' }}>
        💰 NeoLine Wallet Test - Payment Contract
      </h1>

      {!isInitialized && (
        <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px', marginBottom: '20px' }}>
          ⏳ Initializing NeoLine N3 SDK... Please make sure NeoLine extension is installed.
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '10px',
            background: '#f8d7da',
            borderRadius: '4px',
            marginBottom: '20px',
            color: '#721c24'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Wallet Connection</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              {isConnecting ? 'Connecting...' : 'Connect NeoLine Wallet'}
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
              {balanceDisplay && (
                <div
                  style={{
                    padding: '10px 20px',
                    background: '#e3f2fd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  Balance: {balanceDisplay}
                </div>
              )}
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
        {!isInitialized && (
          <div
            style={{ marginTop: '10px', padding: '10px', background: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}
          >
            ⚠️ Please install{' '}
            <a href="https://neoline.io/" target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3' }}>
              NeoLine Extension
            </a>{' '}
            to use this page.
          </div>
        )}
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
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>PaymentReceived Events ({events.length})</h2>
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
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>TX ID</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Block</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>From</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>To</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Amount</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Time</th>
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
                    <td style={{ padding: '10px', fontSize: '11px' }}>{formatTimestamp(event.timestamp)}</td>
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
            <strong>Network:</strong> NEO TestNet (via NeoLine)
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
            <strong>Mode:</strong> {isConnected ? 'Wallet Connected (NeoLine)' : 'Read-Only'}
          </p>
        </div>
      )}
    </div>
  )
}
