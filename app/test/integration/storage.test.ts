import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createAsset, MAX_ASSET_BYTES } from "../../src/server/domain/asset.js";
import { AzureBlobStorage } from "../../src/server/infrastructure/azure-blob-storage.js";
import { migrate } from "../../src/server/infrastructure/migrate.js";
import { PgAssetRepository } from "../../src/server/infrastructure/pg-asset-repository.js";

const asset = (fileName: string, createdAt: string) =>
  createAsset({
    id: randomUUID(),
    fileName,
    contentType: "video/mp4",
    sizeBytes: MAX_ASSET_BYTES,
    createdAt: new Date(createdAt),
  });

describe("PgAssetRepository", () => {
  let pool: pg.Pool;
  let repository: PgAssetRepository;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: inject("databaseUrl") });
    await migrate(pool, "db/migrations");
    // 2回目の適用は何もしない（冪等）
    await migrate(pool, "db/migrations");
    repository = new PgAssetRepository(pool);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE assets");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("保存した素材をIDで取得でき、値がそのまま戻る", async () => {
    const saved = asset("clip.mp4", "2026-09-26T00:00:00Z");
    await repository.save(saved);
    expect(await repository.findById(saved.id)).toEqual(saved);
  });

  it("一覧は新しい順に並ぶ", async () => {
    const older = asset("old.mp4", "2026-09-01T00:00:00Z");
    const newer = asset("new.mp4", "2026-09-26T00:00:00Z");
    await repository.save(older);
    await repository.save(newer);
    expect((await repository.findAll()).map((a) => a.fileName)).toEqual(["new.mp4", "old.mp4"]);
  });

  it("存在しないIDはundefinedを返す", async () => {
    expect(await repository.findById(randomUUID())).toBeUndefined();
  });

  it("DBの制約でも不正な種類を拒否する", async () => {
    await expect(
      pool.query(
        "INSERT INTO assets VALUES ($1, 'x.txt', 'text/plain', 'text', 1, now())",
        [randomUUID()],
      ),
    ).rejects.toThrow(/assets_kind_check/);
  });
});

describe("AzureBlobStorage", () => {
  it("保存した本体とContent-Typeを読み出せる", async () => {
    const storage = await AzureBlobStorage.connect(
      inject("blobConnectionString"),
      `test-${randomUUID()}`,
    );
    const key = randomUUID();
    await storage.put(key, new Uint8Array([1, 2, 3, 250]), "image/png");

    const bytes = new Uint8Array(await new Response(await storage.get(key)).arrayBuffer());
    expect([...bytes]).toEqual([1, 2, 3, 250]);
  });
});
