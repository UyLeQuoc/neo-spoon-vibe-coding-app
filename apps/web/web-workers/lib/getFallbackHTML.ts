// Simple fallback HTML for direct navigation
export function getFallbackHTML(sessionId: string, error?: string): string {
  if (error) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      max-width: 500px;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #dc2626; margin: 0 0 0.5rem; font-size: 1.5rem; }
    p { color: #666; margin: 0 0 1.5rem; }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
    }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>Preview Error</h1>
    <p>${error}</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loading Preview...</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #666;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 { color: #333; margin: 0 0 0.5rem; font-size: 1.25rem; }
    p { color: #666; margin: 0; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Loading Preview</h2>
    <p>Session: ${sessionId}</p>
  </div>
  <script>
    // Auto-reload after a short delay to let SW cache kick in
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  </script>
</body>
</html>`
}
