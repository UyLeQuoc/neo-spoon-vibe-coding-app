import { ZenFsFileManager } from './file-manager'
import { extractSessionId } from './extractSessionId'
import { getContentType } from './getContentType'
import { getFallbackHTML } from './getFallbackHTML'

/**
 * Get the file manager for a session
 * @param sessionId - The session ID to get the file manager for
 * @returns A new file manager for the session
 */
const getFileManager = (sessionId: string) => new ZenFsFileManager(`/sessions/${sessionId}`)

// Custom fetch handler for ZenFS files
export async function fetchFromZenFS(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname

  console.log('[SW] Fetching from ZenFS:', pathname)

  try {
    // Extract session ID from path
    const sessionId = extractSessionId(pathname)
    if (!sessionId) {
      console.error('[SW] No session ID found in path:', pathname)
      return new Response(getFallbackHTML('', 'Invalid preview URL - session ID required'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Remove /preview/{sessionId} prefix to get the file path
    let filePath = pathname.replace(`/preview/${sessionId}`, '')

    // Default to index.html for root requests
    if (filePath === '' || filePath === '/') {
      filePath = '/index.html'
    }

    // Ensure leading slash
    if (!filePath.startsWith('/')) filePath = `/${filePath}`

    console.log('[SW] Session ID:', sessionId, 'File path:', filePath)

    // Initialize ZenFS file manager for this session
    const fm = getFileManager(sessionId)
    await fm.mount()

    console.log('[SW] Getting file from ZenFS...')
    // Debug: list files in the session (optional)
    const files = await fm.listFiles()
    console.log('[SW] Files in session:', files)

    // // Mount the file system (reads from IndexedDB)
    // await fm.mount({ backend: 'indexeddb' }).catch(() => {
    //   // File system might already be mounted, ignore error
    // })

    // Read the file
    const content = await fm.readFile(filePath)
    console.log('[SW] Read file:', filePath, 'size:', content.byteLength)

    // Determine content type
    const contentType = getContentType(filePath)

    // Create response with proper headers (convert to regular Uint8Array for Response)
    const response = new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    })

    return response
  } catch (err) {
    console.error('[SW] Fetch error:', err)

    const sessionId = extractSessionId(pathname)

    // Return appropriate error response
    if (err instanceof Error && err.message.includes('ENOENT')) {
      // For navigation requests to HTML, show a friendly fallback page
      if (request.mode === 'navigate') {
        return new Response(
          getFallbackHTML(sessionId || 'unknown', 'File not found. Make sure files are uploaded to this session.'),
          {
            status: 404,
            headers: { 'Content-Type': 'text/html' }
          }
        )
      }

      return new Response('File not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // For navigation requests, show error page
    if (request.mode === 'navigate') {
      return new Response(
        getFallbackHTML(sessionId || 'unknown', err instanceof Error ? err.message : 'Internal Server Error'),
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
