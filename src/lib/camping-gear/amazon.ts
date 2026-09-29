import https from "https";
import type { AmazonPick } from "@/lib/camping-gear/types";
import {
  AMAZON_ASSOCIATE_TAG,
  AMAZON_BESTSELLERS_URL,
  PRODUCTS_PER_POST,
  REVIEW_SUMMARY_MAX,
  REVIEW_SUMMARY_MIN,
} from "@/lib/camping-gear/types";
import { cleanText } from "@/lib/camping-gear/text";

export type BestsellerItem = {
  rank: number;
  asin: string;
  title: string;
};

const AMAZON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "ja-JP,ja;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

export function amazonAssociateTag(): string {
  const configured = process.env.AMAZON_ASSOCIATE_TAG?.trim();
  return configured || AMAZON_ASSOCIATE_TAG;
}

export function amazonAffiliateUrl(asin: string, tag = amazonAssociateTag()): string {
  return `https://www.amazon.co.jp/dp/${asin}?tag=${encodeURIComponent(tag)}`;
}

export function parseBestsellerItems(html: string): BestsellerItem[] {
  const items: BestsellerItem[] = [];

  for (const part of html.split('id="gridItemRoot"').slice(1)) {
    const asin = part.match(/data-asin="([A-Z0-9]{10})"/)?.[1];
    const rank = Number(part.match(/zg-bdg-text">#(\d+)/)?.[1]);
    const title = cleanText(
      part.match(/p13n-sc-css-line-clamp-3[^"]*">([\s\S]*?)<\/div>/)?.[1] ??
        part.match(/<img alt="([^"]+)"/)?.[1] ??
        "",
    );

    if (!asin || !rank || !title) {
      continue;
    }

    items.push({ rank, asin, title });
  }

  return items.sort((a, b) => a.rank - b.rank);
}

export function parseProductTitle(html: string, fallback: string): string {
  const title = cleanText(
    html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "",
  );
  return title || fallback;
}

export function parseProductImages(html: string, limit = 3): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/"hiRes":"(https:\/\/[^"]+)"/g)) {
    const url = match[1].replace(/\\u0026/g, "&");
    const id = url.match(/\/I\/([A-Za-z0-9+-]+)\./)?.[1];
    if (!id || seen.has(id) || !url.includes("/images/I/")) {
      continue;
    }

    seen.add(id);
    urls.push(url);

    if (urls.length >= limit) {
      break;
    }
  }

  return urls;
}

export function parseAspectSummaries(html: string): string[] {
  return [...html.matchAll(/data-testid="aspect-summary"[^>]*>([\s\S]*?)<\/span>/g)]
    .map((match) => cleanText(match[1]))
    .filter((text) => text.length >= 20);
}

export function parseRatingText(html: string): string | null {
  const rating = cleanText(
    html.match(/id="acrPopover"[\s\S]{0,400}?title="([^"]+)"/)?.[1] ??
      html.match(/class="a-icon-alt">([^<]*5つ星のうち[^<]*)</)?.[1] ??
      "",
  );
  const count = cleanText(
    html.match(/id="acrCustomerReviewText"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "",
  ).replace(/[()]/g, "");

  if (!rating) {
    return null;
  }

  return count ? `${rating}（${count}件）` : rating;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=。)/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8);
}

export function summarizeReviews(
  parts: string[],
  min = REVIEW_SUMMARY_MIN,
  max = REVIEW_SUMMARY_MAX,
): string | null {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const text = part.replace(/\s+/g, "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    unique.push(text);
  }

  const ready = unique.find((text) => text.length >= min && text.length <= max);
  if (ready) {
    return ready;
  }

  let summary = "";

  for (const part of unique) {
    for (const sentence of splitSentences(part)) {
      if (summary.length + sentence.length <= max) {
        summary += sentence;
        if (summary.length >= min) {
          return summary;
        }
        continue;
      }

      if (summary.length >= min) {
        return summary;
      }

      const room = max - summary.length;
      const clipped = sentence.slice(0, room);
      const end = Math.max(clipped.lastIndexOf("。"), clipped.lastIndexOf("、"));
      if (room >= 40 && end >= 20) {
        summary += clipped.slice(0, end + 1);
      }

      if (summary.length >= min) {
        return summary;
      }
    }
  }

  return summary.length >= min && summary.length <= max ? summary : null;
}

export function readAmazonProduct(
  item: BestsellerItem,
  html: string,
  tag = amazonAssociateTag(),
): AmazonPick | null {
  const images = parseProductImages(html, 3);
  const summary = summarizeReviews(parseAspectSummaries(html));

  if (images.length < 2 || !summary) {
    return null;
  }

  return {
    rank: item.rank,
    asin: item.asin,
    title: parseProductTitle(html, item.title),
    url: amazonAffiliateUrl(item.asin, tag),
    images,
    summary,
    ratingText: parseRatingText(html),
  };
}

export function fetchAmazonText(url: string, redirects = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers: AMAZON_HEADERS,
        timeout: 8000,
      },
      (response) => {
        const status = response.statusCode ?? 0;

        if (
          status >= 300 &&
          status < 400 &&
          response.headers.location &&
          redirects < 5
        ) {
          response.resume();
          const next = new URL(response.headers.location, url).toString();
          resolve(fetchAmazonText(next, redirects + 1));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          if (status >= 400) {
            reject(new Error(`HTTP ${status}`));
            return;
          }
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error("Amazonへの接続がタイムアウトしました。"));
    });
    request.end();
  });
}

export async function fetchAmazonBestsellers(
  fetchText: (url: string) => Promise<string> = fetchAmazonText,
  limit = PRODUCTS_PER_POST,
): Promise<AmazonPick[]> {
  const listHtml = await fetchText(AMAZON_BESTSELLERS_URL);
  const ranked = parseBestsellerItems(listHtml).slice(0, limit + 3);

  if (ranked.length === 0) {
    throw new Error("Amazonの売れ筋ランキングを読み取れませんでした。");
  }

  const details = await Promise.all(
    ranked.map(async (item) => {
      try {
        const html = await fetchText(`https://www.amazon.co.jp/dp/${item.asin}`);
        return readAmazonProduct(item, html);
      } catch {
        return null;
      }
    }),
  );

  return details
    .filter((item): item is AmazonPick => item !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}
