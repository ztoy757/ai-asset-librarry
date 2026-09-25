import { useCallback, useEffect, useState, type FormEvent } from "react";
import { fetchAssets, uploadAsset, type AssetView } from "./api-client";

const KIND_LABEL = { image: "画像", audio: "音楽", video: "動画" } as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Preview({ asset }: { asset: AssetView }) {
  switch (asset.kind) {
    case "image":
      return <img src={asset.contentUrl} alt={asset.fileName} loading="lazy" />;
    case "audio":
      return <audio src={asset.contentUrl} controls preload="none" />;
    case "video":
      return <video src={asset.contentUrl} controls preload="metadata" />;
  }
}

export function App() {
  const [assets, setAssets] = useState<AssetView[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    try {
      setAssets(await fetchAssets());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAsset(file);
      setFile(null);
      (event.target as HTMLFormElement).reset();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main>
      <h1>AI生成物ライブラリ</h1>

      <form onSubmit={onSubmit} aria-label="アップロード">
        <label>
          ファイル
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={!file || uploading}>
          {uploading ? "アップロード中…" : "アップロード"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      <section aria-label="素材一覧">
        {assets.length === 0 ? (
          <p>まだ素材がありません</p>
        ) : (
          <ul>
            {assets.map((asset) => (
              <li key={asset.id} data-testid="asset-item">
                <Preview asset={asset} />
                <div>
                  <strong data-testid="asset-name">{asset.fileName}</strong>
                  <span data-testid="asset-kind">{KIND_LABEL[asset.kind]}</span>
                  <span>{formatSize(asset.sizeBytes)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
