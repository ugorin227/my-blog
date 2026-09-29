import type { RawItem } from "@/lib/camping-gear/types";
import { cleanText, resolveUrl } from "@/lib/camping-gear/text";

function pushItem(items: RawItem[], item: RawItem) {
  if (item.title && item.url && item.dateText) {
    items.push(item);
  }
}

export function parseLogosNews(html: string, listUrl: string): RawItem[] {
  const items: RawItem[] = [];

  for (const match of html.matchAll(/<article\b[\s\S]*?<\/article>/gi)) {
    const block = match[0];
    const href = block.match(/<a href="([^"]+)"/i)?.[1];
    const image = block.match(/<img[^>]+src="([^"]+)"/i)?.[1];
    const title = cleanText(block.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1] ?? "");
    const dateText = cleanText(block.match(/<time>([\s\S]*?)<\/time>/i)?.[1] ?? "");
    const categories = [...block.matchAll(/<p class="cat">([\s\S]*?)<\/p>/gi)].map(
      (category) => cleanText(category[1]),
    );

    if (!href) {
      continue;
    }

    pushItem(items, {
      title,
      url: resolveUrl(href, listUrl),
      dateText,
      categories,
      imageUrl: image ? resolveUrl(image, listUrl) : undefined,
    });
  }

  return items;
}

export function parseCaptainStagNews(html: string, listUrl: string): RawItem[] {
  const items: RawItem[] = [];
  const pattern =
    /<a href="([^"]+)"[\s\S]*?<span class="ico_cate">([\s\S]*?)<\/span>[\s\S]*?<span class="news_date">([\s\S]*?)<\/span>[\s\S]*?<span class="news_title">([\s\S]*?)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    pushItem(items, {
      url: resolveUrl(match[1], listUrl),
      categories: [cleanText(match[2])],
      dateText: cleanText(match[3]),
      title: cleanText(match[4]),
    });
  }

  return items;
}

export function parseColemanNews(html: string, listUrl: string): RawItem[] {
  const items: RawItem[] = [];
  const pattern =
    /<span class="date-cate[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span class="date-txt">([\s\S]*?)<\/span>[\s\S]*?<div class="news-list-ttl">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    pushItem(items, {
      categories: [cleanText(match[1])],
      dateText: cleanText(match[2]),
      url: resolveUrl(match[3], listUrl),
      title: cleanText(match[4]),
    });
  }

  return items;
}

export function parseCampalNews(html: string, listUrl: string): RawItem[] {
  const items: RawItem[] = [];
  const pattern =
    /<li><a href="(\/news\/[^"]+)">[\s\S]*?<p class="date">([\s\S]*?)<\/p>[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;

  for (const match of html.matchAll(pattern)) {
    pushItem(items, {
      url: resolveUrl(match[1], listUrl),
      dateText: cleanText(match[2]),
      title: cleanText(match[3]),
      summary: cleanText(match[4]),
    });
  }

  return items;
}

export function parseCainzNews(html: string, listUrl: string): RawItem[] {
  const items: RawItem[] = [];
  const pattern =
    /<a class="m-newsList__item--block" href="([^"]+)">[\s\S]*?<div class="m-newsList__item--content[^"]*">\s*([\s\S]*?)\s*<\/div>[\s\S]*?<div class="m-newsList__item--date">([\s\S]*?)<\/div>[\s\S]*?<span>([\s\S]*?)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    pushItem(items, {
      url: resolveUrl(match[1], listUrl),
      title: cleanText(match[2]),
      dateText: cleanText(match[3]),
      categories: [cleanText(match[4])],
    });
  }

  return items;
}

export function parseDcmNews(html: string, listUrl: string): RawItem[] {
  const items: RawItem[] = [];
  const pattern =
    /<li class="mod-newsList-item[\s\S]*?<span class="[^"]*rt_cf_n_date">([\s\S]*?)<\/span>[\s\S]*?<span class="[^"]*rt_cf_n_category_name_ja[^"]*">([\s\S]*?)<\/span>[\s\S]*?<a href="([^"]+)"[\s\S]*?<span class="rt_cf_n_title">([\s\S]*?)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    pushItem(items, {
      dateText: cleanText(match[1]),
      categories: [cleanText(match[2])],
      url: resolveUrl(match[3], listUrl),
      title: cleanText(match[4]),
    });
  }

  return items;
}
