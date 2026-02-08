const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    hmr: {
      clientPort: 5173
    }
  },
  preview: {
    port: 5173,
    host: true,
    strictPort: true
  }
})
