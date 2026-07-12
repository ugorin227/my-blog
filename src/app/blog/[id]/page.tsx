import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SetupGuide } from "@/components/SetupGuide";
import { formatDate } from "@/lib/date";
import {
  getAdjacentBlogs,
  getAllBlogIds,
  getBlogDetail,
  isMicroCMSConfigured,
} from "@/lib/microcms";
import { SITE_NAME } from "@/lib/site";
import { ArticleNavigation } from "@/components/ArticleNavigation";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  if (!isMicroCMSConfigured) {
    return [];
  }

  const ids = await getAllBlogIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps) {
  if (!isMicroCMSConfigured) {
    return { title: SITE_NAME };
  }

  const { id } = await params;

  try {
    const blog = await getBlogDetail(id);
    return {
      title: `${blog.title} | ${SITE_NAME}`,
      description: blog.title,
    };
  } catch {
    return { title: `記事が見つかりません | ${SITE_NAME}` };
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  if (!isMicroCMSConfigured) {
    return <SetupGuide />;
  }

  const { id } = await params;

  let blog;
  try {
    blog = await getBlogDetail(id);
  } catch {
    notFound();
  }

  const adjacent = await getAdjacentBlogs(id);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← 記事一覧へ
      </Link>

      <header className="mt-8">
        <time
          dateTime={blog.publishedAt ?? blog.createdAt}
          className="text-sm text-zinc-500 dark:text-zinc-400"
        >
          {formatDate(blog.publishedAt ?? blog.createdAt)}
        </time>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
          {blog.title}
        </h1>
      </header>

      {blog.eyecatch && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <Image
            src={blog.eyecatch.url}
            alt={blog.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      <div
        className="article-body mt-10"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      <ArticleNavigation adjacent={adjacent} />
    </article>
  );
}
