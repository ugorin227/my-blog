import assert from "node:assert/strict";
import test from "node:test";
import { buildAmazonBestsellersPost, buildGearPost } from "./camping-gear/article";
import type { AmazonPick, GearProduct } from "./camping-gear/types";
import { articleJsonLd, describeHtml } from "./seo";

const now = new Date("2026-09-29T00:00:00+09:00");

function product(title: string, brand: string): GearProduct {
  return {
    sourceId: "test",
    brand,
    kind: "manufacturer",
    title,
    url: `https://example.com/${brand}`,
    summary: "",
    publishedAt: "2026-09-20T00:00:00.000Z",
    releaseDate: "2026-09-20T15:00:00.000Z",
    sortTime: now.getTime(),
    imageUrl: null,
  };
}

test("記事の説明文は先頭の段落とタイトルから120文字以内にまとめる", () => {
  const described = describeHtml(
    "<p>直近2週間に発売のキャンプギアを公式発表からまとめています。テントとテーブルを中心に紹介しています。</p><p>価格は変わります。</p>",
    "長いタイトル",
  );
  assert.ok(described.length <= 120);
  assert.match(described, /公式発表/);
  assert.doesNotMatch(described, /価格は変わります/);

  assert.equal(describeHtml("<p>短い</p>", "ソロキャンプの始め方"), "ソロキャンプの始め方");
});

test("自動投稿の見出しと説明文に商品名を入れる", () => {
  const draft = buildGearPost(
    [
      product("シェルター「エアロカムラスシェル」を新発売", "スノーピーク"),
      product("「マジカルテーブル」が登場", "DOD"),
    ],
    now,
  );

  assert.match(draft.title, /今週の新キャンプギア/);
  assert.match(draft.title, /スノーピーク/);
  assert.match(draft.title, /DOD/);
  const intro = draft.content.match(/^<p>(.*?)<\/p>/)?.[1] ?? "";
  assert.ok(intro.length >= 40 && intro.length <= 120);
  assert.match(intro, /エアロカムラスシェル/);
  assert.match(intro, /マジカルテーブル/);

  const amazon = buildAmazonBestsellersPost(
    [1, 2, 3, 4, 5].map(
      (rank): AmazonPick => ({
        rank,
        asin: `B00${rank}`,
        title: rank === 1 ? "撥水リュックカバー" : `キャンプチェア ${rank}`,
        url: `https://www.amazon.co.jp/dp/B00${rank}?tag=erogemusou-22`,
        images: [],
        summary: "あ".repeat(220),
        ratingText: null,
      }),
    ),
    now,
  );
  const amazonIntro = amazon.content.match(/^<p>(.*?)<\/p>/)?.[1] ?? "";
  assert.match(amazon.title, /Amazon売上TOP5/);
  assert.match(amazon.title, /アウトドア売れ筋/);
  assert.ok(amazonIntro.length >= 40 && amazonIntro.length <= 120);
  assert.match(amazonIntro, /撥水リュックカバー/);
});

test("構造化データに記事URLと公開日を入れる", () => {
  const data = articleJsonLd({
    id: "abc",
    title: "秋キャンプ",
    content: "<p>寒くなる前のソロキャンプの準備を書いています。タープとシュラフを見直しました。</p>",
    description: "寒くなる前のソロキャンプの準備を書いています。",
    publishedAt: "2026-09-01T00:00:00.000Z",
    categoryName: "キャンプ",
    imageUrl: "https://example.com/camp.jpg",
  });

  assert.equal(data["@type"], "BlogPosting");
  assert.equal(data.headline, "秋キャンプ");
  assert.match(String(data.url), /\/blog\/abc$/);
  assert.equal(data.datePublished, "2026-09-01T00:00:00.000Z");
  assert.equal(data.articleSection, "キャンプ");
});
