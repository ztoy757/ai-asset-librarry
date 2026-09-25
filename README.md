# ai-asset-library

AIで生成した画像・音楽・動画を保管・管理するアプリ。主目的は、このアプリを題材にしたAIDLC（AIによる開発ライフサイクル）の検証。

要件は [docs/requirements.md](docs/requirements.md) を参照。

## 構成

```
app/          Hono（サーバー）+ React / Vite（画面）
  src/server/
    domain/          業務ルール（何にも依存しない）
    application/     ユースケースとポート（domainだけに依存）
    infrastructure/  PostgreSQL・Azure Blobの実装
    presentation/    HonoのAPIと画面配信
    main.ts          コンポジションルート（全層を組み立てる唯一の場所）
  src/web/           React画面（APIを呼ぶだけ）
  db/migrations/     SQLマイグレーション
  test/unit/         単体テスト（Vitest）
  test/integration/  結合テスト（Testcontainers：PostgreSQL、Azurite）
e2e/          シナリオテスト（Playwright + Testcontainers）
infra/azure/  Azure構成（静的チェックとモックのテストのみ。デプロイはしない）
infra/local/  ローカルのDockerに構築するTerraform
```

層の依存ルールは `app/.dependency-cruiser.cjs` で定義し、CIで検証する。

## ローカルで動かす

```sh
# DB・ストレージ・アプリをDockerで起動（Terraform）
cd infra/local && terraform init && terraform apply
# → http://localhost:3000
```

開発時は、`infra/local` でDBとストレージを起動したうえで、`app/` で次を実行する。

```sh
npm ci
DATABASE_URL=postgres://app:app@localhost:5432/app \
AZURE_STORAGE_CONNECTION_STRING="..." npm run dev:server   # API
npm run dev:web                                              # 画面（Viteの開発サーバー）
```

## テスト

| 種類 | コマンド | 必要なもの |
| --- | --- | --- |
| 型チェック・依存ルール | `npm run typecheck && npm run depcruise`（app） | なし |
| 単体 | `npm test`（app） | なし |
| 結合 | `npm run test:integration`（app） | Docker |
| シナリオ | `npx playwright test`（e2e） | Docker |

- コンテナはテスト全体で1回だけ起動する（シングルトン）
- シナリオテストは、サーバーの5xxや画面のJavaScriptエラーを検知した時点で即失敗する（`e2e/fixtures.ts`）
- 起動済みの環境に対して実行する場合は `E2E_BASE_URL`（シナリオ）や `TEST_DATABASE_URL` / `TEST_BLOB_CONNECTION_STRING`（結合）を指定する

## サプライチェーン対策

- `.npmrc` でインストールスクリプトを無効化し、CIでは `npm ci` と `npm audit signatures` を使う
- GitHub Actionsはコミットハッシュで固定する
- Dependabotは公開直後のバージョンを避ける（cooldown）
- 悪意あるパッケージの検知には [Socket](https://github.com/apps/socket-security) のGitHub Appを使う（リポジトリにインストールして有効化）
