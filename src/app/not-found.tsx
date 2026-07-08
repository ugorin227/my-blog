import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        404 — 記事が見つかりません
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        お探しの記事は存在しないか、削除された可能性があります。
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        記事一覧へ戻る
      </Link>
    </div>
  );
}
