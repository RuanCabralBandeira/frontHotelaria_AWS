import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '20261prj5/hotel/',
  server: {
    port: 9540,
    host: true
  }
})