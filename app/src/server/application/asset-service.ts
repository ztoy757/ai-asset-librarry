import { createAsset, type Asset } from "../domain/asset.js";
import type { AssetRepository, BlobStorage, Clock, IdGenerator } from "./ports.js";

export class AssetNotFoundError extends Error {
  constructor(id: string) {
    super(`素材が見つかりません: ${id}`);
    this.name = "AssetNotFoundError";
  }
}

export interface UploadCommand {
  fileName: string;
  contentType: string;
  content: Uint8Array;
}

export class AssetService {
  constructor(
    private readonly repository: AssetRepository,
    private readonly storage: BlobStorage,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async upload(command: UploadCommand): Promise<Asset> {
    const asset = createAsset({
      id: this.ids.next(),
      fileName: command.fileName,
      contentType: command.contentType,
      sizeBytes: command.content.byteLength,
      createdAt: this.clock.now(),
    });
    // 本体を先に保存する。メタデータだけ残って本体がない状態を避けるため
    await this.storage.put(asset.id, command.content, asset.contentType);
    await this.repository.save(asset);
    return asset;
  }

  async list(): Promise<Asset[]> {
    return this.repository.findAll();
  }

  async open(id: string): Promise<{ asset: Asset; content: ReadableStream<Uint8Array> }> {
    const asset = await this.repository.findById(id);
    if (!asset) {
      throw new AssetNotFoundError(id);
    }
    return { asset, content: await this.storage.get(asset.id) };
  }
}
