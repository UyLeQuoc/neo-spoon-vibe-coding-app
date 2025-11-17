import { type ReactNode, useEffect, useState } from 'react'

interface ClientOnlyProps {
  children: ReactNode | (() => ReactNode)
  fallback?: ReactNode
}

/**
 * ClientOnly component ensures its children only render on the client side.
 * This is useful for components that use browser APIs like document, window, etc.
 *
 * @example
 * ```tsx
 * <ClientOnly fallback={<div>Loading...</div>}>
 *   <CodeMirrorEditor />
 * </ClientOnly>
 * ```
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <>{fallback}</>
  }

  return <>{typeof children === 'function' ? children() : children}</>
}
