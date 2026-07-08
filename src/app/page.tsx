import { BlogCard } from "@/components/BlogCard";
import { SetupGuide } from "@/components/SetupGuide";
import { getBlogList, isMicroCMSConfigured } from "@/lib/microcms";

export const revalidate = 60;

export default async function Home() {
  if (!isMicroCMSConfigured) {
    return <SetupGuide />;
  }

  const { contents } = await getBlogList();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <section className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          記事一覧
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          microCMS から取得した最新の記事です。
        </p>
      </section>

      {contents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          まだ記事がありません。microCMS の管理画面から記事を公開してください。
        </p>
      ) : (
        <div className="space-y-12">
          {contents.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
}
