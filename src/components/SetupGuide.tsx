export function SetupGuide() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        microCMS ブログのセットアップ
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        環境変数が未設定のため、記事を取得できません。以下の手順で microCMS
        を接続してください。
      </p>

      <ol className="mt-8 space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        <li>
          <strong className="text-zinc-900 dark:text-zinc-100">1.</strong>{" "}
          <a
            href="https://microcms.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            microCMS
          </a>
          でサービスを作成
        </li>
        <li>
          <strong className="text-zinc-900 dark:text-zinc-100">2.</strong>{" "}
          API「blogs」を作成し、フィールドを追加
          <ul className="mt-2 list-inside list-disc space-y-1 pl-2 text-zinc-600 dark:text-zinc-400">
            <li>title（テキストフィールド・必須）</li>
            <li>content（リッチエディタ・必須）</li>
            <li>eyecatch（画像・任意）</li>
          </ul>
        </li>
        <li>
          <strong className="text-zinc-900 dark:text-zinc-100">3.</strong>{" "}
          プロジェクト直下に <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">.env.local</code>{" "}
          を作成
          <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-zinc-100">
{`MICROCMS_SERVICE_DOMAIN=your-service-id
MICROCMS_API_KEY=your-api-key`}
          </pre>
        </li>
        <li>
          <strong className="text-zinc-900 dark:text-zinc-100">4.</strong>{" "}
          開発サーバーを再起動（<code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">npm run dev</code>）
        </li>
      </ol>
    </div>
  );
}
