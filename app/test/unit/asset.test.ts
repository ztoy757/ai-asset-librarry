import { describe, expect, it } from "vitest";
import { createAsset, InvalidAssetError, MAX_ASSET_BYTES, mediaKindOf } from "../../src/server/domain/asset.js";

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  fileName: "sunset.png",
  contentType: "image/png",
  sizeBytes: 1024,
  createdAt: new Date("2026-09-26T00:00:00Z"),
};

describe("mediaKindOf", () => {
  it.each([
    ["image/png", "image"],
    ["image/webp", "image"],
    ["audio/mpeg", "audio"],
    ["video/mp4", "video"],
    ["VIDEO/MP4", "video"],
  ] as const)("%s は %s として扱う", (contentType, expected) => {
    expect(mediaKindOf(contentType)).toBe(expected);
  });

  it.each(["application/pdf", "text/plain", "application/octet-stream", ""])(
    "%s は対応していない形式として拒否する",
    (contentType) => {
      expect(() => mediaKindOf(contentType)).toThrow(InvalidAssetError);
    },
  );
});

describe("createAsset", () => {
  it("種類をContent-Typeから決め、ファイル名の前後の空白を取り除く", () => {
    const asset = createAsset({ ...base, fileName: "  sunset.png  " });
    expect(asset.kind).toBe("image");
    expect(asset.fileName).toBe("sunset.png");
  });

  it("空のファイル名は拒否する", () => {
    expect(() => createAsset({ ...base, fileName: "   " })).toThrow("ファイル名が空です");
  });

  it("0バイトのファイルは拒否する", () => {
    expect(() => createAsset({ ...base, sizeBytes: 0 })).toThrow("空のファイル");
  });

  it("上限ちょうどは受け付け、1バイトでも超えたら拒否する", () => {
    expect(createAsset({ ...base, sizeBytes: MAX_ASSET_BYTES }).sizeBytes).toBe(MAX_ASSET_BYTES);
    expect(() => createAsset({ ...base, sizeBytes: MAX_ASSET_BYTES + 1 })).toThrow("上限");
  });
});
