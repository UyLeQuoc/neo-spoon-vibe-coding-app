import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['web-workers/site-preview-sw.ts'],
  outDir: 'public/',
  platform: 'browser',
  clean: false,
  sourcemap: true,
  noExternal: [/.+/] // bundle all dependencies
})
