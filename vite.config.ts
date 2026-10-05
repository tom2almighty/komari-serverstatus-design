import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  // Absolute: the hub serves the theme's dist at the site root and falls back to
  // dist/index.html for any other path, so a relative "./assets/..." would be
  // requested as /node/<uuid>/assets/... and answered with index.html.
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": import.meta.dirname + "/src" } },
  build: {
    chunkSizeWarningLimit: 1200,
    // Flags stay files. Vite would inline every one under 4 KiB as a data URL,
    // and because the page imports the whole set, all of them would ship in the
    // entry chunk whichever flags a hub's nodes need.
    assetsInlineLimit: (file) => (file.includes("/flag-icons/") ? false : undefined),
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:25774",
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
