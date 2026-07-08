import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-base font-semibold leading-snug tracking-tight text-zinc-900 sm:text-lg dark:text-zinc-50"
        >
          {SITE_NAME}
        </Link>
        <nav>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            記事一覧
          </Link>
        </nav>
      </div>
    </header>
  );
}
