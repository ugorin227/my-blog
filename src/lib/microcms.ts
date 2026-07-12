import { createClient } from "microcms-js-sdk";
import type { Blog, BlogListResponse } from "@/types/blog";
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

export async function getBlogList(limit = 100): Promise<BlogListResponse> {
  const client = getClient();

  return client.get<BlogListResponse>({
    endpoint: "blogs",
    queries: {
      orders: "-publishedAt",
      limit,
    },
  });
}

export async function getBlogDetail(contentId: string): Promise<Blog> {
  const client = getClient();

  return client.get<Blog>({
    endpoint: "blogs",
    contentId,
  });
}

export async function getAllBlogIds(): Promise<string[]> {
  const { contents } = await getBlogList();
  return contents.map((blog) => blog.id);
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
