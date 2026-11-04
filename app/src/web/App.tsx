import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAssets, uploadAsset, type AssetView, type MediaKind } from "./api-client";

type FilterKind = MediaKind | "all";

const KIND_LABEL: Record<MediaKind, string> = {
  image: "画像",
  audio: "音楽",
  video: "動画",
};

const FILTERS: { kind: FilterKind; label: string }[] = [
  { kind: "all", label: "すべて" },
  { kind: "image", label: "画像" },
  { kind: "audio", label: "音楽" },
  { kind: "video", label: "動画" },
];

const MEDIA_KINDS: MediaKind[] = ["image", "audio", "video"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(value),
  );
}

function MediaIcon({ kind, className }: { kind: MediaKind; className?: string }) {
  if (kind === "image") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="7" y="9" width="34" height="30" rx="5" />
        <circle cx="18" cy="19" r="3" />
        <path d="m9 33 10-9 7 6 5-5 8 8" />
      </svg>
    );
  }
  if (kind === "audio") {
    return (
      <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M27 10v23.5a6.5 6.5 0 1 1-4-6V15l18-4v18.5a6.5 6.5 0 1 1-4-6V8l-10 2Z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="10" width="36" height="28" rx="5" />
      <path d="m21 18 11 6-11 6V18Z" />
    </svg>
  );
}

function Preview({ asset }: { asset: AssetView }) {
  if (asset.kind === "image") {
    return <img src={asset.contentUrl} alt={asset.fileName} loading="lazy" />;
  }
  if (asset.kind === "audio") {
    return (
      <div className="audio-preview">
        <MediaIcon kind="audio" className="preview-icon" />
        <audio src={asset.contentUrl} controls preload="none" aria-label={`${asset.fileName}を再生`} />
      </div>
    );
  }
  return <video src={asset.contentUrl} controls preload="metadata" aria-label={asset.fileName} />;
}

