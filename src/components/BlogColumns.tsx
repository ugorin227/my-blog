import { CategoryNav } from "@/components/CategoryNav";
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
    <div className="mx-auto grid max-w-6xl gap-6 px-6 pt-4 pb-12 md:grid-cols-[220px_minmax(0,1fr)] md:items-start md:gap-10 md:py-12">
      <CategoryNav categories={categories} activeCategoryId={activeCategoryId} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
