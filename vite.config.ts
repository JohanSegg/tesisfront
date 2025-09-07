// vite.config.ts 
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // Configuración para el servidor de DESARROLLO (`npm run dev`)
  server: {
    host: '0.0.0.0', 
  },

  // Configuración para el servidor de PREVISUALIZACIÓN (`npm run preview`)
  // Esta es la que usara Render
  preview: {
    port:  8080,
    strictPort: true,
    host: "0.0.0.0", // Escuchar todas las interfaces de red
    allowedHosts: ["tesisfront-lz3d.onrender.com"] // Aceptar peticiones desde el dominio público de Render
  }
})
