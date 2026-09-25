import { test as base, expect } from "@playwright/test";

/**
 * 全シナリオテスト共通のフィクスチャ。
 *
 * 「エラー画面が出ているのにテストが通る（偽の緑）」を防ぐため、
 * サーバーの5xx応答や画面のJavaScriptエラーを検知したら、その場でページを閉じて
 * 以降の操作を即座に失敗させ、原因をテスト結果に残す。
 */
export const test = base.extend<{ failFast: void }>({
  baseURL: async ({}, use) => {
    const url = process.env.E2E_BASE_URL;
    if (!url) throw new Error("E2E_BASE_URL が設定されていません（globalSetupが失敗した可能性）");
    await use(url);
  },

  failFast: [
    async ({ page }, use, testInfo) => {
      const problems: string[] = [];
      const fail = (reason: string) => {
        problems.push(reason);
        void page.close();
      };

      page.on("response", (response) => {
        if (response.status() >= 500) {
          fail(`サーバーエラー ${response.status()}: ${response.request().method()} ${response.url()}`);
        }
      });
      page.on("pageerror", (error) => fail(`画面のJavaScriptエラー: ${error.message}`));

      await use();

      if (problems.length > 0) {
        await testInfo.attach("fail-fast-reasons", { body: problems.join("\n") });
      }
      expect(problems, "テスト中にサーバーエラーまたは画面のエラーが発生しました").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
