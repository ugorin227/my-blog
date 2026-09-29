import { formatJstDate, formatJstMonthDay } from "@/lib/camping-gear/dates";
import type { AmazonPick, BlogDraft, GearProduct } from "@/lib/camping-gear/types";
import {
  AMAZON_POST_TITLE_MARK,
  GEAR_POST_TITLE_MARK,
} from "@/lib/camping-gear/types";
import { escapeHtml } from "@/lib/camping-gear/text";

function kindLabel(kind: GearProduct["kind"]): string {
  return kind === "manufacturer"
    ? "キャンプメーカー"
    : "ホームセンターのプライベートブランド";
}

export function buildGearPost(products: GearProduct[], now: Date): BlogDraft {
  const title = `【${GEAR_POST_TITLE_MARK}】${formatJstMonthDay(now)}の新商品${products.length}点`;
  const sections = products.map((product) => {
    const whenLabel = product.releaseDate ? "発売日" : "発表日";
    const when = formatJstDate(product.releaseDate ?? product.publishedAt);
    const summary = product.summary
      ? `<p>${escapeHtml(product.summary)}</p>`
      : "";

    return [
      `<h2>${escapeHtml(product.title)}</h2>`,
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
    "<p>キャンプメーカーとホームセンターのプライベートブランドを対象に、直近2週間で発売が見つかった新商品です。気になったものだけ、公式の発表をたどってみてください。</p>",
    ...sections,
    "<p>価格や仕様、発売日は予告なく変わることがあります。購入前に公式の情報を確認してください。</p>",
  ].join("");

  return { title, content };
}

export function buildAmazonBestsellersPost(
  picks: AmazonPick[],
  now: Date,
): BlogDraft {
  const title = `【${AMAZON_POST_TITLE_MARK}】${formatJstMonthDay(now)}のキャンプギア`;
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
    "<p>直近2週間の新商品が見つからなかったので、Amazon.co.jp のアウトドア用品・売れ筋ランキングから、商品画像とレビュー要約が確認できた上位5件を紹介します。</p>",
    "<p>この記事にはAmazonアソシエイトの紹介リンクが含まれます。リンク経由で購入すると、紹介料を受け取ることがあります。</p>",
    ...sections,
    "<p>順位、価格、在庫は変わります。購入前にAmazonの商品ページで確認してください。</p>",
  ].join("");

  return { title, content };
}
