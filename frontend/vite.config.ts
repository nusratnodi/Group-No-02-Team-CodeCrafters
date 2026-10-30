/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  // Reads frontend/.env (all keys, not only VITE_*) for dev-server settings.
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      port: 5173,
      // During development, API calls to /api are forwarded to the Express backend.
      proxy: {
        "/api": { target: env.API_PROXY_TARGET || "http://localhost:4000", changeOrigin: true },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: false,
    },
  }
})
