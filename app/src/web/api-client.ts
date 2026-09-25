export type MediaKind = "image" | "audio" | "video";

export interface AssetView {
  id: string;
  fileName: string;
  contentType: string;
  kind: MediaKind;
  sizeBytes: number;
  createdAt: string;
  contentUrl: string;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `エラーが発生しました（${response.status}）`;
  } catch {
    return `エラーが発生しました（${response.status}）`;
  }
}

export async function fetchAssets(): Promise<AssetView[]> {
  const response = await fetch("/api/assets");
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as AssetView[];
}

export async function uploadAsset(file: File): Promise<AssetView> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/assets", { method: "POST", body: form });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as AssetView;
}
