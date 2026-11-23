import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // fuerza IPv4, evita el bind a ::1
    port: 5173,
    strictPort: false, // si el puerto está ocupado, prueba el siguiente libre
  },
})