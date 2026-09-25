import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src/web",
  plugins: [react()],
  build: { outDir: "../../dist/web", emptyOutDir: true },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": "http://localhost:3000" },
    // GitHub Codespacesのポート転送（*.app.github.dev）経由のアクセスを許可する。
    // Viteは既定でlocalhost以外のHostヘッダーを拒否するため
    allowedHosts: [".app.github.dev"],
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
