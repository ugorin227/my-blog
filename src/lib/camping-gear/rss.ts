import type { RawItem } from "@/lib/camping-gear/types";
import { cleanText, readTag, readTags } from "@/lib/camping-gear/text";

export function parseRssItems(xml: string): RawItem[] {
  return xml
    .split(/<item\b/i)
    .slice(1)
    .map((block) => block.split(/<\/item>/i)[0] ?? "")
    .map((block) => {
      const title = cleanText(readTag(block, "title"));
      const url = cleanText(readTag(block, "link"));
      const dateText = readTag(block, "pubDate").trim();
      const summary = cleanText(readTag(block, "description"));
      const categories = readTags(block, "category");
      const imageUrl = block.match(
        /<img\b[^>]*(?:data-src|src)="(https?:\/\/[^"]+)"/i,
      )?.[1];

      return { title, url, dateText, summary, categories, imageUrl };
    })
    .filter((item) => item.title && item.url && item.dateText);
}
