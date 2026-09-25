# AI生成物ライブラリ 要件定義書

2026-09-26 · Toy

## 1. 目的

主目的はAIDLCの検証。題材として、AI生成物を保管・管理するアプリを育てる。

- **AIDLCの検証（主目的）**：人がIssueを作り、AIが要件定義から実装・テスト・PR作成までを行う流れを段階的に自動化する。人が関わるのは要件定義とPRレビューだけにする
- **題材**：生成物でPCの容量が圧迫され、保存先に困っている問題を解決するアプリ
- **成功条件**：事前には固定せず、どうなるかを観察する。理想は、人の関与を上記2点に絞ったうえで、一定のアジリティと効率を出せること
- テスト、Terraform、Trivy、Dependabotは、AIの変更を採用するかを判断するためのAIDLCの構成要素として扱う

**AIDLCの進め方（段階）**

| 段階 | 内容 | 人の関与 |
| --- | --- | --- |
| 1 | 人が実装し、CIが審判する。テスト、dependency-cruiser、Trivy、Dependabotが自動で回る状態を作る | 実装とレビュー |
| 2 | 依存更新・脆弱性対応の自動化。DependabotのPRはテストが通れば自動マージ、落ちたらAIが修正を試みる | 例外時のみ |
| 3 | 人が書いた要件を元に、AIが実装とPR作成を行う | 要件定義とPRレビュー |
| 4 | 人はIssueを書くだけ。AIが要件定義を起こし、人が承認してから実装に進む | Issue作成、要件の承認、PRレビュー |

## 2. スコープ

利用者は自分一人。アプリは小さく保ち、テスト・インフラ・CIの仕組みを厚くする。

**やること**

- 生成物のアップロード、一覧、メタデータ管理、整理ルール
- 3層のテスト、Terraform、GitHub ActionsによるCIとDependabot

**やらないこと（当面）**

- 費用が発生するAzureリソースの利用と実デプロイ
- 生成物そのものの生成（外部のAIサービスで作ったものを取り込むだけ）

## 3. 機能要件（リリース計画）

v1で最小の保管機能を作り、v2以降でルールを段階的に足していく。各バージョンが1回分の機能追加の検証になる。

| 版 | 機能 | 検証の狙い |
| --- | --- | --- |
| v1 | 画像・音楽・動画のアップロードと一覧表示。本体はBlob、メタデータはPostgreSQLに保存 | オニオンアーキテクチャで理想形の土台を作り、AIDLCの流れを一通り通す |
| v2 | 生成時のメタデータ記録（プロンプト、モデル名、シード値、パラメータ） | スキーマ変更を伴う機能追加 |
| v3 | お気に入り・評価、タグ付け | 画面と検索条件の追加 |
| v4 | 整理ルール（評価なしで30日経過したら削除候補、同じシードとプロンプトの重複検出） | ドメインロジックの追加と単体テスト |
| v5 | 保存先の階層化（Hot / Cool / Archiveへの自動移動） | Blobのライフサイクル管理をTerraformで表現 |
| v6 | 生成サービスごとの利用規約管理（商用利用の可否など） | ルール変更に強い設計かの確認 |

## 4. 技術構成と非機能要件

Node.js / TypeScriptで構成し、npmのサプライチェーン対策も検証対象に含める。

| 領域 | 採用技術 |
| --- | --- |
| アプリ | Hono（サーバー）+ React / Vite（画面）、TypeScript。Honoがビルド済みの画面も配信し、1つのアプリとしてデプロイする |
| パッケージ管理 | npm |
| メタデータ | PostgreSQL |
| ファイル本体 | Azure Blob（ローカルではAzurite） |
| テスト | Vitest、Testcontainers、Playwright |
| インフラ | Terraform |
| CI / セキュリティ | GitHub Actions、Trivy、Dependabot、Socket.dev |

**アーキテクチャ**

- サーバー側をオニオンアーキテクチャ（domain / application / infrastructure / presentation）で構成する。Honoのルーティングはpresentation層、React画面はAPIを呼ぶだけにする
- dependency-cruiserで層の依存ルールをテストし、違反をCIで検出する（JavaのArchUnitに当たる）

**リポジトリ構成**

```
ai-asset-library/
├── app/          # Hono + React（Vite）
├── e2e/          # Playwright + Testcontainers
├── infra/
│   ├── azure/    # azurerm（静的チェックとtestのみ）
│   └── local/    # dockerプロバイダー
└── .github/      # workflows, dependabot.yml
```

**非機能要件**

- 費用ゼロで開発・検証できること
- テストが偽の緑にならないこと（エラー画面や5xxで必ず失敗する）
- テストが遅すぎて回されなくなることがないこと

## 5. テスト戦略

単体・結合・シナリオの3層で、画面を通すテストは主要フローの少数に絞る。

| 層 | 対象 | 手段 | 量 |
| --- | --- | --- | --- |
| 単体 | ドメインロジック（整理ルールなど） | Vitest | 一番多い |
| 結合 | リポジトリ、Blobの読み書き | Testcontainers（PostgreSQL、Azurite） | 中くらい |
| シナリオ | 主要な業務フロー | Playwright + Testcontainers（アプリ本体） | 少数 |

**シナリオテストの方針**

- コンテナはシングルトンで1回だけ起動し、全テストで共有する
- エラー画面や5xxを検知したら即失敗させる共通処理を入れる
- デフォルトのタイムアウトを短くし、固定sleepは使わない

**アーキテクチャテスト**

- 最初からオニオンアーキテクチャで作り、理想形でのAIDLCを検証する
- dependency-cruiserで層の依存ルールを検証し、AIが層を崩した変更をCIで止める

## 6. インフラとCI/CD

Terraformは無料の範囲で検証し、Azureへの実デプロイは必要になるまで行わない。

**Terraform**

- `infra/azure`：静的チェック（fmt、validate、tflint、Trivyの設定スキャン）と、mock_providerを使った `terraform test`
- `infra/local`：dockerプロバイダーで、アプリ・PostgreSQL・Azuriteをローカルに構築する
- 実デプロイを試す場合は、Azureの無料アカウントで短期間だけ行い、予算アラートと `terraform destroy` を徹底する

**GitHub Actions**

- `npm test`（3層のテスト）
- Terraformの静的チェックと `terraform test`
- Trivy（コンテナイメージとTerraformの設定）

**Dependabot**

- npm、Docker、GitHub Actions、Terraformの依存を監視する
- 依存更新のPRで主要フローのシナリオテストが回ることを確認する

**サプライチェーン対策（npm）**

- lockファイルをコミットし、CIでは `npm ci` を使う
- インストールスクリプトは原則無効（`--ignore-scripts`）にし、必要なものだけ許可する
- Socket.devなどで、悪意あるパッケージやタイポスクワッティングを検知する
- 新しい依存の追加は、AIの変更でも人がPRで確認する

**効果の記録**

- テスト全体の実行時間（改善前と改善後）
- テストが捕まえた問題の件数（特にDependabotのPR）

## 7. 前提・未決事項

- [x] Webフレームワーク：Hono + React（Vite）に決定
- [ ] GitHubの公開リポジトリにするか（Zenn・Qiitaの記事にするなら公開が楽）
- [ ] 認証を入れるか（利用者が自分一人なら不要の可能性）
- [ ] 実データの保存先をどうするか（外付けHDD・NAS、将来的にAzure BlobのCool / Archive層）
