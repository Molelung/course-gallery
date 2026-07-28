import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_PATH || "/",

  plugins: [],

  server: {
    port: 3000,
    open: true
  },

  build: {
    target: "es2020",
    outDir: "dist"
  }
});
