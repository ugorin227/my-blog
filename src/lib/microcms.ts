import { createClient } from "microcms-js-sdk";
import type { Blog, BlogCategory, BlogListResponse } from "@/types/blog";
import type { AdjacentBlogs, BlogNavItem } from "@/types/navigation";

const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_API_KEY;

export const isMicroCMSConfigured = Boolean(serviceDomain && apiKey);

function getClient() {
  if (!serviceDomain || !apiKey) {
    throw new Error(
      "microCMS の環境変数が設定されていません。.env.local を確認してください。",
    );
  }

  return createClient({
    serviceDomain,
    apiKey,
  });
}

/**
 * microCMS の読み取りキーでは下書き（publishedAt が無いコンテンツ）も
 * 取得できてしまうため、サイト側では公開済みの記事だけを表示する。
 */
export function isPublishedBlog(blog: {
  publishedAt?: string | null;
}): boolean {
  return Boolean(blog.publishedAt);
}

export function publishedOnly<T extends { publishedAt?: string | null }>(
  blogs: T[],
): T[] {
  return blogs.filter(isPublishedBlog);
}

type CategoryListResponse = {
  contents: BlogCategory[];
  totalCount: number;
  offset: number;
  limit: number;
};

export async function getCategories(): Promise<BlogCategory[]> {
  const client = getClient();

  const data = await client.get<CategoryListResponse>({
    endpoint: "categories",
    queries: {
      orders: "publishedAt",
      limit: 100,
    },
  });

  return data.contents;
}

export async function getBlogList(
  limit = 100,
  categoryId?: string,
): Promise<BlogListResponse> {
  const client = getClient();

  const data = await client.get<BlogListResponse>({
    endpoint: "blogs",
    queries: {
      orders: "-publishedAt",
      limit,
      ...(categoryId ? { filters: `category[equals]${categoryId}` } : {}),
    },
  });

  const contents = publishedOnly(data.contents);
  return { ...data, contents, totalCount: contents.length };
}

export async function getBlogDetail(contentId: string): Promise<Blog> {
  const client = getClient();

  const blog = await client.get<Blog>({
    endpoint: "blogs",
    contentId,
  });

  if (!isPublishedBlog(blog)) {
    throw new Error("この記事はまだ公開されていません。");
  }

  return blog;
}

export async function getAllBlogIds(): Promise<string[]> {
  const blogs = await getAllBlogs();
  return blogs.map((blog) => blog.id);
}

export async function getAllBlogs(): Promise<Blog[]> {
  const client = getClient();
  const blogs: Blog[] = [];
  let offset = 0;

  for (;;) {
    const data = await client.get<BlogListResponse>({
      endpoint: "blogs",
      queries: {
        orders: "-publishedAt",
        limit: 100,
        offset,
      },
    });

    blogs.push(...publishedOnly(data.contents));

    if (data.contents.length < 100 || blogs.length >= data.totalCount) {
      break;
    }

    offset += 100;
  }

  return blogs;
}

export async function getAdjacentBlogs(
  currentBlog: Blog,
): Promise<AdjacentBlogs> {
  const allBlogs = await getAllBlogs();

  const sortedBlogs = allBlogs
    .filter((blog) => blog.publishedAt)
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime(),
    );

  const currentIndex = sortedBlogs.findIndex(
    (blog) => blog.id === currentBlog.id,
  );

  const toNavItem = (blog: Blog): BlogNavItem => ({
    id: blog.id,
    title: blog.title,
  });

  return {
    prev: currentIndex > 0 ? toNavItem(sortedBlogs[currentIndex - 1]) : null,
    next:
      currentIndex >= 0 && currentIndex < sortedBlogs.length - 1
        ? toNavItem(sortedBlogs[currentIndex + 1])
        : null,
  };
}
