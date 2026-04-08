import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/ecommerce-scene-generator/",
  server: {
    port: 5173,
    proxy: {
      "/multiangle-api": {
        target: "http://localhost:7861",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/multiangle-api/, "/api"),
      },
    },
  },
  build: {
    outDir: "docs",
  },
});
