import assert from "node:assert/strict";
import test from "node:test";
import { buildGearPost } from "./article";
import { extractReleaseDate, jstDate, parseFlexibleDate } from "./dates";
import { qualifyProduct } from "./filter";
import {
  parseCainzNews,
  parseCampalNews,
  parseCaptainStagNews,
  parseColemanNews,
  parseDcmNews,
  parseLogosNews,
} from "./html";
import { parseRssItems } from "./rss";
import { runWeeklyCampingGearPost } from "./run";
import { extractPostedGearUrls, selectProducts } from "./select";
import type { GearProduct, RawItem, SourceDefinition } from "./types";

const now = new Date("2026-09-29T00:00:00+09:00");

function source(
  overrides: Partial<SourceDefinition> = {},
): SourceDefinition {
  return {
    id: "snow-peak",
    brand: "スノーピーク",
    kind: "manufacturer",
    listUrl: "https://example.com/news",
    parse: () => [],
    ...overrides,
  };
}

function raw(overrides: Partial<RawItem> = {}): RawItem {
  return {
    title: "エアーフレームシェルターを9月19日に新発売",
    url: "https://example.com/products/shelter",
    dateText: "2026-09-14",
    summary: "約5分で立ち上がる大型シェルターです。",
    categories: ["製品情報"],
    ...overrides,
  };
}

function product(overrides: Partial<GearProduct> = {}): GearProduct {
  return {
    sourceId: "snow-peak",
    brand: "スノーピーク",
    kind: "manufacturer",
    title: "シェルター",
    url: "https://example.com/a",
    summary: "",
    publishedAt: "2026-09-20T00:00:00.000Z",
    releaseDate: "2026-09-20T15:00:00.000Z",
    sortTime: new Date("2026-09-21T00:00:00+09:00").getTime(),
    ...overrides,
  };
}

test("発売日は発表日より優先し、2週間の窓で判定する", () => {
  const publishedAt = parseFlexibleDate("Mon, 14 Sep 2026 03:00:00 +0000");
  assert.ok(publishedAt);
  const release = extractReleaseDate(
    "エアーフレームシェルターを9月19日に新発売",
    publishedAt,
  );
  assert.equal(release?.toISOString(), jstDate(2026, 9, 19)?.toISOString());

  const included = qualifyProduct(source(), raw(), now);
  assert.equal(included?.releaseDate, jstDate(2026, 9, 19)?.toISOString());

  const tooOld = qualifyProduct(
    source(),
    raw({
      title: "9/12（土）発売　新商品のご案内",
      dateText: "2026-09-01",
      summary: "新商品を発売しました。",
    }),
    now,
  );
  assert.equal(tooOld, null);

  const future = qualifyProduct(
    source(),
    raw({
      title: "11月1日に新発売するテント",
      dateText: "2026-09-28",
    }),
    now,
  );
  assert.equal(future, null);
});

test("キャンプギア以外と案内だけのニュースは落とす", () => {
  assert.equal(
    qualifyProduct(
      source(),
      raw({
        title: "焚火をテーマにしたウイスキーを数量限定で発売",
        categories: ["食/FOOD"],
      }),
      now,
    ),
    null,
  );
  assert.equal(
    qualifyProduct(
      source(),
      raw({ title: "価格改定のお知らせ", summary: "", categories: ["お知らせ"] }),
      now,
    ),
    null,
  );
  assert.equal(
    qualifyProduct(
      source(),
      raw({ title: "「ノガテーブル」発売日決定のお知らせ", summary: "" }),
      now,
    ),
    null,
  );
  assert.equal(
    qualifyProduct(
      source(),
      raw({
        title: "新商品の発売時期変更に関するお詫びとお知らせ",
        summary: "",
        dateText: "2026-09-18",
      }),
      now,
    ),
    null,
  );
  assert.equal(
    qualifyProduct(
      source({ kind: "home-center", brand: "ワークマン", id: "workman" }),
      raw({
        title: "高機能インナーの新製品が登場",
        summary: "作業服の新作です。",
        dateText: "2026-09-28",
      }),
      now,
    ),
    null,
  );

  const homeCenterGear = qualifyProduct(
    source({ kind: "home-center", brand: "カインズ", id: "cainz" }),
    raw({
      title: "オリジナルソロテントを9月20日に新発売",
      summary: "ホームセンターのキャンプギアです。",
      dateText: "2026-09-20",
      categories: ["商品情報"],
    }),
    now,
  );
  assert.equal(homeCenterGear?.brand, "カインズ");
  assert.equal(homeCenterGear?.kind, "home-center");
});

