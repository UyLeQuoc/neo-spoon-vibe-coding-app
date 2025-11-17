import { reactRouter } from '@react-router/dev/vite'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(config => ({
  build: { target: 'esnext' },
  plugins: [
    nodePolyfills({ include: ['path', 'buffer'] }),
    reactRouter(),
    UnoCSS(),
    tsconfigPaths(),
    config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    config.mode !== 'production' && devtoolsJson()
  ],
  envPrefix: ['VITE_', 'TOGETHER_AI_API_KEY', 'OLLAMA_API_BASE_URL', 'LM_STUDIO_API_BASE_URL'],
  server: { proxy: { '/api': 'http://localhost:8787' } }
}))
