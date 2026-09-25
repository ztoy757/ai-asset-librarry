import type pg from "pg";
import type { Asset, MediaKind } from "../domain/asset.js";
import type { AssetRepository } from "../application/ports.js";

interface AssetRow {
  id: string;
  file_name: string;
  content_type: string;
  kind: MediaKind;
  size_bytes: string;
  created_at: Date;
}

const toAsset = (row: AssetRow): Asset => ({
  id: row.id,
  fileName: row.file_name,
  contentType: row.content_type,
  kind: row.kind,
  sizeBytes: Number(row.size_bytes),
  createdAt: row.created_at,
});

export class PgAssetRepository implements AssetRepository {
  constructor(private readonly pool: pg.Pool) {}

  async save(asset: Asset): Promise<void> {
    await this.pool.query(
      `INSERT INTO assets (id, file_name, content_type, kind, size_bytes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [asset.id, asset.fileName, asset.contentType, asset.kind, asset.sizeBytes, asset.createdAt],
    );
  }

  async findAll(): Promise<Asset[]> {
    const result = await this.pool.query<AssetRow>(
      "SELECT * FROM assets ORDER BY created_at DESC, id",
    );
    return result.rows.map(toAsset);
  }

  async findById(id: string): Promise<Asset | undefined> {
    const result = await this.pool.query<AssetRow>("SELECT * FROM assets WHERE id = $1", [id]);
    return result.rows[0] ? toAsset(result.rows[0]) : undefined;
  }
}
