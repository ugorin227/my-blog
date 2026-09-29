import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { publishCampingGearPost } from "@/lib/camping-gear/publish";
import { runWeeklyCampingGearPost } from "@/lib/camping-gear/run";
import { extractPostedGearUrls } from "@/lib/camping-gear/select";
import { GEAR_POST_TITLE_MARK } from "@/lib/camping-gear/types";
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

async function loadPostedUrls(): Promise<Set<string>> {
  if (!isMicroCMSConfigured) {
    return new Set();
  }

  const { contents } = await getBlogList(50);
  const urls = new Set<string>();

  for (const blog of contents) {
    if (!blog.title.includes(GEAR_POST_TITLE_MARK)) {
      continue;
    }

    for (const url of extractPostedGearUrls(blog.content ?? "")) {
      urls.add(url);
    }
  }

  return urls;
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
    loadPostedUrls,
    publish: dryRun ? undefined : publishCampingGearPost,
  });

  if (result.posted && result.contentId) {
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath(`/blog/${result.contentId}`);
  }

  const status =
    result.reason === "all_sources_failed"
      ? 502
      : result.reason === "publish_failed"
        ? 500
        : 200;

  return Response.json(result, { status });
}
