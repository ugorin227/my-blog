import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/"
        aria-label={SITE_NAME}
        className="relative block h-[210px] overflow-hidden sm:h-[250px] md:h-[320px] lg:h-[380px] xl:h-[420px]"
      >
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet="/images/header-hustler-768.webp"
            type="image/webp"
          />
          <source
            media="(max-width: 768px)"
            srcSet="/images/header-hustler-768.jpg"
            type="image/jpeg"
          />
          <source srcSet="/images/header-hustler-1920.webp" type="image/webp" />
          <img
            src="/images/header-hustler-1920.jpg"
            alt=""
            width={1920}
            height={640}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          />
        </picture>
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent"
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/35 to-transparent"
        />
        <span className="absolute left-5 top-5 sm:left-8 sm:top-7 md:left-10 md:top-9">
          <span className="block text-3xl font-bold tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.6)] sm:text-4xl md:text-5xl">
            ゆるっとソロキャン
          </span>
          <span className="mt-2 block text-sm font-medium text-zinc-100 [text-shadow:0_1px_10px_rgba(0,0,0,0.65)] sm:text-base md:text-lg">
            形から入るキャンプ道具沼
          </span>
        </span>
      </Link>
      <div className="mx-auto flex max-w-6xl justify-end px-6 py-2">
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