export function App() {
  const [assets, setAssets] = useState<AssetView[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets(await fetchAssets());
    } catch (e) {
      setError(e instanceof Error ? e.message : "素材の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja");
    return assets
      .filter((asset) => filter === "all" || asset.kind === filter)
      .filter(
        (asset) =>
          !normalizedQuery ||
          asset.fileName.toLocaleLowerCase("ja").includes(normalizedQuery) ||
          asset.contentType.toLocaleLowerCase("ja").includes(normalizedQuery),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [assets, filter, query]);

  const counts = useMemo(
    () => ({
      image: assets.filter((asset) => asset.kind === "image").length,
      audio: assets.filter((asset) => asset.kind === "audio").length,
      video: assets.filter((asset) => asset.kind === "video").length,
      size: assets.reduce((total, asset) => total + asset.sizeBytes, 0),
    }),
    [assets],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAsset(file);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AI生成物ライブラリ ホーム">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none">
              <path d="M14 3.5 24.5 9.25v9.5L14 24.5 3.5 18.75v-9.5L14 3.5Z" />
              <path d="m9 14 3.2 3.2L19.5 10" />
            </svg>
          </span>
          <span className="brand-name">atelier<span> / LIBRARY</span></span>
        </a>
        <span className="topbar-caption">あなたの創作を、ひとつの場所に。</span>
      </header>

      <main className="main-content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">YOUR CREATIVE SPACE</p>
            <h1 id="page-title">生成物ライブラリ</h1>
            <p className="page-description">AIで生み出した画像、音楽、動画をまとめて管理できます。</p>
          </div>
          <form className="upload-form" onSubmit={onSubmit} aria-label="アップロード">
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept="image/*,audio/*,video/*"
              aria-label="ファイル"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => fileInput.current?.click()}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12.5v3A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-3" />
              </svg>
              ファイルを選択
            </button>
            <button className="button button-primary" type="submit" disabled={!file || uploading}>
              {uploading ? "アップロード中…" : "アップロード"}
            </button>
          </form>
        </section>

        {file && (
          <p className="selected-file" role="status">
            選択中: <strong>{file.name}</strong>
          </p>
        )}
        {error && <p className="error-banner" role="alert">{error}</p>}

        <section className="overview" aria-label="ライブラリの概要">
          <div className="overview-intro">
            <span className="overview-label">COLLECTION</span>
            <strong>{assets.length}<span> 点</span></strong>
            <span className="overview-caption">ライブラリの素材</span>
          </div>
          <div className="overview-divider" aria-hidden="true" />
          {MEDIA_KINDS.map((kind) => (
            <div className="overview-stat" key={kind}>
              <span className={`stat-dot stat-dot-${kind}`} aria-hidden="true" />
              <span>{KIND_LABEL[kind]}</span>
              <strong>{counts[kind]}</strong>
            </div>
          ))}
          <div className="overview-storage">
            <span className="overview-label">STORAGE USED</span>
            <strong>{formatSize(counts.size)}</strong>
          </div>
        </section>

        <section className="library-section" aria-label="素材一覧">
          <div className="library-toolbar">
            <div className="filter-tabs" role="group" aria-label="種類で絞り込み">
              {FILTERS.map(({ kind, label }) => (
                <button
                  className={`filter-tab${filter === kind ? " is-active" : ""}`}
                  key={kind}
                  type="button"
                  aria-pressed={filter === kind}
                  onClick={() => setFilter(kind)}
                >
                  {label}
                  <span className="filter-count">
                    {kind === "all" ? assets.length : counts[kind]}
                  </span>
                </button>
              ))}
            </div>
            <label className="search-field">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="8.75" cy="8.75" r="5.75" />
                <path d="m13 13 4 4" />
              </svg>
              <span className="visually-hidden">素材を検索</span>
              <input
                type="search"
                aria-label="素材を検索"
                placeholder="ファイル名で検索"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="results-heading">
            <h2>{filter === "all" ? "すべての素材" : `${KIND_LABEL[filter]}の素材`}</h2>
            <span>{loading ? "読み込み中…" : `${visibleAssets.length} 件`}</span>
          </div>

          {loading ? (
            <div className="empty-state" role="status">
              <span className="loading-indicator" />
              <p>ライブラリを読み込んでいます…</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <h3>素材を読み込めませんでした</h3>
              <p>接続を確認して、もう一度お試しください。</p>
              <button className="button button-secondary" type="button" onClick={() => void reload()}>
                再読み込み
              </button>
            </div>
          ) : visibleAssets.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                <svg viewBox="0 0 48 48" fill="none">
                  <rect x="7" y="8" width="34" height="32" rx="6" />
                  <path d="M16 19h16M16 25h10M16 31h7" />
                  <circle cx="35" cy="34" r="7" />
                  <path d="M35 31v6m-3-3h6" />
                </svg>
              </span>
              <h3>{assets.length === 0 ? "ライブラリはまだ空です" : "素材が見つかりません"}</h3>
              <p>
                {assets.length === 0
                  ? "お気に入りの画像や音楽、動画をアップロードして、ここに集めましょう。"
                  : "検索キーワードや種類を変えて、もう一度お試しください。"}
              </p>
              {assets.length === 0 && (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  最初の素材を追加
                </button>
              )}
            </div>
          ) : (
            <ul className="asset-grid">
              {visibleAssets.map((asset) => (
                <li className="asset-card" key={asset.id} data-testid="asset-item">
                  <div className={`asset-preview asset-preview-${asset.kind}`}>
                    <Preview asset={asset} />
                    <span className={`asset-kind-badge badge-${asset.kind}`}>
                      <MediaIcon kind={asset.kind} />
                      {KIND_LABEL[asset.kind]}
                    </span>
                  </div>
                  <div className="asset-details">
                    <strong className="asset-name" data-testid="asset-name" title={asset.fileName}>
                      {asset.fileName}
                    </strong>
                    <div className="asset-meta">
                      <span>{formatDate(asset.createdAt)}</span>
                      <span className="meta-separator" aria-hidden="true">·</span>
                      <span>{formatSize(asset.sizeBytes)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="page-footer">
          <span>ATELIER LIBRARY</span>
          <span>つくる人のための、生成物ライブラリ。</span>
        </footer>
      </main>
    </div>
  );
}
