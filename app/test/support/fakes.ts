import type { Asset } from "../../src/server/domain/asset.js";
import type {
  AssetRepository,
  BlobStorage,
  Clock,
  IdGenerator,
} from "../../src/server/application/ports.js";

export class InMemoryAssetRepository implements AssetRepository {
  readonly items = new Map<string, Asset>();

  async save(asset: Asset): Promise<void> {
    this.items.set(asset.id, asset);
  }
  async findAll(): Promise<Asset[]> {
    return [...this.items.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async findById(id: string): Promise<Asset | undefined> {
    return this.items.get(id);
  }
}

export class InMemoryBlobStorage implements BlobStorage {
  readonly blobs = new Map<string, { content: Uint8Array; contentType: string }>();

  async put(key: string, content: Uint8Array, contentType: string): Promise<void> {
    this.blobs.set(key, { content, contentType });
  }
  async get(key: string): Promise<ReadableStream<Uint8Array>> {
    const blob = this.blobs.get(key);
    if (!blob) throw new Error(`blob not found: ${key}`);
    return new Response(blob.content.slice()).body!;
  }
}

export const fixedClock = (iso: string): Clock => ({ now: () => new Date(iso) });

export const sequentialIds = (): IdGenerator => {
  let n = 0;
  return { next: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}` };
};
