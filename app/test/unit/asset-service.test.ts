import { beforeEach, describe, expect, it } from "vitest";
import { AssetNotFoundError, AssetService } from "../../src/server/application/asset-service.js";
import { InvalidAssetError } from "../../src/server/domain/asset.js";
import {
  fixedClock,
  InMemoryAssetRepository,
  InMemoryBlobStorage,
  sequentialIds,
} from "../support/fakes.js";

describe("AssetService", () => {
  let repository: InMemoryAssetRepository;
  let storage: InMemoryBlobStorage;
  let service: AssetService;

  beforeEach(() => {
    repository = new InMemoryAssetRepository();
    storage = new InMemoryBlobStorage();
    service = new AssetService(
      repository,
      storage,
      fixedClock("2026-09-26T00:00:00Z"),
      sequentialIds(),
    );
  });

  it("アップロードすると本体とメタデータの両方が保存される", async () => {
    const asset = await service.upload({
      fileName: "theme.mp3",
      contentType: "audio/mpeg",
      content: new Uint8Array([1, 2, 3]),
    });

    expect(asset).toMatchObject({ kind: "audio", sizeBytes: 3, fileName: "theme.mp3" });
    expect(repository.items.get(asset.id)).toEqual(asset);
    expect(storage.blobs.get(asset.id)?.contentType).toBe("audio/mpeg");
  });

  it("不正なファイルは何も保存せずに拒否する", async () => {
    await expect(
      service.upload({ fileName: "memo.txt", contentType: "text/plain", content: new Uint8Array([1]) }),
    ).rejects.toThrow(InvalidAssetError);

    expect(repository.items.size).toBe(0);
    expect(storage.blobs.size).toBe(0);
  });

  it("保存した本体をそのまま読み出せる", async () => {
    const asset = await service.upload({
      fileName: "a.png",
      contentType: "image/png",
      content: new Uint8Array([9, 8, 7]),
    });

    const opened = await service.open(asset.id);
    const bytes = new Uint8Array(await new Response(opened.content).arrayBuffer());
    expect([...bytes]).toEqual([9, 8, 7]);
  });

  it("存在しない素材を開こうとするとAssetNotFoundErrorになる", async () => {
    await expect(service.open("00000000-0000-4000-8000-999999999999")).rejects.toThrow(
      AssetNotFoundError,
    );
  });
});
