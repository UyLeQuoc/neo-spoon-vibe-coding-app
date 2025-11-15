'use client'

import { AlertCircle, Check, Clock, Globe, Plus, Search, Settings, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import type { RecordType } from '~/hooks/mutation/neons/set-record.mutation'
import { useBalanceOfQuery } from '~/hooks/queries/neons/balance-of.query'
import { useDomainsQuery } from '~/hooks/queries/neons/domains.query'
import { useIsAvailableQuery } from '~/hooks/queries/neons/is-available.query'
import { usePropertiesQuery } from '~/hooks/queries/neons/properties.query'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import { formatDate } from '~/utils/date'

const NEO_NS_CONTRACT_HASH = '0xd4dbd72c8965b8f12c14d37ad57ddd91ee1d98cb'
const SEARCH_HISTORY_KEY = 'neons_search_history'
const MAX_SEARCH_HISTORY = 10

interface SearchHistoryItem {
  domain: string
  timestamp: number
}

export function NeoNSManagementContent() {
  const { isWalletAuthenticated } = useWalletAuth()
  const { neoline, account } = useNeoLineN3()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [searchingDomain, setSearchingDomain] = useState<string | null>(null) // Domain đang được search
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [registerYears, setRegisterYears] = useState(1)
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [recordType, setRecordType] = useState<RecordType>(1)
  const [recordData, setRecordData] = useState('')
  const [recordDomain, setRecordDomain] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSettingRecord, setIsSettingRecord] = useState(false)

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (stored) {
        setSearchHistory(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  }, [])

  // Save search history to localStorage
  const saveToHistory = useCallback((domain: string) => {
    const newItem: SearchHistoryItem = {
      domain: domain.toLowerCase(),
      timestamp: Date.now()
    }
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.domain !== newItem.domain)
      const updated = [newItem, ...filtered].slice(0, MAX_SEARCH_HISTORY)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Queries - chỉ search khi có searchingDomain (set khi bấm nút search)
  const isAvailableQuery = useIsAvailableQuery(searchingDomain)
  const propertiesQuery = usePropertiesQuery(selectedDomain)
  const balanceOfQuery = useBalanceOfQuery()
  const domainsQuery = useDomainsQuery({ limit: 50, offset: 0 })

  // Handle search - chỉ set searchingDomain khi bấm nút
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return

    const normalized = searchQuery.trim().toLowerCase()
    // Ensure it ends with .neo
    const domainToSearch = normalized.endsWith('.neo') ? normalized : `${normalized}.neo`

    setSearchingDomain(domainToSearch)
    setSelectedDomain(domainToSearch)
    saveToHistory(domainToSearch)
  }, [searchQuery, saveToHistory])

  // Handle register domain
  const handleRegister = useCallback(async () => {
    if (!neoline || !account || !searchingDomain) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!isAvailableQuery.data?.available) {
      toast.error('Domain is not available')
      return
    }

    setIsRegistering(true)
    try {
      // Convert address to scriptHash
      const scriptHashResult = await neoline.AddressToScriptHash({ address: account })

      // Format contract hash (remove 0x prefix and lowercase for Hash160)
      let formattedContractHash = NEO_NS_CONTRACT_HASH
      if (formattedContractHash.startsWith('0x')) {
        formattedContractHash = formattedContractHash.slice(2)
      }
      formattedContractHash = formattedContractHash.toLowerCase()

      // Register domain (default 1 year, but we can extend this)
      const result = await neoline.invoke({
        scriptHash: NEO_NS_CONTRACT_HASH,
        operation: 'register',
        args: [
          {
            type: 'String',
            value: searchingDomain
          },
          {
            type: 'Hash160',
            value: scriptHashResult.scriptHash
          }
        ],
        signers: [
          {
            account: scriptHashResult.scriptHash,
            scopes: 1 // CalledByEntry
          }
        ],
        fee: '0.0001'
      })

      toast.success(`Domain registered successfully! TX: ${result.txid}`)
      setShowRegisterDialog(false)
      setSearchQuery('')
      setSelectedDomain(null)

      // Invalidate queries
      isAvailableQuery.refetch()
      balanceOfQuery.refetch()
      domainsQuery.refetch()
    } catch (error: any) {
      console.error('Register domain error:', error)
      if (error.type === 'CANCELED') {
        toast.info('Registration cancelled')
      } else {
        toast.error(error.message || 'Failed to register domain')
      }
    } finally {
      setIsRegistering(false)
    }
  }, [neoline, account, searchingDomain, isAvailableQuery, balanceOfQuery, domainsQuery])

  // Handle set record
  const handleSetRecord = useCallback(async () => {
    if (!neoline || !account || !recordDomain) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!recordData.trim()) {
      toast.error('Record data is required')
      return
    }

    setIsSettingRecord(true)
    try {
      // Convert address to scriptHash
      const scriptHashResult = await neoline.AddressToScriptHash({ address: account })

      // Set record
      const result = await neoline.invoke({
        scriptHash: NEO_NS_CONTRACT_HASH,
        operation: 'setRecord',
        args: [
          {
            type: 'String',
            value: recordDomain
          },
          {
            type: 'Integer',
            value: recordType.toString()
          },
          {
            type: 'String',
            value: recordData.trim()
          }
        ],
        signers: [
          {
            account: scriptHashResult.scriptHash,
            scopes: 1 // CalledByEntry
          }
        ],
        fee: '0.0001'
      })

      toast.success(`Record set successfully! TX: ${result.txid}`)
      setShowRecordDialog(false)
      setRecordData('')
      setRecordDomain(null)

      // Invalidate queries
      if (recordDomain === selectedDomain) {
        propertiesQuery.refetch()
      }
    } catch (error: any) {
      console.error('Set record error:', error)
      if (error.type === 'CANCELED') {
        toast.info('Set record cancelled')
      } else {
        toast.error(error.message || 'Failed to set record')
      }
    } finally {
      setIsSettingRecord(false)
    }
  }, [neoline, account, recordDomain, recordType, recordData, selectedDomain, propertiesQuery])

  // Format expiration date
  const formatExpiration = (timestamp: number | null) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString()
  }

  // Calculate domain price (simplified - in production, this would call a pricing contract)
  const calculatePrice = (years: number) => {
    // Placeholder pricing: 10 GAS per year
    return (years * 10).toFixed(2)
  }

  if (!isWalletAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Wallet Not Connected</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to manage NeoNS domains</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">NeoNS Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Search, register, and manage your NeoNS domains</p>
      </div>

      {/* Search Section */}
      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              placeholder="Search domain (e.g., example.neo)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isAvailableQuery.isLoading}
            className="px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAvailableQuery.isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchHistory.map(item => (
              <button
                key={item.domain}
                onClick={() => {
                  setSearchQuery(item.domain)
                  setSearchingDomain(item.domain)
                  setSelectedDomain(item.domain)
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <Clock className="w-3 h-3" />
                {item.domain}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {selectedDomain && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedDomain}</h2>
            {isAvailableQuery.data?.available && (
              <button
                onClick={() => setShowRegisterDialog(true)}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Register
              </button>
            )}
          </div>

          {isAvailableQuery.isLoading && (
            <div className="text-gray-500 dark:text-gray-400">Checking availability...</div>
          )}

          {isAvailableQuery.data && (
            <div className="space-y-2">
              {isAvailableQuery.data.available ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="w-5 h-5" />
                  <span>Domain is available for registration</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <X className="w-5 h-5" />
                  <span>
                    Domain is not available
                    {isAvailableQuery.data.error && ` - ${isAvailableQuery.data.error}`}
                  </span>
                </div>
              )}

              {!isAvailableQuery.data.available && propertiesQuery.data?.properties && (
                <div className="mt-4 space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Expiration:</span>{' '}
                    {formatExpiration(propertiesQuery.data.properties.expiration)}
                  </div>
                  {propertiesQuery.data.properties.admin && (
                    <div>
                      <span className="font-medium">Admin:</span> {propertiesQuery.data.properties.admin}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Owned Domains */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">My Domains</h2>
          {balanceOfQuery.data && (
            <span className="text-gray-600 dark:text-gray-400">Total: {balanceOfQuery.data.balance}</span>
          )}
        </div>

        {domainsQuery.isLoading && <div className="text-gray-500 dark:text-gray-400">Loading domains...</div>}

        {domainsQuery.data && domainsQuery.data.domains.length === 0 && (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              {domainsQuery.data.error || 'No domains found. Register your first domain above!'}
            </p>
          </div>
        )}

        {domainsQuery.data && domainsQuery.data.domains.length > 0 && (
          <div className="space-y-4">
            {domainsQuery.data.domains.map(domain => (
              <div
                key={domain.name}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{domain.name}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Expires: {formatDate({ date: domain.expiration })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRecordDomain(domain.name)
                    setShowRecordDialog(true)
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Records
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register Dialog */}
      {showRegisterDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Register {searchingDomain}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Years</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={registerYears}
                  onChange={e => setRegisterYears(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Price</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {calculatePrice(registerYears)} GAS
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowRegisterDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRegistering ? 'Registering...' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Record Dialog */}
      {showRecordDialog && recordDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Set Record for {recordDomain}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Record Type</label>
                <select
                  value={recordType}
                  onChange={e => setRecordType(Number(e.target.value) as RecordType)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value={1}>IPV4 (1)</option>
                  <option value={5}>CNAME (5)</option>
                  <option value={16}>TXT (16)</option>
                  <option value={28}>IPV6 (28)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Record Data</label>
                <input
                  type="text"
                  value={recordData}
                  onChange={e => setRecordData(e.target.value)}
                  placeholder={
                    recordType === 1
                      ? 'e.g., 192.168.1.1'
                      : recordType === 5
                        ? 'e.g., alias.neo'
                        : recordType === 16
                          ? 'e.g., N3 address or text'
                          : 'e.g., 2001:db8::1'
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRecordDialog(false)
                    setRecordDomain(null)
                    setRecordData('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetRecord}
                  disabled={isSettingRecord || !recordData.trim()}
                  className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSettingRecord ? 'Setting...' : 'Set Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
