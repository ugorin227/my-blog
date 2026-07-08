import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" className="block">
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet="/images/header-768.avif"
            type="image/avif"
          />
          <source
            media="(max-width: 768px)"
            srcSet="/images/header-768.webp"
            type="image/webp"
          />
          <source srcSet="/images/header-1200.avif" type="image/avif" />
          <source srcSet="/images/header-1200.webp" type="image/webp" />
          <img
            src="/images/header-1200.webp"
            alt={SITE_NAME}
            width={1024}
            height={571}
            decoding="async"
            fetchPriority="high"
            className="h-auto w-full"
          />
        </picture>
      </Link>
      <div className="mx-auto flex max-w-3xl justify-end px-6 py-2">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          記事一覧
        </Link>
      </div>
    </header>
  );
}
