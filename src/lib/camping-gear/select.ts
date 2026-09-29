import type { GearProduct } from "@/lib/camping-gear/types";
import { PRODUCTS_PER_POST } from "@/lib/camping-gear/types";
import { normalizeUrl } from "@/lib/camping-gear/text";

function titleKey(title: string): string {
  return title.toLowerCase().replace(/[\s【】「」『』()（）｜|]/g, "");
}

export function selectProducts(
  products: GearProduct[],
  postedUrls: Set<string>,
  limit = PRODUCTS_PER_POST,
): GearProduct[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const fresh: GearProduct[] = [];

  for (const product of [...products].sort((a, b) => b.sortTime - a.sortTime)) {
    const url = normalizeUrl(product.url);
    const title = `${product.brand}:${titleKey(product.title)}`;

    if (postedUrls.has(url) || seenUrls.has(url) || seenTitles.has(title)) {
      continue;
    }

    seenUrls.add(url);
    seenTitles.add(title);
    fresh.push({ ...product, url });
  }

  const byBrand = new Map<string, GearProduct[]>();
  for (const product of fresh) {
    const list = byBrand.get(product.brand) ?? [];
    list.push(product);
    byBrand.set(product.brand, list);
  }

  const brands = [...byBrand.entries()].sort(
    (a, b) => b[1][0].sortTime - a[1][0].sortTime,
  );
  const selected: GearProduct[] = [];
  let added = true;

  while (selected.length < limit && added) {
    added = false;

    for (const [, list] of brands) {
      const next = list.shift();
      if (!next) {
        continue;
      }

      selected.push(next);
      added = true;

      if (selected.length >= limit) {
        break;
      }
    }
  }

  return selected.sort((a, b) => b.sortTime - a.sortTime);
}

export function extractPostedGearUrls(content: string): string[] {
  const urls = new Set<string>();

  for (const match of content.matchAll(/href="([^"]+)"/g)) {
    urls.add(normalizeUrl(match[1]));
  }

  for (const match of content.matchAll(/参照URL:\s*(https?:\/\/\S+)/g)) {
    urls.add(normalizeUrl(match[1]));
  }

  return [...urls];
}
