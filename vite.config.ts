import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["images/miner.png"],
      manifest: {
        name: "Marte Mining",
        short_name: "Marte",
        description: "Sistema operativo para innovación y desarrollo minero.",
        start_url: "/",
        display: "standalone",
        background_color: "#030507",
        theme_color: "#0a0c12",
        lang: "es",
        icons: [
          {
            src: "/images/miner.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/images/miner.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "image" || request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/mocks/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "mock-api-cache",
              networkTimeoutSeconds: 3
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
