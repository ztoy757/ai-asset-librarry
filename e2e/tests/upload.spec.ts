import { randomUUID } from "node:crypto";
import { expect, test } from "../fixtures.js";

// 1x1ピクセルのPNG
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("素材のアップロード", () => {
  test("画像をアップロードすると一覧に画像として表示される", async ({ page }) => {
    const fileName = `sunset-${randomUUID()}.png`;
    await page.goto("/");

    await page.getByLabel("ファイル").setInputFiles({ name: fileName, mimeType: "image/png", buffer: PNG_1PX });
    await page.getByRole("button", { name: "アップロード" }).click();

    const item = page.getByTestId("asset-item").filter({ hasText: fileName });
    await expect(item).toBeVisible();
    await expect(item.getByTestId("asset-kind")).toHaveText("画像");
    await expect(item.getByRole("img", { name: fileName })).toHaveJSProperty("naturalWidth", 1);
  });

  test("対応していない形式はエラーを表示し、一覧に追加しない", async ({ page }) => {
    const fileName = `memo-${randomUUID()}.txt`;
    await page.goto("/");

    await page.getByLabel("ファイル").setInputFiles({
      name: fileName,
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await page.getByRole("button", { name: "アップロード" }).click();

    await expect(page.getByRole("alert")).toHaveText("対応していないファイル形式です: text/plain");
    await expect(page.getByTestId("asset-item").filter({ hasText: fileName })).toHaveCount(0);
  });
});
