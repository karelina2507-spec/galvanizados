import react from '@vitejs/plugin-react'

export default {
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'leaflet': ['leaflet', 'react-leaflet']
        }
      }
    }
  }
}
