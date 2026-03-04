import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Chatbot Administratif MG",
        short_name: "ChatbotMG",
        description: "Assistant administratif Madagascar",
        theme_color: "#0f172a",
        icons: [
          {
            src: "/icon-500.png",
            sizes: "500x500",
            type: "image/png"
          }
        ]
      }
    })
  ]
})