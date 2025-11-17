import { fs, initializeZenFS, path } from '~/lib/zenfs'
import { WORK_DIR } from '~/utils/constants'
import { extractSiteId } from './extractSiteId'
import { getContentType } from './getContentType'
import { getFallbackHTML } from './getFallbackHTML'

// Custom fetch handler for ZenFS files
export async function fetchFromZenFS(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname

  console.log('[SW] Initializing ZenFS...')
  await initializeZenFS()
  console.log('[SW] Fetching from ZenFS:', pathname)

  try {
    // Extract session ID from path
    const siteId = extractSiteId(pathname)
    if (!siteId) {
      console.error('[SW] No site ID found in path:', pathname)
      return new Response(getFallbackHTML('', 'Invalid preview URL - site ID required'), {
        status: 400,
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Security-Policy': "frame-ancestors 'self'",
          'Cross-Origin-Resource-Policy': 'same-origin'
        }
      })
    }

    // Remove /preview/{sessionId} prefix to get the file path
    let filePath = pathname.replace(`/preview/${siteId}`, '')

    // Default to index.html for root requests
    if (filePath === '' || filePath === '/') {
      filePath = '/index.html'
    }

    // Ensure leading slash
    if (!filePath.startsWith('/')) filePath = `/${filePath}`

    console.log('[SW] Site ID:', siteId, 'File path:', filePath)

    // Construct full path within WORK_DIR
    const fullPath = path.join(`/sites/${siteId}`, filePath)
    console.log('[SW] Full path:', fullPath)

    // Debug: list files in the session (optional)
    try {
      const files = await fs.promises.readdir(WORK_DIR, {
        withFileTypes: true,
        recursive: true
      })
      console.log('[SW] Files in workspace:', files.length)
    } catch (error) {
      console.log('[SW] Could not list files:', error)
    }

    // Read the file
    const content = await fs.promises.readFile(fullPath)
    console.log('[SW] Read file:', fullPath, 'size:', content.byteLength)

    // Determine content type
    const contentType = getContentType(filePath)

    // Create response with proper headers (convert to regular Uint8Array for Response)
    // Note: X-Frame-Options: SAMEORIGIN allows iframe embedding from the same origin
    // Content-Security-Policy frame-ancestors 'self' also allows same-origin embedding
    // Cross-Origin-Resource-Policy: same-origin is required when parent page has COEP: require-corp
    const response = new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'",
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless'
      }
    })

    return response
  } catch (err) {
    console.error('[SW] Fetch error:', err)

    const siteId = extractSiteId(pathname)

    // Return appropriate error response
    if (err instanceof Error && err.message.includes('ENOENT')) {
      // For navigation requests to HTML, show a friendly fallback page
      if (request.mode === 'navigate') {
        return new Response(
          getFallbackHTML(siteId || 'unknown', 'File not found. Make sure files are uploaded to this site.'),
          {
            status: 404,
            headers: {
              'Content-Type': 'text/html',
              'X-Frame-Options': 'SAMEORIGIN',
              'Content-Security-Policy': "frame-ancestors 'self'",
              'Cross-Origin-Resource-Policy': 'same-origin',
              'Cross-Origin-Embedder-Policy': 'credentialless'
            }
          }
        )
      }

      return new Response('File not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Cross-Origin-Resource-Policy': 'same-origin'
        }
      })
    }

    // For navigation requests, show error page
    if (request.mode === 'navigate') {
      return new Response(
        getFallbackHTML(siteId || 'unknown', err instanceof Error ? err.message : 'Internal Server Error'),
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html',
            'X-Frame-Options': 'SAMEORIGIN',
            'Content-Security-Policy': "frame-ancestors 'self'",
            'Cross-Origin-Resource-Policy': 'same-origin'
          }
        }
      )
    }

    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Cross-Origin-Resource-Policy': 'same-origin'
      }
    })
  }
}
