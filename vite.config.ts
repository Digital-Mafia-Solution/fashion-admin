import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), VitePWA({
      registerType: 'autoUpdate',
      // We add the icons to be included in the PWA assets
      includeAssets: ['favicon.svg'],
      manifest: {
        name: "Splaza Online Store Admin",
        short_name: "Splaza Admin",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
          {
            src: "icons/pwa.svg",
            sizes: "any",
            type: "image/png"
          },
        ],
      },
    })],
  base: "/",
})
