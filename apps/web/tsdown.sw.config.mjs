import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./web-workers/site-preview-sw.ts'],
  outDir: 'public/',
  outputOptions: { entryFileNames: 'site-preview-sw.js', chunkFileNames: 'site-preview-sw-chunk.[name].js' },
  platform: 'browser',
  clean: false,
  sourcemap: true,
  noExternal: [/.+/] // bundle all dependencies
})
