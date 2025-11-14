import { RemixBrowser } from '@remix-run/react'
import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

startTransition(() => {
  const rootElement = document.getElementById('root')
  if (!rootElement) return
  hydrateRoot(rootElement, <RemixBrowser />)
})
