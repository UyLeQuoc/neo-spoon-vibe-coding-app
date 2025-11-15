/**
 * Extract session ID from URL path
 */
export function extractSessionId(pathname: string): string | null {
  // Expected format: /preview/{sessionId}/...
  const match = pathname.match(/^\/preview\/([^/]+)/)
  return match ? match[1] : null
}
