/**
 * Extract site ID from URL path
 */
export function extractSiteId(pathname: string): string | null {
  // Expected format: /preview/{siteId}/...
  const match = pathname.match(/^\/preview\/([^/]+)/)
  return match ? match[1] : null
}
