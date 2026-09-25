import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src/web",
  plugins: [react()],
  build: { outDir: "../../dist/web", emptyOutDir: true },
  server: {
    // IPv4とIPv6の両方で待ち受ける（Codespacesのポート転送がどちらで接続しても届くように）
    host: true,
    port: 5173,
    strictPort: true,
    // 末尾のスラッシュが必要。"/api" だと画面側のファイル（/api-client.ts など）まで転送されてしまう
    proxy: { "/api/": "http://localhost:3000" },
    // GitHub Codespacesのポート転送（*.app.github.dev）経由のアクセスを許可する。
    // Viteは既定でlocalhost以外のHostヘッダーを拒否するため
    allowedHosts: [".app.github.dev"],
  },
  preview: {
    host: true,
    port: 4173,
  },
});
