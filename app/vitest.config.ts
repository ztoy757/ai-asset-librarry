import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: { name: "unit", include: ["test/unit/**/*.test.ts"] },
      },
      {
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          // コンテナはファイル単位ではなく全体で1回だけ起動する
          globalSetup: ["test/integration/global-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
