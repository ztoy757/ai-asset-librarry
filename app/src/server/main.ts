/**
 * コンポジションルート。
 * 各層の実装をここで組み立てる。依存ルール上、infrastructure を知ってよいのはこのファイルだけ。
 */
import { serve } from "@hono/node-server";
import pg from "pg";
import { AssetService } from "./application/asset-service.js";
import { AzureBlobStorage } from "./infrastructure/azure-blob-storage.js";
import { migrate } from "./infrastructure/migrate.js";
import { PgAssetRepository } from "./infrastructure/pg-asset-repository.js";
import { systemClock, uuidGenerator } from "./infrastructure/system.js";
import { createApp } from "./presentation/app.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value;
}

const pool = new pg.Pool({ connectionString: required("DATABASE_URL") });
await migrate(pool, process.env.MIGRATIONS_DIR ?? "./db/migrations");

const storage = await AzureBlobStorage.connect(
  required("AZURE_STORAGE_CONNECTION_STRING"),
  process.env.BLOB_CONTAINER ?? "assets",
);

const service = new AssetService(new PgAssetRepository(pool), storage, systemClock, uuidGenerator);
const app = createApp(service, { webRoot: process.env.WEB_ROOT ?? "./dist/web" });

const port = Number(process.env.PORT ?? 3000);
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close();
    void pool.end();
  });
}
