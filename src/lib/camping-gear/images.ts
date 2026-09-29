import { resolveUrl, safeHttpUrl } from "@/lib/camping-gear/text";

export const OFFICIAL_IMAGE_DESCRIPTION = "画像は公式サイトより";

const GENERIC_IMAGE =
  /logo|icon|favicon|sprite|placeholder|placehold|spacer|blank|button|avatar|emoji|badge|arrow|pixel|ogp\.|\/common\/|share_|\/sns\/|instagram|facebook|youtube|tiktok/i;
const LINEUP_IMAGE =
  /banner|arrivals|web_w\d|keyvisual|キービジュ|lineup|サムネイル|thumbnail/i;
const PRODUCT_PATH = /\/(?:products?|items?|goods|special)\//i;
const SINGLE_PRODUCT_PATH = /\/(?:products?|items?|goods)\//i;
const MORE_PRODUCTS = /上記以外|その他にも|他にも新|製品一覧はこちら|ラインナップ一覧/;

export type FeaturedImage = {
  imageUrl: string | null;
  productPageUrl: string | null;
};

function attribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1]?.trim() ?? "";
}

function imagePath(absolute: string): string {
  try {
    const url = new URL(absolute);
    let pathname = url.pathname;
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      pathname = url.pathname;
    }
    return `${pathname}${url.search}`;
  } catch {
    return absolute;
  }
}

function usableImageUrl(value: string, pageUrl: string): string | null {
  if (!value || value.startsWith("data:")) {
    return null;
  }

  const absolute = safeHttpUrl(resolveUrl(value, pageUrl));
  if (!absolute || GENERIC_IMAGE.test(imagePath(absolute))) {
    return null;
  }

  return absolute;
}

function quotedNames(title: string): string[] {
  return [...title.matchAll(/[「『]([^」』]{2,40})[」』]/g)].map((match) =>
    match[1].trim(),
  );
}

function contentStart(html: string, title: string): number {
  const prefix = title.replace(/\s+/g, "").slice(0, 12);
  const headings = html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi);

  for (const heading of headings) {
    const text = heading[1].replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    if (prefix && text.includes(prefix)) {
      return heading.index ?? 0;
    }
  }

  return 0;
}

function readMeta(html: string, key: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

type ContentImage = {
  index: number;
  end: number;
  src: string;
  filename: string;
  httpUrl: string | null;
};

function contentImages(html: string, pageUrl: string, start: number): ContentImage[] {
  const images: ContentImage[] = [];
  const region = html.slice(start);
  const tags = region.matchAll(/<img\b[^>]*>/gi);

  for (const tag of tags) {
    const raw =
      attribute(tag[0], "data-src") ||
      attribute(tag[0], "data-original") ||
      attribute(tag[0], "data-lazy-src") ||
      attribute(tag[0], "src");
    const filename = attribute(tag[0], "data-filename");
    const httpUrl = usableImageUrl(raw, pageUrl);
    if (!httpUrl && !raw.startsWith("data:") && !filename) {
      continue;
    }
    if (httpUrl && LINEUP_IMAGE.test(imagePath(httpUrl))) {
      continue;
    }

    images.push({
      index: start + (tag.index ?? 0),
      end: start + (tag.index ?? 0) + tag[0].length,
      src: raw,
      filename,
      httpUrl,
    });
  }

  return images;
}

function productLinks(html: string, pageUrl: string, from: number, to: number): string[] {
  const slice = html.slice(from, to);
  const hrefs = slice.matchAll(/href="([^"]+)"/gi);
  const urls: string[] = [];

  for (const href of hrefs) {
    const absolute = safeHttpUrl(resolveUrl(href[1], pageUrl));
    if (!absolute || !PRODUCT_PATH.test(absolute) || absolute === pageUrl) {
      continue;
    }
    urls.push(absolute);
  }

  return urls;
}

function isLineup(image: ContentImage, followingText: string, followingLinks: string[]): boolean {
  if (LINEUP_IMAGE.test(`${image.filename} ${image.src}`)) {
    return true;
  }

  return followingLinks.length >= 2 || MORE_PRODUCTS.test(followingText) && followingLinks.length === 0;
}

export function readOpenGraphImage(html: string, pageUrl: string): string | null {
  return usableImageUrl(readMeta(html, "og:image"), pageUrl);
}

export function pickFeaturedImage(
  html: string,
  pageUrl: string,
  title: string,
): FeaturedImage {
  const names = quotedNames(title);
  const ogImage = readOpenGraphImage(html, pageUrl);
  const ogTitle = readMeta(html, "og:title");
  const empty = { imageUrl: null, productPageUrl: null };

  if (ogImage && names.some((name) => ogTitle.includes(name))) {
    return { imageUrl: ogImage, productPageUrl: null };
  }

  const start = contentStart(html, title);
  const tail = html.slice(start).search(MORE_PRODUCTS);
  const end = tail >= 0 ? start + tail : html.length;
  const images = contentImages(html, pageUrl, start).filter((image) => image.index < end);

  const named = images.find((image) => {
    const around = html.slice(Math.max(start, image.index - 400), image.end + 700);
    return names.some((name) => around.includes(name));
  });

  if (named) {
    if (named.httpUrl) {
      return { imageUrl: named.httpUrl, productPageUrl: null };
    }

    const links = productLinks(html, pageUrl, named.end, named.end + 1200);
    return { imageUrl: null, productPageUrl: links[0] ?? null };
  }

  const cards = images.flatMap((image, index) => {
    const next = images[index + 1]?.index ?? end;
    const links = productLinks(html, pageUrl, image.end, next);
    const followingText = html.slice(image.end, next).replace(/<[^>]+>/g, " ");
    return [{ image, links, followingText }];
  });
  const uniqueLinks = new Set(cards.flatMap((card) => card.links));

  if (uniqueLinks.size >= 2) {
    const featured =
      cards.find(
        (card) =>
          !isLineup(card.image, card.followingText, card.links) &&
          card.links.some((link) => SINGLE_PRODUCT_PATH.test(link)),
      ) ??
      cards.find(
        (card) =>
          !isLineup(card.image, card.followingText, card.links) &&
          card.links.length > 0,
      );
    const productPageUrl =
      featured?.links.find((link) => SINGLE_PRODUCT_PATH.test(link)) ??
      featured?.links[0] ??
      null;

    if (productPageUrl) {
      return { imageUrl: featured?.image.httpUrl ?? null, productPageUrl };
    }
    if (featured?.image.httpUrl) {
      return { imageUrl: featured.image.httpUrl, productPageUrl: null };
    }
  }

  if (ogImage) {
    return { imageUrl: ogImage, productPageUrl: null };
  }

  const first = images.find((image) => image.httpUrl);
  if (first?.httpUrl) {
    return { imageUrl: first.httpUrl, productPageUrl: null };
  }

  return empty;
}
