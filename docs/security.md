# セキュリティチェックの方針

このリポジトリで、どの層のどんな脆弱性を、どのツールで検出しているかをまとめる。

## 対象とする環境

| 環境 | 内容 | この文書での扱い |
| --- | --- | --- |
| 実動作環境 | 本番・ステージングなど、アプリが実際に動く環境 | **本章で扱う** |
| 開発環境 | DevContainer / Codespaces、開発者の端末 | 今後追記 |
| CI/CD環境 | GitHub Actions、Dependabot、シークレット管理 | 今後追記 |

## 実動作環境

本番で稼働しているものに脆弱性があったとき、それに気づけるかどうかに絞って整理する。
開発の途中で混入を防ぐためのチェック（秘密情報の混入、lockファイルの検証など）は「[その他のチェック](#その他のチェック)」に分ける。

### 考え方

実動作環境を「アプリ」と「インフラ」に分け、各層で次の2種類の脆弱性を扱う。

- **要素自体の脆弱性**：ソースコード、ライブラリ、コンテナイメージなど、要素そのものに含まれる欠陥（CVEなど）
- **設定による脆弱性**：要素は安全でも、使い方や設定のせいで生まれる穴（公開設定、通信の暗号化、権限など）

### 凡例

「本番に含まれる」は、デプロイ前だけでなく、稼働中の本番（mainブランチや本番環境そのもの）も検知の対象になっていることを指す。
稼働後に新しく公表された脆弱性にも気づけるかどうかの違いになる。

| 記号 | 意味 |
| --- | --- |
| 🟢 | 本番に含まれ、通知がある |
| 🟡 | 本番に含まれるが、通知がない（自分から見に行かないと気づかない） |
| 🔵 | 本番に含まれないが、通知または修正の仕組みがある（CIの失敗、Dependabotの更新PRなど） |
| 🔴 | 本番に含まれず、通知も修正もない |
| ☁️ | クラウド事業者の責任範囲（共有責任モデル） |

### 対応状況

| 大分類 | 層 | 要素自体の脆弱性 | 設定による脆弱性 |
| --- | --- | --- | --- |
| アプリ | 独自ソースコード | 🟡 CodeQL（mainへのpushと週1回の定期実行。結果はSecurityタブ） | 🔵 単体テスト（セキュリティヘッダー、本番で開発用の接続先を使わないこと） |
| アプリ | ライブラリ | 🟢 Dependabotアラート（mainの依存を常時監視）<br>🔵 Trivy（CI）、Dependabotの更新PR | 🔴 なし |
| アプリ | ミドルウェア：フレームワーク<br>（Hono、React） | 🟢 Dependabotアラート<br>🔵 Trivy（CI）、Dependabotの更新PR | 🔵 単体テスト（secureHeaders、bodyLimit） |
| アプリ | ミドルウェア：言語<br>（Node.js） | 🔵 Dependabot（ベースイメージの更新PR）<br>🔵 Trivy（CIでのイメージスキャン。ランタイム自体の検出は限定的） | 🔵 Trivy（CIでのDockerfileスキャン：非rootでの実行など） |
| インフラ | XaaS<br>（Storage、PostgreSQL、Container Apps） | ☁️ Azureが管理 | 🔵 Trivy・tflint・terraform test（CIでのTerraformチェック）<br>🔴 稼働中の設定ずれは未検知 |
| インフラ | コンテナ | 🔵 Trivy（CIでのイメージスキャン）、Dependabot（ベースイメージの更新PR）<br>🔴 デプロイ済みイメージの再スキャンなし | 🔵 Trivy（CIでのDockerfileスキャン）<br>🔴 実行時の制限（読み取り専用FS、capabilities）は未設定 |
| インフラ | OS：カーネル<br>（ファイルシステム含む） | ☁️ Azureが管理（Container Appsのホスト） | ☁️ Azureが管理 |
| インフラ | OS：ライブラリ<br>（シェル含む） | 🔵 Trivy（CIでのイメージスキャン）、ビルド時の `apk upgrade`<br>🔴 デプロイ済みイメージの再スキャンなし | 🔴 シェルが残っている（distroless未採用） |

補足：

- Dependabotアラートは、リポジトリの Settings → Advanced Security で有効になっている必要がある
- CodeQLの結果は、ブランチ保護で必須チェックにしない限りマージを止めない

### 実動作環境の課題

多くの検知がCI（デプロイ前）に限られていて、稼働後に公表された脆弱性に気づきにくい。

- [ ] デプロイ済みのコンテナイメージを定期的に再スキャンし、結果を通知する
- [ ] CodeQLの新しい検出を通知する（またはブランチ保護で必須チェックにする）
- [ ] 稼働中の環境の設定ずれを検知する（Defender for Cloud、Azure Policy）
- [ ] PostgreSQLへの接続経路を制限する（現状はAzure上で接続許可の設定がない）
- [ ] コンテナの実行時制限（読み取り専用FS、capabilitiesの削除）
- [ ] distrolessイメージでシェルを取り除く
- [ ] ライブラリの設定（DB接続のTLSなど）を確認する仕組み

## その他のチェック

本番稼働中の検知ではなく、脆弱なものや危険なものを本番に持ち込まないためのチェック。

| 対象 | チェック | 実行場所 |
| --- | --- | --- |
| 秘密情報の混入 | Trivy（secret） | CI（セキュリティスキャン） |
| 依存の既知脆弱性（lockファイル） | Trivy（vuln） | CI（セキュリティスキャン） |
| 依存の改ざん・来歴 | npm audit signatures | CI（アプリ） |
| 依存の取り込み方 | lockファイルどおりの `npm ci`、インストールスクリプトの無効化（`.npmrc`） | CI、開発環境 |
| 公開直後のバージョンの回避 | Dependabotのcooldown（3日、メジャーは7日） | `.github/dependabot.yml` |
| 悪意あるパッケージ・タイポスクワッティング | ❌ 未導入（Socketを検討） | — |

## 各ツールの実行場所

| ツール | 実行場所 |
| --- | --- |
| CodeQL | `.github/workflows/codeql.yaml` |
| Trivy（fs、config、image） | `.github/workflows/ci.yaml`（セキュリティスキャン） |
| npm audit signatures | `.github/workflows/ci.yaml`（アプリ） |
| tflint、terraform test | `.github/workflows/ci.yaml`（Terraform）、`infra/azure/tests/` |
| 単体テスト | `app/test/unit/` |
| Dependabot | `.github/dependabot.yml`、リポジトリ設定（アラート） |
