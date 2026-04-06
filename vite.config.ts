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
      injectRegister: "auto",
      registerType: "autoUpdate",
      includeAssets: ["icons/pwa-192.png", "icons/pwa-512.png", "icons/apple-touch-icon.png"],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: "Marte Mining",
        short_name: "Marte",
        description: "Sistema operativo para innovación y desarrollo minero.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait-primary",
        background_color: "#030507",
        theme_color: "#0a0c12",
        lang: "es",
        icons: [
          {
            src: "/icons/pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable any"
          }
        ],
        shortcuts: [
          {
            name: "Exploraciones",
            short_name: "Exploraciones",
            url: "/exploraciones"
          },
          {
            name: "Inventario",
            short_name: "Inventario",
            url: "/inventario"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          },
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
          },
          {
            urlPattern: ({ request }) =>
              request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 5
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
