import { BlogCard } from "@/components/BlogCard";
import { BlogColumns } from "@/components/BlogColumns";
import { SetupGuide } from "@/components/SetupGuide";
import { getBlogList, getCategories, isMicroCMSConfigured } from "@/lib/microcms";

export const revalidate = 60;

type HomeProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

function requestedCategory(value: string | string[] | undefined): string | undefined {
  const category = Array.isArray(value) ? value[0] : value;
  if (!category || !/^[A-Za-z0-9_-]+$/.test(category)) {
    return undefined;
  }
  return category;
}

export default async function Home({ searchParams }: HomeProps) {
  if (!isMicroCMSConfigured) {
    return <SetupGuide />;
  }

  const params = await searchParams;
  const categories = await getCategories();
  const categoryId = requestedCategory(params.category);
  const selected = categories.find((category) => category.id === categoryId);
  const unknownCategory = Boolean(categoryId && !selected);
  const { contents } = unknownCategory
    ? { contents: [] }
    : await getBlogList(100, selected?.id);

  return (
    <BlogColumns
      categories={categories}
      activeCategoryId={selected?.id ?? (unknownCategory ? undefined : "all")}
    >
      <section className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {selected ? selected.name : "記事一覧"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {selected
            ? `${selected.name}の記事です。`
            : "最新の記事一覧です。"}
        </p>
      </section>

      {categoryId && !selected ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          このカテゴリーはありません。
        </p>
      ) : contents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {selected
            ? "このカテゴリーの記事はまだありません。"
            : "まだ記事がありません。microCMS の管理画面から記事を公開してください。"}
        </p>
      ) : (
        <div className="space-y-12">
          {contents.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </BlogColumns>
  );
}
