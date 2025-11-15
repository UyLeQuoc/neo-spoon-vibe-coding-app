'use client'

import { useEffect, useState } from 'react'
import { useSitePreviewServiceWorker } from './useSitePreviewServiceWorker'
import './PreviewLoader.css'

export function PreviewLoader() {
  const [hasRefreshed, setHasRefreshed] = useState(false)

  // Setup service worker
  const { isLoading, error, isReady } = useSitePreviewServiceWorker({
    scope: '/preview/',
    swPath: '/site-preview-sw.mjs',
    timeout: 15000
  })

  // Auto-refresh when service worker is ready (only once)
  useEffect(() => {
    if (isReady && !hasRefreshed) {
      setHasRefreshed(true)
      console.log('[PreviewPage] Service worker ready, refreshing page ...')
      window.location.reload()
    }
  }, [isReady, hasRefreshed])

  // Show error if service worker setup failed
  if (error) {
    return (
      <div className="container">
        <div className="icon">⚠️</div>
        <h1>Preview Error</h1>
        <p>{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  // Show loading page while service worker is setting up
  return (
    <div className="container">
      <div className="spinner" />
      <h2>Loading Preview</h2>
      <p className="status">
        {isLoading
          ? 'Setting up service worker...'
          : isReady
            ? 'Ready! Refreshing...'
            : 'Initializing...'}
      </p>
    </div>
  )
}
