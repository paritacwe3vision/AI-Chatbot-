import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), avatar: resolve(import.meta.dirname, 'avatar-preview.html') } },
  },
})
