/// <reference lib="WebWorker" />

import { registerRoute } from 'workbox-routing'
import { fetchFromZenFS } from './lib/fetchFromZenFS'

declare var self: ServiceWorkerGlobalScope

/**
 * Service Worker for Preview Site
 *
 * This service worker intercepts requests to /preview/* paths and fetches
 * the files directly from ZenFS (which uses IndexedDB, available in service workers).
 */

// Install event - claim clients immediately
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(self.skipWaiting())
})

// Activate event - take control of clients immediately
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(self.clients.claim())
})

// Listen for SKIP_WAITING message
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message')
    event.waitUntil(self.skipWaiting())
  }
})

// Register route for /preview/* paths - fetch from ZenFS
registerRoute(
  ({ url }) => url.pathname.startsWith('/preview/'),
  ({ request }) => fetchFromZenFS(request)
)

console.log('[SW] Service worker loaded and routes registered')
