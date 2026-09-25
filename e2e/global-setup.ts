import path from "node:path";
import { fileURLToPath } from "node:url";
import { GenericContainer, Network, Wait, type StartedTestContainer } from "testcontainers";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

const AZURITE_IMAGE = "mcr.microsoft.com/azure-storage/azurite:3.37.0";
const AZURITE_KEY =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");

/**
 * シナリオテスト全体で1回だけ、DB・ストレージ・アプリを起動する（シングルトン）。
 * E2E_BASE_URL が指定されていれば、起動済みのアプリに対して実行する。
 */
export default async function globalSetup() {
  if (process.env.E2E_BASE_URL) {
    return;
  }

  const network = await new Network().start();

  // DBとストレージは依存関係がないので並列に起動する
  const [postgres, azurite, appImage] = await Promise.all([
    new PostgreSqlContainer("postgres:16-alpine")
      .withNetwork(network)
      .withNetworkAliases("db")
      .withTmpFs({ "/var/lib/postgresql/data": "rw" })
      .start(),
    new GenericContainer(AZURITE_IMAGE)
      .withNetwork(network)
      .withNetworkAliases("blob")
      .withCommand(["azurite-blob", "--blobHost", "0.0.0.0", "--skipApiVersionCheck"])
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
    GenericContainer.fromDockerfile(appDir).withCache(true).build("ai-asset-library-app:e2e", {
      deleteOnExit: false,
    }),
  ]);

  const app: StartedTestContainer = await appImage
    .withNetwork(network)
    .withEnvironment({
      DATABASE_URL: `postgres://${postgres.getUsername()}:${postgres.getPassword()}@db:5432/${postgres.getDatabase()}`,
      AZURE_STORAGE_CONNECTION_STRING: `DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=${AZURITE_KEY};BlobEndpoint=http://blob:10000/devstoreaccount1;`,
    })
    .withExposedPorts(3000)
    .withWaitStrategy(Wait.forHttp("/api/health", 3000).forStatusCode(200))
    .start();

  process.env.E2E_BASE_URL = `http://${app.getHost()}:${app.getMappedPort(3000)}`;

  return async () => {
    await app.stop();
    await Promise.all([postgres.stop(), azurite.stop()]);
    await network.stop();
  };
}
