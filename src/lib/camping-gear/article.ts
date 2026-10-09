import { formatJstDate, formatJstMonthDay } from "@/lib/camping-gear/dates";
import type { AmazonPick, BlogDraft, GearProduct } from "@/lib/camping-gear/types";
import {
  AMAZON_POST_TITLE_MARK,
  GEAR_POST_TITLE_MARK,
} from "@/lib/camping-gear/types";
import { OFFICIAL_IMAGE_DESCRIPTION } from "@/lib/camping-gear/images";
import { clipDescription } from "@/lib/seo";
import { escapeHtml } from "@/lib/camping-gear/text";

function kindLabel(kind: GearProduct["kind"]): string {
  return kind === "manufacturer"
    ? "キャンプメーカー"
    : "ホームセンターのプライベートブランド";
}

function quotedName(title: string): string | null {
  return title.match(/[「『]([^」』]{2,24})[」』]/)?.[1] ?? null;
}

function productLabel(product: Pick<GearProduct, "brand" | "title">): string {
  const quoted = quotedName(product.title);
  if (quoted) {
    return quoted;
  }

  const title = product.title.replace(/\s+/g, " ").trim();
  if (title && title !== product.brand && title.length <= 28) {
    return title;
  }

  return product.brand;
}

function uniqueLabels(items: Array<{ brand: string; title: string }>): string[] {
  const labels: string[] = [];
  for (const item of items) {
    const label = productLabel(item);
    if (!labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
}

function fitIntro(base: string, labels: string[]): string {
  let text = `${base}公式の情報をもとに紹介しています。`;
  const picked: string[] = [];

  for (const label of labels) {
    const next = [...picked, label];
    const rest = labels.length > next.length ? "など" : "";
    const candidate = `${base}取り上げるのは${next.join("、")}${rest}です。`;
    if (candidate.length > 120) {
      break;
    }
    picked.push(label);
    text = candidate;
  }

  return clipDescription(text, 120);
}

function gearTitle(products: GearProduct[], now: Date): string {
  const base = `【${GEAR_POST_TITLE_MARK}】${formatJstMonthDay(now)}の新商品${products.length}点`;
  const brands = [...new Set(products.map((product) => product.brand))].slice(0, 3);
  const titled = `${base}｜${brands.join("・")}`;
  return titled.length <= 48 ? titled : base;
}

function imageAlt(product: GearProduct): string {
  const label = productLabel(product);
  const subject = label === product.brand ? product.brand : `${product.brand}の${label}`;
  return `${subject}。${OFFICIAL_IMAGE_DESCRIPTION}`;
}

export function buildGearPost(products: GearProduct[], now: Date): BlogDraft {
  const title = gearTitle(products, now);
  const intro = fitIntro(
    `${formatJstMonthDay(now)}時点で、直近2週間に発売が見つかったキャンプギアの新商品${products.length}点です。`,
    uniqueLabels(products),
  );
  const sections = products.map((product) => {
    const whenLabel = product.releaseDate ? "発売日" : "発表日";
    const when = formatJstDate(product.releaseDate ?? product.publishedAt);
    const summary = product.summary
      ? `<p>${escapeHtml(product.summary)}</p>`
      : "";
    const image = product.imageUrl
      ? `<p><img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(imageAlt(product))}"></p><p>${OFFICIAL_IMAGE_DESCRIPTION}</p>`
      : "";

    return [
      `<h2>${escapeHtml(product.title)}</h2>`,
      image,
      "<ul>",
      `<li>ブランド: ${escapeHtml(product.brand)}（${kindLabel(product.kind)}）</li>`,
      `<li>${whenLabel}: ${when}</li>`,
      "</ul>",
      summary,
      `<p><a href="${escapeHtml(product.url)}">公式の発表を見る</a></p>`,
      `<p>参照URL: ${escapeHtml(product.url)}</p>`,
    ]
      .filter(Boolean)
      .join("");
  });

  const content = [
    `<p>${escapeHtml(intro)}</p>`,
    "<ul>",
    ...products.map(
      (product) =>
        `<li>${escapeHtml(product.brand)}：${escapeHtml(productLabel(product))}</li>`,
    ),
    "</ul>",
    ...sections,
    "<p>価格や仕様、発売日は予告なく変わることがあります。購入前に公式の情報を確認してください。</p>",
  ].join("");

  return { title, content };
}

export function buildAmazonBestsellersPost(
  picks: AmazonPick[],
  now: Date,
): BlogDraft {
  const title = `【${AMAZON_POST_TITLE_MARK}】${formatJstMonthDay(now)}のアウトドア売れ筋`;
  const intro = fitIntro(
    `${formatJstMonthDay(now)}時点のAmazon.co.jpアウトドア用品で、売れ筋から画像とレビュー要約が確認できた${picks.length}件です。`,
    uniqueLabels(
      picks.map((pick) => ({
        brand: pick.title.replace(/\s+/g, " ").trim().slice(0, 18),
        title: pick.title,
      })),
    ),
  );
  const sections = picks.map((pick) => {
    const images = pick.images
      .slice(0, 3)
      .map(
        (image, index) =>
          `<p><img src="${escapeHtml(image)}" alt="${escapeHtml(pick.title)}の商品画像${index + 1}"></p>`,
      )
      .join("");
    const rating = pick.ratingText
      ? `<li>評価: ${escapeHtml(pick.ratingText)}</li>`
      : "";

    return [
      `<h2>${pick.rank}位 ${escapeHtml(pick.title)}</h2>`,
      "<ul>",
      "<li>販売: Amazon.co.jp アウトドア用品の売れ筋ランキング</li>",
      rating,
      "</ul>",
      images,
      "<p>画像引用: Amazon.co.jp の商品ページ</p>",
      "<h3>レビュー要約</h3>",
      `<p>${escapeHtml(pick.summary)}</p>`,
      "<p>出典: Amazon.co.jp に掲載されたカスタマーレビューの要約</p>",
      `<p><a href="${escapeHtml(pick.url)}">Amazonで見る</a></p>`,
      `<p>参照URL: ${escapeHtml(pick.url)}</p>`,
    ]
      .filter(Boolean)
      .join("");
  });

  const content = [
    `<p>${escapeHtml(intro)}</p>`,
    "<p>直近2週間の新商品が見つからなかったため、Amazon.co.jpのアウトドア用品・売れ筋ランキングを紹介しています。この記事にはAmazonアソシエイトの紹介リンクが含まれます。リンク経由で購入すると、紹介料を受け取ることがあります。</p>",
    ...sections,
    "<p>順位、価格、在庫は変わります。購入前にAmazonの商品ページで確認してください。</p>",
  ].join("");

  return { title, content };
}
