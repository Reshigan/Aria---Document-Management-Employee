import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 12000,
    allowedHosts: true,
  },
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          vendor: ['react', 'react-dom'],
          // UI libraries chunk
          ui: ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          // Charts and visualization
          charts: ['recharts'],
          // Form libraries
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Icons
          icons: ['lucide-react'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'zustand',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'recharts',
      'lucide-react',
      'react-dropzone',
    ],
  },
})
