/**
 * コンポジションルート。
 * 各層の実装をここで組み立てる。依存ルール上、infrastructure を知ってよいのはこのファイルだけ。
 */
import { serve } from "@hono/node-server";
import pg from "pg";
import { pathToFileURL } from "node:url";
import { AssetService } from "./application/asset-service.js";
import { AzureBlobStorage } from "./infrastructure/azure-blob-storage.js";
import { migrate } from "./infrastructure/migrate.js";
import { PgAssetRepository } from "./infrastructure/pg-asset-repository.js";
import { systemClock, uuidGenerator } from "./infrastructure/system.js";
import { createApp } from "./presentation/app.js";

/**
 * 開発環境（DevContainer / Codespaces）用の既定の接続先。
 * AzuriteのキーはMicrosoftが公開している開発用の固定値で、本番では絶対に使わない。
 */
const DEVELOPMENT_DEFAULTS = {
  DATABASE_URL: "postgres://app:app@db:5432/app",
  AZURE_STORAGE_CONNECTION_STRING:
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://blob:10000/devstoreaccount1;",
} as const;

/**
 * 接続先を環境変数から決める。
 * NODE_ENV=production では既定値を使わず、設定漏れがあれば起動を止める。
 * 設定し忘れた本番環境が、開発用の接続先や公開キーで動いてしまうのを防ぐため。
 */
export function resolveRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const isProduction = env.NODE_ENV === "production";

  const read = (name: keyof typeof DEVELOPMENT_DEFAULTS): string => {
    const value = env[name];
    if (value) return value;
    if (isProduction) {
      throw new Error(`環境変数 ${name} が設定されていません（本番では既定値を使いません）`);
    }
    return DEVELOPMENT_DEFAULTS[name];
  };

  return {
    databaseUrl: read("DATABASE_URL"),
    blobConnectionString: read("AZURE_STORAGE_CONNECTION_STRING"),
    blobContainer: env.BLOB_CONTAINER ?? "assets",
    port: Number(env.PORT ?? 3000),
  };
}

export async function startServer(env: NodeJS.ProcessEnv = process.env) {
  const config = resolveRuntimeConfig(env);
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  await migrate(pool, env.MIGRATIONS_DIR ?? "./db/migrations");

  const storage = await AzureBlobStorage.connect(config.blobConnectionString, config.blobContainer);

  const service = new AssetService(new PgAssetRepository(pool), storage, systemClock, uuidGenerator);
  const app = createApp(service, { webRoot: env.WEB_ROOT ?? "./dist/web" });

  const port = config.port;
  const server = serve({ fetch: app.fetch, port }, () => {
    console.log(`listening on http://localhost:${port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.close();
      void pool.end();
    });
  }

  return { app, server, pool };
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  await startServer();
}
