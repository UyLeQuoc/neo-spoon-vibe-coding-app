import { useCallback, useEffect, useState } from 'react'
import { initNeoLineN3, waitForNeoLine } from './init'
import type { GetAccountResponse, GetBalanceResponse, NeoLineN3 } from './types'

export interface UseNeoLineN3Return {
  neoline: NeoLineN3 | null
  isInitialized: boolean
  account: string | null
  accountInfo: GetAccountResponse | null
  balance: GetBalanceResponse | null
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
  refreshBalance: () => Promise<void>
}

/**
 * React hook for NeoLine N3 SDK
 */
export function useNeoLineN3(): UseNeoLineN3Return {
  const [neoline, setNeoline] = useState<NeoLineN3 | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const [accountInfo, setAccountInfo] = useState<GetAccountResponse | null>(null)
  const [balance, setBalance] = useState<GetBalanceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async (instance: NeoLineN3, address: string) => {
    try {
      const balances = await instance.getBalance([{ address, contracts: [] }])
      setBalance(balances)
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }, [])

  const setupEventListeners = useCallback(
    (instance: NeoLineN3) => {
      // Account changed
      instance.addEventListener('NEOLine.N3.EVENT.ACCOUNT_CHANGED', (result: any) => {
        const accountData = result.detail || result
        if (accountData.address) {
          setAccount(accountData.address)
          setAccountInfo(accountData)
          fetchBalance(instance, accountData.address)
        }
      })

      // Connected
      instance.addEventListener('NEOLine.N3.EVENT.CONNECTED', (result: any) => {
        const accountData = result.detail || result
        if (accountData.address) {
          setAccount(accountData.address)
          setAccountInfo(accountData)
          fetchBalance(instance, accountData.address)
        }
      })

      // Disconnected
      instance.addEventListener('NEOLine.N3.EVENT.DISCONNECTED', () => {
        setAccount(null)
        setAccountInfo(null)
        setBalance(null)
      })
    },
    [fetchBalance]
  )

  // Initialize SDK
  useEffect(() => {
    if (typeof window === 'undefined') return

    let isMounted = true

    async function initialize() {
      try {
        const instance = await initNeoLineN3()
        if (isMounted) {
          if (instance) {
            setNeoline(instance)
            setIsInitialized(true)
            setError(null)

            // Set up event listeners
            setupEventListeners(instance)

            // Try to get current account
            try {
              const accountData = await instance.getAccount()
              if (isMounted) {
                setAccount(accountData.address)
                setAccountInfo(accountData)
                await fetchBalance(instance, accountData.address)
              }
            } catch {
              // Not connected yet, that's okay
            }
          } else {
            setIsInitialized(true)
            setError('NeoLine extension not detected. Please install NeoLine extension from https://neoline.io/')
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setIsInitialized(true)
          setError(`Failed to initialize NeoLine: ${err?.message || err}`)
        }
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [setupEventListeners, fetchBalance])

  const connect = useCallback(async () => {
    if (!neoline && !isInitialized) {
      // Try to initialize first
      const instance = await waitForNeoLine()
      if (instance) {
        setNeoline(instance)
        setIsInitialized(true)
        setupEventListeners(instance)
        const accountData = await instance.getAccount()
        setAccount(accountData.address)
        setAccountInfo(accountData)
        await fetchBalance(instance, accountData.address)
        return
      } else {
        throw new Error('NeoLine extension not detected')
      }
    }

    if (!neoline) {
      throw new Error('NeoLine SDK not initialized')
    }

    try {
      const accountData = await neoline.getAccount()
      setAccount(accountData.address)
      setAccountInfo(accountData)
      await fetchBalance(neoline, accountData.address)
      setError(null)
    } catch (err: any) {
      const errorMessage = err?.description || err?.message || 'Failed to connect wallet'
      setError(errorMessage)
      throw err
    }
  }, [neoline, isInitialized, setupEventListeners, fetchBalance])

  const disconnect = useCallback(() => {
    setAccount(null)
    setAccountInfo(null)
    setBalance(null)
  }, [])

  const refreshBalance = useCallback(async () => {
    if (!neoline || !account) return
    await fetchBalance(neoline, account)
  }, [neoline, account, fetchBalance])

  return {
    neoline,
    isInitialized,
    account,
    accountInfo,
    balance,
    error,
    connect,
    disconnect,
    refreshBalance
  }
}
