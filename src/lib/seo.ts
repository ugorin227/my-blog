import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { stripHtml } from "@/lib/camping-gear/text";

export const DESCRIPTION_MAX = 120;

export function clipDescription(value: string, max = DESCRIPTION_MAX): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) {
    return text;
  }

  const slice = text.slice(0, max);
  const end = slice.lastIndexOf("。");
  if (end >= 40) {
    return slice.slice(0, end + 1);
  }

  return `${slice.trimEnd()}…`;
}

export function describeHtml(html: string, title: string): string {
  const firstParagraph = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  const summary = clipDescription(stripHtml(firstParagraph));
  if (summary.length >= 40) {
    return summary;
  }

  return clipDescription(stripHtml(title));
}

export function firstContentImage(html: string): string | null {
  const src = html.match(/<img\b[^>]*src="([^"]+)"/i)?.[1];
  if (!src || src.startsWith("data:")) {
    return null;
  }
  return src;
}

export function pageUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

type ArticleMetaInput = {
  id: string;
  title: string;
  content: string;
  description: string;
  publishedAt?: string | null;
  revisedAt?: string | null;
  createdAt?: string | null;
  categoryName?: string | null;
  imageUrl?: string | null;
};

export function articleJsonLd(input: ArticleMetaInput) {
  const url = pageUrl(`/blog/${input.id}`);
  const published = input.publishedAt ?? input.createdAt ?? undefined;
  const modified = input.revisedAt ?? published;
  const image = input.imageUrl ?? firstContentImage(input.content);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    inLanguage: "ja",
    mainEntityOfPage: url,
    url,
    datePublished: published,
    dateModified: modified,
    articleSection: input.categoryName ?? undefined,
    image: image ?? undefined,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: pageUrl(item.path),
    })),
  };
}

export function blogJsonLd(description = SITE_DESCRIPTION) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: SITE_NAME,
    description,
    url: SITE_URL,
    inLanguage: "ja",
  };
}