test("ブランドを散らして最大5件にし、投稿済みURLは除く", () => {
  const products = ["A", "B", "C"].flatMap((brand, brandIndex) =>
    [1, 2, 3].map((n) =>
      product({
        brand,
        title: `${brand}-${n}`,
        url: `https://example.com/${brand}/${n}`,
        sortTime: new Date(`2026-09-${20 + brandIndex}T00:00:00+09:00`).getTime() - n,
      }),
    ),
  );

  const selected = selectProducts(products, new Set());
  assert.equal(selected.length, 5);
  assert.equal(new Set(selected.map((item) => item.brand)).size, 3);

  const posted = selectProducts(
    products,
    new Set(products.map((item) => item.url)),
  );
  assert.deepEqual(posted, []);
});

test("記事本文に参照URLを残し、外部テキストはエスケープする", () => {
  const draft = buildGearPost(
    [
      product({
        title: `<script>alert("x")</script>`,
        url: "https://example.com/gear",
        summary: "A & B",
      }),
    ],
    now,
  );

  assert.match(draft.title, /今週の新キャンプギア/);
  assert.match(draft.title, /9月29日の新商品1点/);
  assert.match(draft.content, /href="https:\/\/example.com\/gear"/);
  assert.match(draft.content, /参照URL: https:\/\/example.com\/gear/);
  assert.doesNotMatch(draft.content, /<script>/);
  assert.match(draft.content, /A &amp; B/);
});

test("公式ページの一覧とRSSから商品候補を読む", () => {
  const rss = parseRssItems(`
    <rss><channel>
      <item>
        <title><![CDATA[軽量テーブルを新発売]]></title>
        <link>https://www.dod.camp/news/release/1/</link>
        <pubDate>Thu, 17 Sep 2026 03:24:34 +0000</pubDate>
        <description><![CDATA[重さ約1.9kgのテーブル&#8230;]]></description>
        <category><![CDATA[プレスリリース]]></category>
      </item>
    </channel></rss>
  `);
  assert.equal(rss[0]?.title, "軽量テーブルを新発売");
  assert.equal(rss[0]?.summary.includes("…"), true);

  const logos = parseLogosNews(
    `<article><a href="https://www.logos.ne.jp/news/1679"><p class="cat">製品情報</p><h2>【9月24日（木）発売】2027モデル</h2><time>2026.09.10</time></a></article>`,
    "https://www.logos.ne.jp/news-list",
  );
  assert.equal(logos[0]?.dateText, "2026.09.10");

  const captain = parseCaptainStagNews(
    `<a href="https://www.captainstag.net/news/012694.html"><span class="ico_cate">商品情報</span><span class="news_date">2026.08.04</span><span class="news_title">クーラーボックスを発売</span></a>`,
    "https://www.captainstag.net/news/",
  );
  assert.equal(captain[0]?.categories?.[0], "商品情報");

  const coleman = parseColemanNews(
    `<span class="date-cate date-cate--green">お知らせ</span><span class="date-txt">2026/9/24</span><div class="news-list-ttl"><a href="20260924">価格改定のお知らせ</a></div>`,
    "https://www.coleman.co.jp/news/",
  );
  assert.equal(coleman[0]?.url, "https://www.coleman.co.jp/news/20260924");

  const campal = parseCampalNews(
    `<li><a href="/news/2026/09/post-70.html"><p class="date">2026.09.10</p><h2>新テントを<br>発売</h2><p>ソロ向けです。</p></a></li>`,
    "https://www.campal.co.jp/news/",
  );
  assert.equal(campal[0]?.title, "新テントを 発売");
  assert.equal(campal[0]?.url, "https://www.campal.co.jp/news/2026/09/post-70.html");

  const cainz = parseCainzNews(
    `<a class="m-newsList__item--block" href="https://www.cainz.co.jp/news/1/"><div class="m-newsList__item--content js-text-length">オリジナルチェアを新発売</div><div class="m-newsList__item--date">2026.09.20</div><span>商品情報</span></a>`,
    "https://www.cainz.co.jp/news/",
  );
  assert.equal(cainz[0]?.title, "オリジナルチェアを新発売");

  const dcm = parseDcmNews(
    `<li class="mod-newsList-item"><span class="mod-newsList-item-day rt_cf_n_date">2026.09.20</span><span class="rt_cf_n_category_name_ja">商品情報</span><a href="/news/products/1.html"><span class="rt_cf_n_title">DCMブランドのキャンプテーブルを新発売</span></a></li>`,
    "https://www.dcm-hc.co.jp/news/",
  );
  assert.equal(
    dcm[0]?.url,
    "https://www.dcm-hc.co.jp/news/products/1.html",
  );
});

