import type { MetadataRoute } from "next";
import { getAllBlogs, getCategories } from "@/lib/microcms";
import { SITE_URL } from "@/lib/site";

// 記事の公開がサイトマップへ即時反映されるよう、生成はリクエストごとに行う。
// （ISR の revalidate では新規記事がサイトマップに載らない事象が 2026-11-28 に確認されたため）
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await getAllBlogs();

  const blogEntries: MetadataRoute.Sitemap = blogs.map((blog) => ({
    url: `${SITE_URL}/blog/${blog.id}`,
    lastModified: blog.publishedAt ?? blog.revisedAt ?? blog.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categories = await getCategories();
  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => {
    const latest = blogs.find((blog) => blog.category?.id === category.id);
    return {
      url: `${SITE_URL}/?category=${category.id}`,
      lastModified: latest?.revisedAt ?? latest?.publishedAt ?? latest?.createdAt,
      changeFrequency: "weekly",
      priority: 0.6,
    };
  });

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...categoryEntries,
    ...blogEntries,
  ];
}
