/**
 * オニオンアーキテクチャの依存ルール。
 * 内側（domain）ほど何にも依存せず、外側の層は内側だけを参照できる。
 * 組み立てを行う src/server/main.ts（コンポジションルート）だけが全層を知ってよい。
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      comment: "domainは他の層にも外部パッケージにも依存しない",
      severity: "error",
      from: { path: "^src/server/domain" },
      to: {
        pathNot: "^src/server/domain",
      },
    },
    {
      name: "application-depends-only-on-domain",
      comment: "applicationはdomainにだけ依存する。DBやストレージはports.tsのインターフェース越しに使う",
      severity: "error",
      from: { path: "^src/server/application" },
      to: {
        pathNot: "^src/server/(domain|application)",
      },
    },
    {
      name: "infrastructure-not-to-presentation",
      severity: "error",
      from: { path: "^src/server/infrastructure" },
      to: { path: "^src/server/presentation" },
    },
    {
      name: "presentation-not-to-infrastructure",
      comment: "presentationはDBやストレージの実装を直接触らない。main.tsで注入する",
      severity: "error",
      from: { path: "^src/server/presentation" },
      to: { path: "^src/server/infrastructure" },
    },
    {
      name: "web-not-to-server",
      comment: "画面はAPIを呼ぶだけで、サーバーのコードを参照しない",
      severity: "error",
      from: { path: "^src/web" },
      to: { path: "^src/server" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: { orphan: true, pathNot: ["\\.d\\.ts$", "(^|/)vite\\.config\\.ts$"] },
      to: {},
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js"],
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
