// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// GitHub Pages（https://ztoy757.github.io/ai-asset-library/）に公開する
export default defineConfig({
  site: "https://ztoy757.github.io",
  base: "/ai-asset-library",
  integrations: [
    starlight({
      title: "AI生成物ライブラリ",
      description: "AIで生成した画像・音楽・動画をまとめて保管・管理するアプリの利用ガイド",
      defaultLocale: "root",
      locales: { root: { label: "日本語", lang: "ja" } },
      sidebar: [
        { label: "はじめに", slug: "getting-started" },
        {
          label: "使い方",
          items: [
            { label: "素材をアップロードする", slug: "guides/upload" },
            { label: "素材を見る", slug: "guides/browse" },
          ],
        },
        { label: "対応ファイルと制限", slug: "reference/limits" },
        { label: "よくある質問", slug: "faq" },
        { label: "更新履歴", slug: "changelog" },
      ],
    }),
  ],
});
