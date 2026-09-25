import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import type { AssetService } from "../application/asset-service.js";
import { createApi } from "./api.js";

export function createApp(service: AssetService, options: { webRoot?: string } = {}): Hono {
  const app = new Hono();
  app.route("/api", createApi(service));

  if (options.webRoot) {
    const root = options.webRoot;
    app.use("/*", serveStatic({ root }));
    // 画面のルーティングはReact側で行うので、未知のパスはindex.htmlを返す
    app.get("*", serveStatic({ root, path: "index.html" }));
  }
  return app;
}
