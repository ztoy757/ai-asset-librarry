# セキュリティチェックの方針

このリポジトリで、どの層のどんな脆弱性を、どのツールで検出しているかをまとめる。

## 対象とする環境

| 環境 | 内容 | この文書での扱い |
| --- | --- | --- |
| 実動作環境 | 本番・ステージングなど、アプリが実際に動く環境 | **本章で扱う** |
| 開発環境 | DevContainer / Codespaces、開発者の端末 | 今後追記 |
| CI/CD環境 | GitHub Actions、Dependabot、シークレット管理 | 今後追記 |

## 実動作環境

### 考え方

実動作環境を「アプリ」と「インフラ」に分け、各層で次の2種類の脆弱性を扱う。

- **要素自体の脆弱性**：ソースコード、ライブラリ、コンテナイメージなど、要素そのものに含まれる欠陥（CVEなど）
- **設定による脆弱性**：要素は安全でも、使い方や設定のせいで生まれる穴（公開設定、通信の暗号化、権限など）

### 対応状況

凡例：

- ✅ CIで自動検出し、失敗させる（マージ前に止まる）
- 🔔 自動で検出・通知するが、CIは止めない
- 🟡 一部だけ対応、または手動・テストでの確認
- ❌ 未対応
- ☁️ クラウド事業者の責任範囲（共有責任モデル）

| 大分類 | 層 | 要素自体の脆弱性 | 設定による脆弱性 |
| --- | --- | --- | --- |
| アプリ | 独自ソースコード | 🔔 CodeQL（security-extended）<br>✅ Trivy（秘密情報の混入） | 🟡 単体テストでセキュリティヘッダーを確認（CSP sandbox、nosniff） |
| アプリ | ライブラリ | ✅ Trivy（lockファイルの既知脆弱性）<br>🔔 Dependabot（更新PR、公開直後の版は3日待つ）<br>✅ npm audit signatures（改ざん・来歴の検証）<br>❌ 悪意あるパッケージの検知（Socketは未導入） | ❌ 専用ツールなし（DB接続のTLSなどはレビューで確認） |
| アプリ | ミドルウェア：フレームワーク<br>（Hono、React） | ✅ Trivy・🔔 Dependabot（npm依存として検出） | 🟡 Honoの secureHeaders、bodyLimit を単体テストで確認 |
| アプリ | ミドルウェア：言語<br>（Node.js） | 🟡 CIのたびに `node:22-alpine` の最新パッチを取得<br>🟡 Trivy（イメージスキャン、ランタイム自体の検出は限定的） | 🟡 Trivy（Dockerfileの設定）：非rootユーザーでの実行など |
| インフラ | XaaS<br>（Storage、PostgreSQL、Container Apps） | ☁️ Azureが管理<br>🔔 Dependabot（Terraformプロバイダーの更新） | ✅ Trivy（Terraformの設定ミス）<br>✅ tflint（azurermのルール）<br>✅ terraform test（公開設定、TLS、ネットワークの既定拒否、無料枠） |
| インフラ | コンテナ | ✅ Trivy（イメージスキャン）<br>🔔 Dependabot（ベースイメージの更新） | ✅ Trivy（Dockerfileの設定）<br>❌ 実行時の制限（読み取り専用FS、capabilities）は未設定 |
| インフラ | OS：カーネル<br>（ファイルシステム含む） | ☁️ Azureが管理（Container Appsのホスト） | ☁️ Azureが管理 |
| インフラ | OS：ライブラリ<br>（シェル含む） | ✅ Trivy（Alpineのパッケージ）<br>🟡 ビルド時に `apk upgrade` で最新化 | 🟡 実行時に不要なnpm・yarnは削除済み<br>❌ シェルは残っている（distroless未採用） |

### 各ツールの実行場所

| ツール | 対象 | 実行場所 |
| --- | --- | --- |
| CodeQL | 独自ソースコード | `.github/workflows/codeql.yaml` |
| Trivy fs | ライブラリ、秘密情報 | `.github/workflows/ci.yaml`（セキュリティスキャン） |
| Trivy config | Terraform、Dockerfile | 同上 |
| Trivy image | コンテナイメージ、OSライブラリ | 同上 |
| npm audit signatures | ライブラリの改ざん検証 | `.github/workflows/ci.yaml`（アプリ） |
| tflint / terraform test | XaaSの設定 | `.github/workflows/ci.yaml`（Terraform）、`infra/azure/tests/` |
| 単体テスト | アプリの設定（ヘッダーなど） | `app/test/unit/api.test.ts` |
| Dependabot | ライブラリ、ベースイメージ、プロバイダー | `.github/dependabot.yml` |

### 既知の課題（今後の候補）

- [ ] CodeQLの検出でマージを止める（ブランチ保護で必須チェックにする）
- [ ] Socketを導入し、悪意あるパッケージやタイポスクワッティングを検知する
- [ ] PostgreSQLへの接続経路を制限する（現状はAzure上で接続許可の設定がない）
- [ ] コンテナの実行時制限（読み取り専用FS、capabilitiesの削除）
- [ ] distrolessイメージでシェルを取り除く
- [ ] 実行中の環境の設定ずれを検知する（Defender for Cloud、Azure Policy）
