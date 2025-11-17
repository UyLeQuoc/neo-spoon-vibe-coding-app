import { useState } from 'react'
import type { Argument } from '~/lib/neolineN3TS'
import { useNeoLineN3 } from '~/lib/neolineN3TS'

interface TestResult {
  success: boolean
  data?: any
  error?: string
  timestamp: number
}

export default function TestSDKPage() {
  const { neoline, isInitialized, account, balance, error, connect, disconnect } = useNeoLineN3()
  const [activeTab, setActiveTab] = useState<string>('read')
  const [results, setResults] = useState<Record<string, TestResult>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  // Helper to execute and store results
  const executeTest = async (testId: string, testFn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [testId]: true }))
    try {
      const data = await testFn()
      setResults(prev => ({
        ...prev,
        [testId]: {
          success: true,
          data,
          timestamp: Date.now()
        }
      }))
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [testId]: {
          success: false,
          error: err?.description || err?.message || String(err),
          timestamp: Date.now()
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [testId]: false }))
    }
  }

  const getResult = (testId: string): TestResult | undefined => results[testId]

  // ==================== Read Methods ====================

  const TestGetProvider = () => {
    const testId = 'getProvider'
    const result = getResult(testId)

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getProvider()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Returns information about the dAPI provider, including name, website, version, and compatibility.
        </p>
        <button
          onClick={() => executeTest(testId, () => neoline?.getProvider())}
          disabled={!neoline || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestGetBalance = () => {
    const testId = 'getBalance'
    const result = getResult(testId)
    const [address, setAddress] = useState(account || '')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getBalance()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Returns balance of assets for the given account. If contracts array is empty, returns all balances.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Address:</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={account || 'Enter address'}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() =>
            executeTest(testId, () => neoline?.getBalance([{ address: address || account!, contracts: [] }]))
          }
          disabled={!neoline || !address || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && address ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && address ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestGetStorage = () => {
    const testId = 'getStorage'
    const result = getResult(testId)
    const [scriptHash, setScriptHash] = useState('')
    const [key, setKey] = useState('')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getStorage()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Reads the raw value in smart contract storage.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Script Hash:</label>
          <input
            type="text"
            value={scriptHash}
            onChange={e => setScriptHash(e.target.value)}
            placeholder="0x006b26dd0d2aa076b11082847a094772450f05af"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Key:</label>
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="token0"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() => executeTest(testId, () => neoline?.getStorage({ scriptHash, key }))}
          disabled={!neoline || !scriptHash || !key || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && scriptHash && key ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && scriptHash && key ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestInvokeRead = () => {
    const testId = 'invokeRead'
    const result = getResult(testId)
    const [scriptHash, setScriptHash] = useState('0xd2a4cff31913016155e38e474a2c06d08be276cf')
    const [operation, setOperation] = useState('balanceOf')
    const [argsJson, setArgsJson] = useState('[{"type":"Address","value":"NaUjKgf5vMuFt7Ffgfffcpc41uH3adx1jq"}]')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>invokeRead()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Executes a contract invocation in read-only mode. Returns script, state, gas_consumed, and stack.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Script Hash:</label>
          <input
            type="text"
            value={scriptHash}
            onChange={e => setScriptHash(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Operation:</label>
          <input
            type="text"
            value={operation}
            onChange={e => setOperation(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Args (JSON):</label>
          <textarea
            value={argsJson}
            onChange={e => setArgsJson(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontFamily: 'monospace'
            }}
          />
        </div>
        <button
          onClick={async () => {
            try {
              const args = JSON.parse(argsJson) as Argument[]
              if (!account) {
                alert('Please connect wallet first')
                return
              }
              const scriptHashResult = await neoline?.AddressToScriptHash({ address: account })
              executeTest(testId, () =>
                neoline?.invokeRead({
                  scriptHash,
                  operation,
                  args,
                  signers: [{ account: scriptHashResult.scriptHash, scopes: 1 }]
                })
              )
            } catch (err: any) {
              alert(err?.message || 'Invalid JSON for args')
            }
          }}
          disabled={!neoline || !account || !scriptHash || !operation || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && account && scriptHash && operation ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && account && scriptHash && operation ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestGetBlock = () => {
    const testId = 'getBlock'
    const result = getResult(testId)
    const [blockHeight, setBlockHeight] = useState('190')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getBlock()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Gets information about a specific block by height.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Block Height:</label>
          <input
            type="number"
            value={blockHeight}
            onChange={e => setBlockHeight(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() => executeTest(testId, () => neoline?.getBlock({ blockHeight: parseInt(blockHeight, 10) }))}
          disabled={!neoline || !blockHeight || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && blockHeight ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && blockHeight ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestGetTransaction = () => {
    const testId = 'getTransaction'
    const result = getResult(testId)
    const [txid, setTxid] = useState('')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getTransaction()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Gets information about a specific transaction by transaction ID.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Transaction ID:</label>
          <input
            type="text"
            value={txid}
            onChange={e => setTxid(e.target.value)}
            placeholder="0xe5a5fdacad0ba4e8d34d2fa0638357adb0f05e7fc902ec150739616320870f50"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() => executeTest(testId, () => neoline?.getTransaction({ txid }))}
          disabled={!neoline || !txid || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && txid ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && txid ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestGetApplicationLog = () => {
    const testId = 'getApplicationLog'
    const result = getResult(testId)
    const [txid, setTxid] = useState('')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getApplicationLog()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Gets the application log for a given transaction, including executions and notifications (events).
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Transaction ID:</label>
          <input
            type="text"
            value={txid}
            onChange={e => setTxid(e.target.value)}
            placeholder="0xe5a5fdacad0ba4e8d34d2fa0638357adb0f05e7fc902ec150739616320870f50"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() => executeTest(testId, () => neoline?.getApplicationLog({ txid }))}
          disabled={!neoline || !txid || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && txid ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && txid ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestAddressToScriptHash = () => {
    const testId = 'addressToScriptHash'
    const result = getResult(testId)
    const [address, setAddress] = useState(account || '')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>AddressToScriptHash()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Converts an N3 account address to script hash.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Address:</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={account || 'Enter N3 address'}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() => executeTest(testId, () => neoline?.AddressToScriptHash({ address }))}
          disabled={!neoline || !address || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && address ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && address ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  // ==================== Write Methods ====================

  const TestSend = () => {
    const testId = 'send'
    const result = getResult(testId)
    const [toAddress, setToAddress] = useState('')
    const [amount, setAmount] = useState('1')
    const [asset, setAsset] = useState('GAS')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>send()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Invokes a transfer of a specified amount of an asset from the connected account to another account.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>To Address:</label>
          <input
            type="text"
            value={toAddress}
            onChange={e => setToAddress(e.target.value)}
            placeholder="NaUjKgf5vMuFt7Ffgfffcpc41uH3adx1jq"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Asset:</label>
          <input
            type="text"
            value={asset}
            onChange={e => setAsset(e.target.value)}
            placeholder="GAS or contract hash"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Amount:</label>
          <input
            type="text"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="1"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() =>
            executeTest(testId, () =>
              neoline?.send({
                fromAddress: account!,
                toAddress,
                asset,
                amount,
                fee: '0.0001'
              })
            )
          }
          disabled={!neoline || !account || !toAddress || !amount || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && account && toAddress && amount ? '#FF9800' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && account && toAddress && amount ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Processing...' : 'Send Transaction'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestInvoke = () => {
    const testId = 'invoke'
    const result = getResult(testId)
    const [scriptHash, setScriptHash] = useState('0xd2a4cff31913016155e38e474a2c06d08be276cf')
    const [operation, setOperation] = useState('transfer')
    const [argsJson, setArgsJson] = useState(
      '[{"type":"Address","value":"NaUjKgf5vMuFt7Ffgfffcpc41uH3adx1jq"},{"type":"Address","value":"NaUjKgf5vMuFt7Ffgfffcpc41uH3adx1jq"},{"type":"Integer","value":"100000000"},{"type":"Any","value":null}]'
    )

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>invoke()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Invokes a generic execution of smart contracts. Requires wallet connection and user approval.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Script Hash:</label>
          <input
            type="text"
            value={scriptHash}
            onChange={e => setScriptHash(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Operation:</label>
          <input
            type="text"
            value={operation}
            onChange={e => setOperation(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Args (JSON):</label>
          <textarea
            value={argsJson}
            onChange={e => setArgsJson(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontFamily: 'monospace'
            }}
          />
        </div>
        <button
          onClick={async () => {
            try {
              const args = JSON.parse(argsJson) as Argument[]
              const scriptHashResult = await neoline?.AddressToScriptHash({ address: account! })
              executeTest(testId, () =>
                neoline?.invoke({
                  scriptHash,
                  operation,
                  args,
                  signers: [{ account: scriptHashResult.scriptHash, scopes: 1 }],
                  fee: '0.0001'
                })
              )
            } catch (err: any) {
              alert(err?.message || 'Invalid JSON for args')
            }
          }}
          disabled={!neoline || !account || !scriptHash || !operation || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && account && scriptHash && operation ? '#FF9800' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && account && scriptHash && operation ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Processing...' : 'Invoke Contract'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestSignMessage = () => {
    const testId = 'signMessage'
    const result = getResult(testId)
    const [message, setMessage] = useState('Hello, Neo!')

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>signMessage()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Signs a message with the connected account. A randomized salt prefix is added before signing.
        </p>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Message:</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
        <button
          onClick={() => executeTest(testId, () => neoline?.signMessage({ message }))}
          disabled={!neoline || !message || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline && message ? '#FF9800' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline && message ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Processing...' : 'Sign Message'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  // ==================== Common Methods ====================

  const TestGetAccount = () => {
    const testId = 'getAccount'
    const result = getResult(testId)

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getAccount()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Returns the Account that is currently connected to the dApp.
        </p>
        <button
          onClick={() => executeTest(testId, () => neoline?.getAccount())}
          disabled={!neoline || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestGetNetworks = () => {
    const testId = 'getNetworks'
    const result = getResult(testId)

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getNetworks()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Returns the networks available and the default network the wallet is currently set to.
        </p>
        <button
          onClick={() => executeTest(testId, () => neoline?.getNetworks())}
          disabled={!neoline || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  const TestGetPublicKey = () => {
    const testId = 'getPublicKey'
    const result = getResult(testId)

    return (
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>getPublicKey()</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Returns the public key of the Account that is currently connected to the dApp.
        </p>
        <button
          onClick={() => executeTest(testId, () => neoline?.getPublicKey())}
          disabled={!neoline || loading[testId]}
          style={{
            padding: '8px 16px',
            background: neoline ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: neoline ? 'pointer' : 'not-allowed'
          }}
        >
          {loading[testId] ? 'Loading...' : 'Execute'}
        </button>
        {result && (
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              background: result.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}
          >
            {result.success ? JSON.stringify(result.data, null, 2) : `Error: ${result.error}`}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#333' }}>🧪 NeoLine N3 SDK Playground</h1>
      <p style={{ color: '#666', marginBottom: '30px', fontSize: '14px' }}>
        Test all features of the NeoLine N3 dAPI library. Make sure NeoLine extension is installed and connected.
      </p>

      {/* Connection Status */}
      {!isInitialized && (
        <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px', marginBottom: '20px' }}>
          ⏳ Initializing NeoLine N3 SDK... Please make sure NeoLine extension is installed.
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '15px',
            background: '#f8d7da',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#721c24'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Wallet Connection */}
      <div style={{ marginBottom: '30px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Wallet Connection</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!account ? (
            <button
              onClick={connect}
              disabled={!isInitialized}
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
              Connect Wallet
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
                onClick={disconnect}
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

      {/* Tabs */}
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { id: 'read', label: '📖 Read Methods', color: '#4CAF50' },
            { id: 'write', label: '✍️ Write Methods', color: '#FF9800' },
            { id: 'common', label: '🔧 Common Methods', color: '#2196F3' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: activeTab === tab.id ? tab.color : 'transparent',
                color: activeTab === tab.id ? 'white' : '#666',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'read' && (
          <div>
            <TestGetProvider />
            <TestGetAccount />
            <TestGetBalance />
            <TestGetStorage />
            <TestInvokeRead />
            <TestGetBlock />
            <TestGetTransaction />
            <TestGetApplicationLog />
            <TestAddressToScriptHash />
          </div>
        )}

        {activeTab === 'write' && (
          <div>
            <TestSend />
            <TestInvoke />
            <TestSignMessage />
          </div>
        )}

        {activeTab === 'common' && (
          <div>
            <TestGetAccount />
            <TestGetNetworks />
            <TestGetPublicKey />
          </div>
        )}
      </div>
    </div>
  )
}
