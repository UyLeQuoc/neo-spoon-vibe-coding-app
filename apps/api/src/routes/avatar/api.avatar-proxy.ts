import { factory } from '~/factory'

export const avatarProxyRoute = factory
  .createApp()
  .get('/avatar/:seed', async (c) => {
    const seed = c.req.param('seed')
    
    if (!seed) {
      return c.text('Seed parameter is required', 400)
    }

    try {
      const response = await fetch(`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`)
      
      if (!response.ok) {
        return c.text('Failed to fetch avatar', response.status)
      }

      const svg = await response.text()
      
      return c.html(svg, 200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      })
    } catch (error) {
      console.error('Error fetching avatar:', error)
      return c.text('Internal server error', 500)
    }
  })

