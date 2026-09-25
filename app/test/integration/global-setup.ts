import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    blobConnectionString: string;
  }
}

export const POSTGRES_IMAGE = "postgres:16-alpine";
export const AZURITE_IMAGE = "mcr.microsoft.com/azure-storage/azurite:3.37.0";

/** Azuriteの既定の開発用アカウント（公開されているテスト専用の値） */
const AZURITE_ACCOUNT = "devstoreaccount1";
const AZURITE_KEY =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

export const azuriteConnectionString = (host: string, port: number) =>
  `DefaultEndpointsProtocol=http;AccountName=${AZURITE_ACCOUNT};AccountKey=${AZURITE_KEY};BlobEndpoint=http://${host}:${port}/${AZURITE_ACCOUNT};`;

let postgres: StartedPostgreSqlContainer | undefined;
let azurite: StartedTestContainer | undefined;

/**
 * 結合テスト全体で1回だけコンテナを起動する（シングルトン）。
 * 2つのコンテナは依存関係がないので並列に起動する。
 */
export async function setup(project: TestProject) {
  // 既に起動しているDBとストレージを使う場合（Dockerがない環境での確認用）
  const { TEST_DATABASE_URL, TEST_BLOB_CONNECTION_STRING } = process.env;
  if (TEST_DATABASE_URL && TEST_BLOB_CONNECTION_STRING) {
    project.provide("databaseUrl", TEST_DATABASE_URL);
    project.provide("blobConnectionString", TEST_BLOB_CONNECTION_STRING);
    return;
  }

  [postgres, azurite] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE).withTmpFs({ "/var/lib/postgresql/data": "rw" }).start(),
    new GenericContainer(AZURITE_IMAGE)
      .withCommand(["azurite-blob", "--blobHost", "0.0.0.0", "--skipApiVersionCheck"])
      .withExposedPorts(10000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
  ]);

  project.provide("databaseUrl", postgres.getConnectionUri());
  project.provide(
    "blobConnectionString",
    azuriteConnectionString(azurite.getHost(), azurite.getMappedPort(10000)),
  );
}

export async function teardown() {
  await Promise.all([postgres?.stop(), azurite?.stop()]);
}
