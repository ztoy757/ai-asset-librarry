export type MediaKind = "image" | "audio" | "video";

export class InvalidAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAssetError";
  }
}

export interface Asset {
  readonly id: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly kind: MediaKind;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

/** 1ファイルあたりの上限（v1では動画も含めて200MB） */
export const MAX_ASSET_BYTES = 200 * 1024 * 1024;

export function mediaKindOf(contentType: string): MediaKind {
  const [type] = contentType.toLowerCase().split("/");
  if (type === "image" || type === "audio" || type === "video") {
    return type;
  }
  throw new InvalidAssetError(`対応していないファイル形式です: ${contentType}`);
}

export function createAsset(params: {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
}): Asset {
  const fileName = params.fileName.trim();
  if (fileName.length === 0) {
    throw new InvalidAssetError("ファイル名が空です");
  }
  if (params.sizeBytes <= 0) {
    throw new InvalidAssetError("空のファイルは登録できません");
  }
  if (params.sizeBytes > MAX_ASSET_BYTES) {
    throw new InvalidAssetError("ファイルサイズが上限を超えています");
  }
  return {
    id: params.id,
    fileName,
    contentType: params.contentType,
    kind: mediaKindOf(params.contentType),
    sizeBytes: params.sizeBytes,
    createdAt: params.createdAt,
  };
}
