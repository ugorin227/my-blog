import Link from "next/link";
import type { AdjacentBlogs } from "@/types/navigation";

type ArticleNavigationProps = {
  adjacent: AdjacentBlogs;
};

export function ArticleNavigation({ adjacent }: ArticleNavigationProps) {
  const { newer, older } = adjacent;

  if (!newer && !older) {
    return null;
  }

  return (
    <footer className="mt-16 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <nav
        aria-label="記事ナビゲーション"
        className="grid gap-4 sm:grid-cols-2"
      >
        {newer ? (
          <Link
            href={`/blog/${newer.id}`}
            className="group rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ← 新しい記事
            </span>
            <p className="mt-2 text-sm font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
              {newer.title}
            </p>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        {older ? (
          <Link
            href={`/blog/${older.id}`}
            className="group rounded-xl border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 sm:text-right dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              古い記事 →
            </span>
            <p className="mt-2 text-sm font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-50 dark:group-hover:text-blue-400">
              {older.title}
            </p>
          </Link>
        ) : null}
      </nav>
    </footer>
  );
}
