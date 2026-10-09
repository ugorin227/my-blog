import type { Metadata } from "next";
import { BlogCard } from "@/components/BlogCard";
import { BlogColumns } from "@/components/BlogColumns";
import { JsonLd } from "@/components/JsonLd";
import { SetupGuide } from "@/components/SetupGuide";
import { getBlogList, getCategories, isMicroCMSConfigured } from "@/lib/microcms";
import { blogJsonLd } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE_SUFFIX } from "@/lib/site";

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

function categoryDescription(name: string): string {
  return `${name}の記事一覧です。${SITE_DESCRIPTION}`;
}

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  if (!isMicroCMSConfigured) {
    return { title: { absolute: SITE_NAME }, description: SITE_DESCRIPTION };
  }

  const params = await searchParams;
  const categories = await getCategories();
  const categoryId = requestedCategory(params.category);
  const selected = categories.find((category) => category.id === categoryId);

  if (categoryId && !selected) {
    return {
      title: "カテゴリーが見つかりません",
      robots: { index: false, follow: true },
    };
  }

  if (!selected) {
    return {
      title: { absolute: SITE_NAME },
      description: SITE_DESCRIPTION,
      alternates: { canonical: "/" },
      openGraph: {
        type: "website",
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: "/",
      },
    };
  }

  const description = categoryDescription(selected.name);
  const { totalCount } = await getBlogList(1, selected.id);

  const title = `${selected.name}の記事｜${SITE_TITLE_SUFFIX}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/?category=${selected.id}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/?category=${selected.id}`,
    },
    robots: totalCount === 0 ? { index: false, follow: true } : undefined,
  };
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
      <JsonLd
        data={blogJsonLd(selected ? categoryDescription(selected.name) : SITE_DESCRIPTION)}
      />
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