test("該当がなければ投稿せず、あれば5件まで公開する", async () => {
  const shelter = source({
    parse: () => [raw()],
  });
  let published = 0;
  const skipped = await runWeeklyCampingGearPost({
    now,
    sources: [
      source({
        parse: () => [raw({ title: "価格改定のお知らせ", summary: "" })],
      }),
    ],
    fetchText: async () => "<html></html>",
    publish: async () => {
      published += 1;
      return { id: "unused" };
    },
  });
  assert.equal(skipped.reason, "no_products_within_window");
  assert.equal(skipped.posted, false);
  assert.equal(published, 0);

  const posted = await runWeeklyCampingGearPost({
    now,
    sources: [shelter],
    fetchText: async () => "<html></html>",
    loadPostedUrls: async () => new Set<string>(),
    publish: async (draft) => {
      published += 1;
      assert.match(draft.content, /example.com\/products\/shelter/);
      return { id: "post-1" };
    },
  });
  assert.equal(posted.reason, "posted");
  assert.equal(posted.contentId, "post-1");
  assert.equal(published, 1);

  const urls = extractPostedGearUrls(buildGearPost(posted.products.map((item) => product({
    title: item.title,
    url: item.url,
    brand: item.brand,
    kind: item.kind,
    releaseDate: item.releaseDate,
    publishedAt: item.publishedAt,
  })), now).content);
  assert.ok(urls.includes("https://example.com/products/shelter"));
});

test("情報源が全滅した週は投稿しない", async () => {
  const result = await runWeeklyCampingGearPost({
    now,
    sources: [source(), source({ id: "dod", listUrl: "https://example.com/dod" })],
    fetchText: async () => {
      throw new Error("timeout");
    },
    publish: async () => {
      throw new Error("should not publish");
    },
  });

  assert.equal(result.reason, "all_sources_failed");
  assert.deepEqual(
    result.sourceErrors.map((error) => error.sourceId),
    ["snow-peak", "dod"],
  );
});

test("ドライランは本文を返し、microCMSへは書かない", async () => {
  const result = await runWeeklyCampingGearPost({
    now,
    dryRun: true,
    sources: [source({ parse: () => [raw()] })],
    fetchText: async () => "<html></html>",
    publish: async () => {
      throw new Error("should not publish");
    },
  });

  assert.equal(result.reason, "dry_run");
  assert.equal(result.posted, false);
  assert.match(result.content ?? "", /シェルター/);
});
