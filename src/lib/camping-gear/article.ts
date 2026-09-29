import { formatJstDate, formatJstMonthDay } from "@/lib/camping-gear/dates";
import type { BlogDraft, GearProduct } from "@/lib/camping-gear/types";
import { GEAR_POST_TITLE_MARK } from "@/lib/camping-gear/types";
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
