import type { Asset } from "../domain/asset.js";

/** メタデータの保存先（infrastructure層が実装する） */
export interface AssetRepository {
  save(asset: Asset): Promise<void>;
  findAll(): Promise<Asset[]>;
  findById(id: string): Promise<Asset | undefined>;
}

/** ファイル本体の保存先（infrastructure層が実装する） */
export interface BlobStorage {
  put(key: string, content: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<ReadableStream<Uint8Array>>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}
