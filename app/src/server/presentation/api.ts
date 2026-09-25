import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { InvalidAssetError, MAX_ASSET_BYTES, type Asset } from "../domain/asset.js";
import { AssetNotFoundError, type AssetService } from "../application/asset-service.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toDto = (asset: Asset) => ({
  id: asset.id,
  fileName: asset.fileName,
  contentType: asset.contentType,
  kind: asset.kind,
  sizeBytes: asset.sizeBytes,
  createdAt: asset.createdAt.toISOString(),
  contentUrl: `/api/assets/${asset.id}/content`,
});

export type AssetDto = ReturnType<typeof toDto>;

export function createApi(service: AssetService): Hono {
  const api = new Hono();

  api.use(secureHeaders());

  api.onError((error, c) => {
    if (error instanceof InvalidAssetError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof AssetNotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    console.error(error);
    return c.json({ error: "サーバーでエラーが発生しました" }, 500);
  });

  api.get("/health", (c) => c.json({ status: "ok" }));

  api.get("/assets", async (c) => {
    const assets = await service.list();
    return c.json(assets.map(toDto));
  });

  api.post(
    "/assets",
    bodyLimit({
      // multipartのヘッダー分の余裕を持たせる
      maxSize: MAX_ASSET_BYTES + 1024 * 1024,
      onError: (c) => c.json({ error: "ファイルサイズが上限を超えています" }, 413),
    }),
    async (c) => {
      const body = await c.req.parseBody();
      const file = body["file"];
      if (!(file instanceof File)) {
        return c.json({ error: "file フィールドにファイルを指定してください" }, 400);
      }
      const asset = await service.upload({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        content: new Uint8Array(await file.arrayBuffer()),
      });
      return c.json(toDto(asset), 201);
    },
  );

  api.get("/assets/:id/content", async (c) => {
    const id = c.req.param("id");
    if (!UUID_PATTERN.test(id)) {
      throw new AssetNotFoundError(id);
    }
    const { asset, content } = await service.open(id);
    return new Response(content, {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Length": String(asset.sizeBytes),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
        // SVGなどに埋め込まれたスクリプトを実行させないための防御
        "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  return api;
}
