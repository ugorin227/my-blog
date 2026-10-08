import Link from "next/link";
import type { BlogCategory } from "@/types/blog";

type BlogColumnsProps = {
  categories: BlogCategory[];
  activeCategoryId?: string;
  children: React.ReactNode;
};

export function BlogColumns({
  categories,
  activeCategoryId,
  children,
}: BlogColumnsProps) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
      <aside className="md:sticky md:top-8">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
          カテゴリー
        </h2>
        <nav aria-label="カテゴリー" className="mt-3 flex flex-col gap-1">
          <CategoryLink href="/" current={activeCategoryId === "all"}>
            すべて
          </CategoryLink>
          {categories.map((category) => (
            <CategoryLink
              key={category.id}
              href={`/?category=${category.id}`}
              current={category.id === activeCategoryId}
            >
              {category.name}
            </CategoryLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function CategoryLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        current
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {children}
    </Link>
  );
}
