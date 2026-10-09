import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { SetupGuide } from "@/components/SetupGuide";
import { formatDate } from "@/lib/date";
import {
  getAdjacentBlogs,
  getAllBlogIds,
  getBlogDetail,
  getCategories,
  isMicroCMSConfigured,
} from "@/lib/microcms";
import { articleJsonLd, breadcrumbJsonLd, describeHtml, firstContentImage } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import { ArticleNavigation } from "@/components/ArticleNavigation";
import { BlogColumns } from "@/components/BlogColumns";

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
    const description = describeHtml(blog.content ?? "", blog.title);
    const image = blog.eyecatch?.url ?? firstContentImage(blog.content ?? "");
    const path = `/blog/${blog.id}`;

    return {
      title: blog.title,
      description,
      alternates: { canonical: path },
      openGraph: {
        type: "article",
        url: path,
        title: blog.title,
        description,
        publishedTime: blog.publishedAt ?? blog.createdAt,
        modifiedTime: blog.revisedAt ?? blog.publishedAt ?? blog.createdAt,
        tags: blog.category?.name ? [blog.category.name] : undefined,
        images: image ? [{ url: image, alt: blog.title }] : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: blog.title,
        description,
        images: image ? [image] : undefined,
      },
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

  const [adjacent, categories] = await Promise.all([
    getAdjacentBlogs(id),
    getCategories(),
  ]);

  const description = describeHtml(blog.content ?? "", blog.title);
  const image = blog.eyecatch?.url ?? firstContentImage(blog.content ?? "");
  const crumbs = [
    { name: "記事一覧", path: "/" },
    ...(blog.category
      ? [{ name: blog.category.name, path: `/?category=${blog.category.id}` }]
      : []),
    { name: blog.title, path: `/blog/${blog.id}` },
  ];

  return (
    <BlogColumns
      categories={categories}
      activeCategoryId={blog.category?.id}
    >
    <JsonLd
      data={articleJsonLd({
        id: blog.id,
        title: blog.title,
        content: blog.content ?? "",
        description,
        publishedAt: blog.publishedAt,
        revisedAt: blog.revisedAt,
        createdAt: blog.createdAt,
        categoryName: blog.category?.name,
        imageUrl: image,
      })}
    />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <article>
      <Link
        href={
          blog.category
            ? `/?category=${blog.category.id}`
            : "/"
        }
        className="inline-flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← {blog.category ? blog.category.name : "記事一覧"}へ
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
        {blog.category && (
          <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {blog.category.name}
          </p>
        )}
      </header>

      {blog.eyecatch && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <Image
            src={blog.eyecatch.url}
            alt={blog.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 896px"
          />
        </div>
      )}

      <div
        className="article-body mt-10"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      <ArticleNavigation adjacent={adjacent} />
    </article>
    </BlogColumns>
  );
}
