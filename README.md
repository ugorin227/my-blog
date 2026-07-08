# my-blog

microCMS をヘッドレス CMS として使う Next.js ブログサイトです。  
本番公開は **Firebase App Hosting** を利用します。

## 技術スタック

- Next.js 16（App Router）
- TypeScript
- Tailwind CSS
- [microCMS](https://microcms.io/)
- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## ローカル開発

### 1. microCMS で API を作成

1. [microCMS](https://microcms.io/) でサービスを作成
2. **API 作成** から `blogs` という API ID の API を追加
3. 以下のフィールドを設定

| フィールド ID | 種類           | 必須 |
| ------------- | -------------- | ---- |
| title         | テキストフィールド | ○    |
| content       | リッチエディタ     | ○    |
| eyecatch      | 画像             | -    |

4. テスト記事を 1 件以上公開

### 2. 環境変数を設定

`env.local.example` を `.env.local` にコピーし、値を入力します。

```powershell
copy env.local.example .env.local
```

| 変数名                     | 説明                                              |
| -------------------------- | ------------------------------------------------- |
| `MICROCMS_SERVICE_DOMAIN`  | サービス URL の `https://xxxx.microcms.io` の `xxxx` 部分 |
| `MICROCMS_API_KEY`         | microCMS 管理画面の API キー（GET 権限）              |

### 3. 開発サーバーを起動

```powershell
npm install
npm run dev
```

http://localhost:3000 を開いてください。

## ページ構成

| パス           | 内容       |
| -------------- | ---------- |
| `/`            | 記事一覧   |
| `/blog/[id]`   | 記事詳細   |

## Firebase で WEB 公開

Next.js の Server Components / ISR をそのまま使える **Firebase App Hosting** で公開します。

### 前提条件

- [Firebase プロジェクト](https://console.firebase.google.com/)を作成
- **Blaze（従量課金）プラン** にアップグレード（App Hosting に必須）
- [Node.js 20+](https://nodejs.org/) と [Git](https://git-scm.com/) をインストール

### 手順 A: Firebase CLI からローカルデプロイ（おすすめ・初回向け）

#### 1. Firebase CLI をセットアップ

```powershell
cd C:\Users\unhap\Projects\my-blog
npm install
npm run firebase:login
```

#### 2. App Hosting を初期化

```powershell
npm run firebase:init
```

対話形式で以下を設定します。

- 使用する Firebase プロジェクト
- バックエンド ID: `my-blog`（`firebase.json` と合わせる）
- リージョン: `asia-northeast1`（東京）などユーザーに近いリージョン
- ルートディレクトリ: `.`（プロジェクト直下）
- Node.js ランタイム: 推奨バージョン

初期化後、`.firebaserc` が作成されます（`.firebaserc.example` を参考にしても可）。

#### 3. API キーを Secret Manager に登録

API キーはリポジトリに含めず、Secret Manager で管理します。

```powershell
npm run firebase:secrets
```

プロンプトで microCMS の API キーを入力します。  
`apphosting.yaml` の `microcmsApiKey` シークレットとして参照されます。

#### 4. デプロイ

```powershell
npm run deploy:firebase
```

初回ビルドには数分かかることがあります。完了後、Firebase コンソールの **Hosting & Serverless > App Hosting** に表示される URL（例: `my-blog--xxxx.asia-northeast1.hosted.app`）で公開されます。

### 手順 B: GitHub 連携で自動デプロイ（運用向け）

1. プロジェクトを GitHub リポジトリに push
2. [Firebase コンソール](https://console.firebase.google.com/) → **Hosting & Serverless > App Hosting** → **バックエンドを作成**
3. GitHub を接続し、リポジトリ・ブランチ（`main`）・ルートディレクトリ（`.`）を設定
4. **環境変数** を設定
   - `MICROCMS_SERVICE_DOMAIN` = `84pn2ga8lc`
   - `MICROCMS_API_KEY` = microCMS の API キー（または Secret Manager 連携）
5. `main` ブランチへの push で自動デプロイ

### 設定ファイル

| ファイル | 役割 |
| -------- | ---- |
| `apphosting.yaml` | ランタイム設定・環境変数・シークレット参照 |
| `firebase.json` | App Hosting バックエンドとデプロイ対象の定義 |
| `.firebaserc` | Firebase プロジェクト ID（`firebase init` で生成） |

### カスタムドメイン

Firebase コンソールの App Hosting バックエンド設定から、独自ドメインを追加できます。

## 参考

- [microCMS 公式ドキュメント](https://document.microcms.io/)
- [Firebase App Hosting ドキュメント](https://firebase.google.com/docs/app-hosting)
- [App Hosting ローカルデプロイ](https://firebase.google.com/docs/app-hosting/alt-deploy)
