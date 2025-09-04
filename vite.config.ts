// vite.config.ts (Versión Corregida)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // Configuración para el servidor de DESARROLLO (`npm run dev`)
  server: {
    host: '0.0.0.0', // Buena práctica para accesibilidad en la red local
  },

  // Configuración para el servidor de PREVISUALIZACIÓN (`npm run preview`)
  // Esta es la que usa Render para servir tu aplicación
  preview: {
    // Le decimos que escuche en el puerto que Render le asigne
    port:  8080,
    strictPort: true,

    // Le decimos que escuche en todas las interfaces de red
    host: "0.0.0.0",

    // La línea clave que soluciona el error de "Host not allowed":
    // Le dice a Vite que acepte peticiones desde el dominio público de Render
    allowedHosts: ["tesisfront-lz3d.onrender.com"]
  }
})