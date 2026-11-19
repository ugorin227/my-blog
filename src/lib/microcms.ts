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
      fields: "id,name",
    },
  });

  return data.contents.filter((category) => category.id && category.name);
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
  const limit = 100;
  let offset = 0;
  const blogs: Blog[] = [];

  while (true) {
    const data = await client.get<BlogListResponse>({
      endpoint: "blogs",
      queries: {
        orders: "-publishedAt",
        limit,
        offset,
      },
    });

    blogs.push(...publishedOnly(data.contents));

    if (offset + data.contents.length >= data.totalCount) {
      break;
    }

    offset += limit;
  }

  return blogs;
}

function toNavItem(blog: Blog): BlogNavItem {
  return { id: blog.id, title: blog.title };
}

export async function getAdjacentBlogs(contentId: string): Promise<AdjacentBlogs> {
  const { contents } = await getBlogList();
  const index = contents.findIndex((blog) => blog.id === contentId);

  if (index === -1) {
    return { newer: null, older: null };
  }

  return {
    newer: index > 0 ? toNavItem(contents[index - 1]) : null,
    older:
      index < contents.length - 1 ? toNavItem(contents[index + 1]) : null,
  };
}
