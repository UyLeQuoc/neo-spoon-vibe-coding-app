import { reactRouter } from '@react-router/dev/vite'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'
// import { optimizeCssModules } from 'vite-plugin-optimize-css-modules'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(config => ({
  plugins: [
    reactRouter(),
    UnoCSS(),
    tsconfigPaths(),
    // config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    config.mode !== 'production' && devtoolsJson()
  ],
  server: { proxy: { '/api': 'http://localhost:8787' } }
}))
