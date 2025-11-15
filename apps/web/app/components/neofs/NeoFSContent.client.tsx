'use client'

import { Cloud, Download, File, Folder, Loader2, Plus, Trash2, Upload, Wallet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useNeoLineN3 } from '~/lib/neolineN3TS'
import { useWalletAuth } from '~/lib/providers/WalletAuthProvider'
import {
  getNeoFSBalance,
  createContainerViaNeoLine,
  uploadFileToNeoFS,
  listFilesInContainer,
  getFileUrl,
  deleteFileFromNeoFS,
  depositToNeoFS
} from '~/lib/neofs/client'

const CONTAINER_STORAGE_KEY = 'neofs_container_id'

interface NeoFSFile {
  id: string
  name: string
  size: number
  uploadedAt: string
  url?: string
}

export function NeoFSContent() {
  const { isWalletAuthenticated } = useWalletAuth()
  const { neoline, account, balance } = useNeoLineN3()
  
  const [neofsBalance, setNeofsBalance] = useState<number | null>(null)
  const [containerId, setContainerId] = useState<string | null>(null)
  const [files, setFiles] = useState<NeoFSFile[]>([])
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isCreatingContainer, setIsCreatingContainer] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Load container ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CONTAINER_STORAGE_KEY)
    if (stored) {
      setContainerId(stored)
    }
  }, [])

  // Load NeoFS balance
  const loadNeoFSBalance = useCallback(async () => {
    if (!account || !isWalletAuthenticated) return

    setIsLoadingBalance(true)
    try {
      const balance = await getNeoFSBalance(account)
      setNeofsBalance(balance)
    } catch (error: any) {
      console.error('Failed to load NeoFS balance:', error)
      toast.error(error.message || 'Failed to load NeoFS balance')
    } finally {
      setIsLoadingBalance(false)
    }
  }, [account, isWalletAuthenticated])

  // Load files
  const loadFiles = useCallback(async () => {
    if (!containerId || !account || !isWalletAuthenticated) return

    setIsLoadingFiles(true)
    try {
      const filesList = await listFilesInContainer(containerId)
      setFiles(filesList)
    } catch (error: any) {
      console.error('Failed to load files:', error)
      toast.error(error.message || 'Failed to load files')
    } finally {
      setIsLoadingFiles(false)
    }
  }, [containerId, account, isWalletAuthenticated])

  // Create container
  const createContainer = useCallback(async () => {
    if (!neoline || !account) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsCreatingContainer(true)
    try {
      const newContainerId = await createContainerViaNeoLine(neoline, account)
      setContainerId(newContainerId)
      localStorage.setItem(CONTAINER_STORAGE_KEY, newContainerId)
      toast.success('Container created successfully!')
      await loadFiles()
    } catch (error: any) {
      console.error('Failed to create container:', error)
      toast.error(error.message || 'Failed to create container')
    } finally {
      setIsCreatingContainer(false)
    }
  }, [neoline, account, loadFiles])

  // Upload file
  const handleUpload = useCallback(async () => {
    if (!selectedFile || !containerId || !account || !isWalletAuthenticated) {
      toast.error('Please select a file and ensure container exists')
      return
    }

    setIsUploading(true)
    try {
      const { objectId, url } = await uploadFileToNeoFS(selectedFile, containerId, selectedFile.name)
      
      toast.success('File uploaded successfully!')
      setSelectedFile(null)
      await loadFiles()
    } catch (error: any) {
      console.error('Failed to upload file:', error)
      toast.error(error.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, containerId, account, isWalletAuthenticated, loadFiles])

  // Download file
  const handleDownload = useCallback(async (file: NeoFSFile) => {
    if (!file.id || !containerId) return

    try {
      const fileUrl = file.url || getFileUrl(containerId, file.id)
      window.open(fileUrl, '_blank')
    } catch (error: any) {
      console.error('Failed to download file:', error)
      toast.error(error.message || 'Failed to download file')
    }
  }, [containerId])

  // Delete file
  const handleDelete = useCallback(async (fileId: string) => {
    if (!containerId || !account || !isWalletAuthenticated) return
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      // Note: Delete requires signature - for now this will fail without proper signing
      // You'll need to implement bearer token creation and signing
      await deleteFileFromNeoFS(containerId, fileId)
      toast.success('File deleted successfully!')
      await loadFiles()
    } catch (error: any) {
      console.error('Failed to delete file:', error)
      toast.error(error.message || 'Failed to delete file')
    }
  }, [containerId, account, isWalletAuthenticated, loadFiles])

  // Load balance and files when authenticated
  useEffect(() => {
    if (isWalletAuthenticated && account) {
      loadNeoFSBalance()
      if (containerId) {
        loadFiles()
      }
    }
  }, [isWalletAuthenticated, account, containerId, loadNeoFSBalance, loadFiles])

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (!isWalletAuthenticated) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-neozero-elements-background-depth-2 rounded-lg border border-neozero-elements-borderColor p-8 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-neozero-elements-textSecondary" />
            <h2 className="text-2xl font-bold mb-2 text-neozero-elements-textPrimary">Connect Your Wallet</h2>
            <p className="text-neozero-elements-textSecondary mb-6">
              Please connect your NEO wallet to access NeoFS storage
            </p>
            <p className="text-sm text-neozero-elements-textTertiary">
              Your wallet connection is available in the header
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neozero-elements-textPrimary flex items-center gap-3">
              <Cloud className="w-8 h-8" />
              NeoFS Storage
            </h1>
            <p className="text-sm text-neozero-elements-textSecondary mt-1">
              Decentralized file storage on NEO blockchain
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-neozero-elements-background-depth-2 rounded-lg border border-neozero-elements-borderColor p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1 text-neozero-elements-textPrimary">NeoFS Balance</h2>
              <p className="text-sm text-neozero-elements-textSecondary">Your current storage balance</p>
            </div>
            <div className="text-right">
              {isLoadingBalance ? (
                <Loader2 className="w-6 h-6 animate-spin text-neozero-elements-textSecondary" />
              ) : (
                <div className="text-2xl font-bold text-neozero-elements-textPrimary">
                  {neofsBalance !== null ? `${neofsBalance.toFixed(4)} GAS` : '--'}
                </div>
              )}
            </div>
          </div>
          {neofsBalance !== null && neofsBalance < 1 && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Low balance. Please deposit GAS to the NeoFS contract to continue using storage.
              </p>
            </div>
          )}
        </div>

        {/* Container Management */}
        {!containerId ? (
          <div className="bg-neozero-elements-background-depth-2 rounded-lg border border-neozero-elements-borderColor p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1 text-neozero-elements-textPrimary">No Container Found</h3>
                <p className="text-sm text-neozero-elements-textSecondary">
                  Create a container to start storing files on NeoFS
                </p>
              </div>
              <button
                onClick={createContainer}
                disabled={isCreatingContainer}
                className="px-4 py-2 bg-neozero-elements-button-primary-background text-neozero-elements-button-primary-text rounded-md hover:bg-neozero-elements-button-primary-backgroundHover transition-theme flex items-center gap-2 disabled:opacity-50"
              >
                {isCreatingContainer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Container
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Container Info */}
            <div className="bg-neozero-elements-background-depth-2 rounded-lg border border-neozero-elements-borderColor p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-neozero-elements-textSecondary" />
                  <div>
                    <p className="text-sm font-medium text-neozero-elements-textPrimary">Container ID</p>
                    <p className="text-xs text-neozero-elements-textSecondary font-mono">{containerId}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-neozero-elements-background-depth-2 rounded-lg border border-neozero-elements-borderColor p-6">
              <h3 className="text-lg font-semibold mb-4 text-neozero-elements-textPrimary">Upload File</h3>
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <div className="border-2 border-dashed border-neozero-elements-borderColor rounded-lg p-6 text-center cursor-pointer hover:border-neozero-elements-borderColorActive transition-theme">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <File className="w-5 h-5 text-neozero-elements-textSecondary" />
                        <span className="text-neozero-elements-textPrimary">{selectedFile.name}</span>
                        <span className="text-sm text-neozero-elements-textSecondary">
                          ({formatFileSize(selectedFile.size)})
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-neozero-elements-textSecondary" />
                        <span className="text-neozero-elements-textPrimary">Click to select file</span>
                        <span className="text-xs text-neozero-elements-textSecondary">or drag and drop</span>
                      </div>
                    )}
                  </div>
                </label>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="px-6 py-3 bg-neozero-elements-button-primary-background text-neozero-elements-button-primary-text rounded-md hover:bg-neozero-elements-button-primary-backgroundHover transition-theme flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Files List */}
            <div className="bg-neozero-elements-background-depth-2 rounded-lg border border-neozero-elements-borderColor p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neozero-elements-textPrimary">Your Files</h3>
                <button
                  onClick={loadFiles}
                  disabled={isLoadingFiles}
                  className="px-3 py-1.5 text-sm bg-neozero-elements-button-secondary-background text-neozero-elements-button-secondary-text rounded-md hover:bg-neozero-elements-button-secondary-backgroundHover transition-theme disabled:opacity-50"
                >
                  {isLoadingFiles ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Refresh'
                  )}
                </button>
              </div>

              {isLoadingFiles ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-neozero-elements-textSecondary" />
                  <p className="text-sm text-neozero-elements-textSecondary mt-2">Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8">
                  <File className="w-12 h-12 mx-auto text-neozero-elements-textTertiary mb-2" />
                  <p className="text-neozero-elements-textSecondary">No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-neozero-elements-background-depth-1 rounded-lg border border-neozero-elements-borderColor hover:bg-neozero-elements-item-backgroundActive transition-theme"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <File className="w-5 h-5 text-neozero-elements-textSecondary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neozero-elements-textPrimary truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-neozero-elements-textSecondary">
                              {formatFileSize(file.size)}
                            </span>
                            <span className="text-xs text-neozero-elements-textTertiary">
                              {formatDate(file.uploadedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-neozero-elements-item-backgroundActive rounded transition-theme"
                            title="View in browser"
                          >
                            <Download className="w-4 h-4 text-neozero-elements-textSecondary" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 hover:bg-neozero-elements-item-backgroundActive rounded transition-theme"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-neozero-elements-textSecondary" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-2 hover:bg-neozero-elements-button-danger-background rounded transition-theme"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-neozero-elements-button-danger-text" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

