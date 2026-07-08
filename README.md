# my-blog

microCMS をヘッドレス CMS として使う Next.js ブログサイトです。  
本番公開は **Vercel（無料 Hobby プラン）** を利用します。

## 技術スタック

- Next.js 16（App Router）
- TypeScript
- Tailwind CSS
- [microCMS](https://microcms.io/)
- [Vercel](https://vercel.com/)

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
| `MICROCMS_WEBHOOK_SECRET`  | microCMS Webhook 用シークレット（後述）               |

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

## Vercel で WEB 公開（無料）

Next.js の Server Components / ISR をそのまま使える **Vercel Hobby プラン（無料）** で公開します。

リポジトリ: https://github.com/ugorin227/my-blog

### 手順 A: GitHub 連携（おすすめ）

1. [Vercel](https://vercel.com/) に GitHub アカウントでログイン
2. **Add New… > Project** を選択
3. `ugorin227/my-blog` を **Import**
4. フレームワークは **Next.js** が自動検出されます（変更不要）
5. **Environment Variables** に以下を追加

| Name | Value |
| ---- | ----- |
| `MICROCMS_SERVICE_DOMAIN` | `84pn2ga8lc` |
| `MICROCMS_API_KEY` | microCMS の API キー |
| `MICROCMS_WEBHOOK_SECRET` | Webhook 用シークレット（任意の長い文字列） |

6. **Deploy** をクリック

完了後、`https://my-blog-xxxx.vercel.app` のような URL で公開されます。  
`main` ブランチへの push で自動的に再デプロイされます。

### 手順 B: Vercel CLI からデプロイ

```powershell
cd C:\Users\unhap\Projects\my-blog
npm install
npm run vercel:login
npm run vercel:deploy
```

初回はプロジェクト名やスコープの確認があります。環境変数は [Vercel ダッシュボード](https://vercel.com/dashboard) の **Settings > Environment Variables** で設定してください。

### カスタムドメイン

Vercel ダッシュボードの **Settings > Domains** から独自ドメインを追加できます（無料枠で利用可）。

## microCMS 公開時の自動更新

記事を公開・更新・削除したときにサイトへ即時反映するため、**microCMS Webhook → Next.js On-demand Revalidation** を使います。  
Vercel のフル Redeploy より高速で、ビルド時間も消費しません。

### 1. Webhook 用シークレットを決める

任意の長いランダム文字列を生成します（例: `openssl rand -hex 32`）。

### 2. 環境変数を追加

| 場所 | 変数名 | 値 |
| ---- | ------ | -- |
| `.env.local` | `MICROCMS_WEBHOOK_SECRET` | 上で決めたシークレット |
| Vercel ダッシュボード | `MICROCMS_WEBHOOK_SECRET` | 同じ値 |

Vercel に追加後、**Redeploy** してください（`/api/revalidate` を本番に反映するため）。

### 3. microCMS で Webhook を設定

1. microCMS 管理画面 → **サービス設定** → **Webhook**
2. **追加** をクリック
3. 以下を設定

| 項目 | 値 |
| ---- | -- |
| 通知 URL | `https://my-blog-two-amber.vercel.app/api/revalidate` |
| シークレット | 手順 1 と同じ値 |
| トリガー | API「blogs」の **公開・更新・削除** |

4. 保存

### 動作

1. microCMS で記事を公開・更新・削除
2. microCMS が Webhook で `/api/revalidate` に POST
3. 署名を検証後、`/` と `/blog/[id]` のキャッシュを無効化
4. 次のアクセス時に最新内容が表示される

### フル Redeploy が必要な場合（参考）

コード変更時は GitHub への push で Vercel が自動デプロイします。  
コンテンツ更新だけなら Webhook 連携で十分です。

## Firebase App Hosting（有料・参考）

Blaze プランが必要なため、無料運用には Vercel を推奨します。Firebase を使う場合は `apphosting.yaml` と `firebase.json` を参照してください。

## 参考

- [microCMS 公式ドキュメント](https://document.microcms.io/)
- [Vercel ドキュメント](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
