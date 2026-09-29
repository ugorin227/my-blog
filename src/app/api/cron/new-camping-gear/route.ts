import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { publishCampingGearPost } from "@/lib/camping-gear/publish";
import { runWeeklyCampingGearPost } from "@/lib/camping-gear/run";
import { extractPostedGearUrls } from "@/lib/camping-gear/select";
import {
  AMAZON_POST_TITLE_MARK,
  GEAR_POST_TITLE_MARK,
  type PostedHistory,
} from "@/lib/camping-gear/types";
import { getBlogList, isMicroCMSConfigured } from "@/lib/microcms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization");
  if (!header) {
    return false;
  }

  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

async function loadPostedHistory(): Promise<PostedHistory> {
  if (!isMicroCMSConfigured) {
    return { urls: new Set(), titles: [] };
  }

  const { contents } = await getBlogList(50);
  const urls = new Set<string>();
  const titles: string[] = [];

  for (const blog of contents) {
    titles.push(blog.title);

    const tracksProducts =
      blog.title.includes(GEAR_POST_TITLE_MARK) ||
      blog.title.includes(AMAZON_POST_TITLE_MARK);

    if (!tracksProducts) {
      continue;
    }

    for (const url of extractPostedGearUrls(blog.content ?? "")) {
      urls.add(url);
    }
  }

  return { urls, titles };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return Response.json(
      { message: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (!isAuthorized(request, secret)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const result = await runWeeklyCampingGearPost({
    dryRun,
    loadPostedHistory,
    publish: dryRun ? undefined : publishCampingGearPost,
  });

  if (result.posted && result.contentId) {
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath(`/blog/${result.contentId}`);
  }

  const status =
    result.reason === "all_sources_failed" ||
    result.reason === "amazon_bestsellers_unavailable"
      ? 502
      : result.reason === "publish_failed"
        ? 500
        : 200;

  return Response.json(result, { status });
}
