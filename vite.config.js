import { defineConfig } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // Relative base so the SAME build works whether it is served from
  // GitHub Pages (/course-gallery/) or CloudFlare (root /).
  // Pass BASE_PATH explicitly only to override (e.g. an absolute sub-path).
  base: process.env.BASE_PATH || "./",

  plugins: [cloudflare()],

  server: {
    port: 3000,
    open: true
  },

  build: {
    target: "es2020",
    outDir: "dist"
  }
});