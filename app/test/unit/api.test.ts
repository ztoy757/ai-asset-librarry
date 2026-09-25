import { beforeEach, describe, expect, it } from "vitest";
import type { Hono } from "hono";
import { AssetService } from "../../src/server/application/asset-service.js";
import { resolveRuntimeConfig } from "../../src/server/main.js";
import { createApi } from "../../src/server/presentation/api.js";
import {
  fixedClock,
  InMemoryAssetRepository,
  InMemoryBlobStorage,
  sequentialIds,
} from "../support/fakes.js";

const upload = (api: Hono, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.request("/assets", { method: "POST", body: form });
};

describe("API", () => {
  let api: Hono;

  beforeEach(() => {
    api = createApi(
      new AssetService(
        new InMemoryAssetRepository(),
        new InMemoryBlobStorage(),
        fixedClock("2026-09-26T00:00:00Z"),
        sequentialIds(),
      ),
    );
  });

  it("DevContainer のデフォルト接続先が使われる", () => {
    expect(resolveRuntimeConfig({})).toEqual({
      databaseUrl: "postgres://app:app@db:5432/app",
      blobConnectionString:
        "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://blob:10000/devstoreaccount1;",
      blobContainer: "assets",
      port: 3000,
    });
  });

  it("本番（NODE_ENV=production）で接続先が未設定なら、既定値を使わずにエラーにする", () => {
    expect(() => resolveRuntimeConfig({ NODE_ENV: "production" })).toThrow("DATABASE_URL");
    expect(() =>
      resolveRuntimeConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://prod" }),
    ).toThrow("AZURE_STORAGE_CONNECTION_STRING");
  });

  it("本番でも、接続先が設定されていればその値を使う", () => {
    const config = resolveRuntimeConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://prod",
      AZURE_STORAGE_CONNECTION_STRING: "BlobEndpoint=https://prod",
    });
    expect(config.databaseUrl).toBe("postgres://prod");
    expect(config.blobConnectionString).toBe("BlobEndpoint=https://prod");
  });

  it("POST /assets は201と登録内容を返し、一覧に出る", async () => {
    const res = await upload(api, new File([new Uint8Array([1, 2])], "cat.png", { type: "image/png" }));
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string; kind: string; contentUrl: string };
    expect(created.kind).toBe("image");
    expect(created.contentUrl).toBe(`/api/assets/${created.id}/content`);

    const list = (await (await api.request("/assets")).json()) as { id: string }[];
    expect(list.map((a) => a.id)).toEqual([created.id]);
  });

  it("対応していない形式は400とエラーメッセージを返す", async () => {
    const res = await upload(api, new File(["hello"], "memo.txt", { type: "text/plain" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "対応していないファイル形式です: text/plain" });
  });

  it("fileがないリクエストは400を返す", async () => {
    const res = await api.request("/assets", { method: "POST", body: new FormData() });
    expect(res.status).toBe(400);
  });

  it("本体の配信にはスクリプトを実行させないためのヘッダーが付く", async () => {
    const created = (await (
      await upload(api, new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }))
    ).json()) as { contentUrl: string };

    const res = await api.request(created.contentUrl.replace("/api", ""));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each(["not-a-uuid", "00000000-0000-4000-8000-999999999999"])(
    "存在しないID（%s）は404を返す",
    async (id) => {
      const res = await api.request(`/assets/${id}/content`);
      expect(res.status).toBe(404);
    },
  );
});
