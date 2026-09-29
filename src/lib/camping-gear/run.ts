import { fetchAmazonBestsellers } from "@/lib/camping-gear/amazon";
import { buildAmazonBestsellersPost, buildGearPost } from "@/lib/camping-gear/article";
import { qualifyProduct } from "@/lib/camping-gear/filter";
import { pickFeaturedImage, readOpenGraphImage } from "@/lib/camping-gear/images";
import { PublishConfigError } from "@/lib/camping-gear/publish";
import { selectProducts } from "@/lib/camping-gear/select";
import { fetchSourceText, GEAR_SOURCES } from "@/lib/camping-gear/sources";
import type {
  AmazonPick,
  BlogDraft,
  GearProduct,
  PostedHistory,
  RunResult,
  SourceDefinition,
  SourceError,
  SourceReport,
} from "@/lib/camping-gear/types";

type RunOptions = {
  now?: Date;
  dryRun?: boolean;
  sources?: SourceDefinition[];
  fetchText?: (url: string) => Promise<string>;
  loadPostedUrls?: () => Promise<Set<string>>;
  loadPostedHistory?: () => Promise<PostedHistory>;
  loadAmazonBestsellers?: () => Promise<AmazonPick[]>;
  publish?: (draft: BlogDraft) => Promise<{ id: string }>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toProductSummary(product: GearProduct) {
  return {
    brand: product.brand,
    kind: product.kind,
    title: product.title,
    url: product.url,
    releaseDate: product.releaseDate,
    publishedAt: product.publishedAt,
  };
}

function emptyHistory(): PostedHistory {
  return { urls: new Set(), titles: [] };
}

function isPdf(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

async function attachFeaturedImages(
  products: GearProduct[],
  fetchText: (url: string) => Promise<string>,
): Promise<GearProduct[]> {
  return Promise.all(
    products.map(async (product) => {
      if (isPdf(product.url)) {
        return product;
      }

      try {
        const html = await fetchText(product.url);
        const featured = pickFeaturedImage(html, product.url, product.title);
        let imageUrl = featured.imageUrl ?? product.imageUrl;

        if (featured.productPageUrl) {
          try {
            const productHtml = await fetchText(featured.productPageUrl);
            imageUrl =
              readOpenGraphImage(productHtml, featured.productPageUrl) ??
              imageUrl;
          } catch {
            imageUrl = imageUrl ?? product.imageUrl;
          }
        }

        return { ...product, imageUrl };
      } catch {
        return product;
      }
    }),
  );
}

async function publishAmazonFallback(input: {
  now: Date;
  dryRun: boolean;
  history: PostedHistory;
  scanned: number;
  matched: number;
  sourceErrors: SourceError[];
  sourceReports: SourceReport[];
  loadAmazonBestsellers: () => Promise<AmazonPick[]>;
  publish?: (draft: BlogDraft) => Promise<{ id: string }>;
}): Promise<RunResult> {
  const shared = {
    dryRun: input.dryRun,
    scanned: input.scanned,
    matched: input.matched,
    sourceErrors: input.sourceErrors,
    sourceReports: input.sourceReports,
  };

  let picks: AmazonPick[] = [];
  try {
    picks = await input.loadAmazonBestsellers();
  } catch (error) {
    return {
      posted: false,
      ...shared,
      reason: "amazon_bestsellers_unavailable",
      products: [],
      message: `Amazonの売れ筋を取得できませんでした: ${errorMessage(error)}`,
    };
  }

  if (picks.length < 5) {
    return {
      posted: false,
      ...shared,
      reason: "amazon_bestsellers_unavailable",
      products: [],
      message:
        "画像2〜3点と200〜300文字のレビュー要約が揃った売上上位5件を集められませんでした。",
    };
  }

  const draft = buildAmazonBestsellersPost(picks, input.now);
  if (input.history.titles.includes(draft.title)) {
    return {
      posted: false,
      ...shared,
      reason: "already_posted",
      title: draft.title,
      products: [],
      message: "今週のAmazon売上TOP5は投稿済みです。",
    };
  }

  const products = picks.map((pick) => ({
    brand: "Amazon.co.jp",
    kind: "amazon" as const,
    title: pick.title,
    url: pick.url,
    releaseDate: null,
    publishedAt: input.now.toISOString(),
  }));

  if (input.dryRun) {
    return {
      posted: false,
      ...shared,
      dryRun: true,
      reason: "dry_run",
      title: draft.title,
      content: draft.content,
      products,
    };
  }

  if (!input.publish) {
    return {
      posted: false,
      ...shared,
      reason: "publish_failed",
      title: draft.title,
      products,
      message: "投稿処理が設定されていません。",
    };
  }

  try {
    const created = await input.publish(draft);
    return {
      posted: true,
      ...shared,
      dryRun: false,
      reason: "posted",
      title: draft.title,
      contentId: created.id,
      products,
    };
  } catch (error) {
    const message =
      error instanceof PublishConfigError
        ? error.message
        : `投稿に失敗しました: ${errorMessage(error)}`;

    return {
      posted: false,
      ...shared,
      reason: "publish_failed",
      title: draft.title,
      products,
      message,
    };
  }
}

export async function runWeeklyCampingGearPost(
  options: RunOptions = {},
): Promise<RunResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const sources = options.sources ?? GEAR_SOURCES;
  const fetchText = options.fetchText ?? fetchSourceText;
  const loadAmazonBestsellers =
    options.loadAmazonBestsellers ?? (() => fetchAmazonBestsellers());
  const fetched = await Promise.all(
    sources.map(async (source) => {
      try {
        const body = await fetchText(source.listUrl);
        return {
          ok: true as const,
          source,
          raw: source.parse(body, source.listUrl),
        };
      } catch (error) {
        return {
          ok: false as const,
          sourceId: source.id,
          message: errorMessage(error),
        };
      }
    }),
  );

  const sourceErrors: SourceError[] = [];
  const sourceReports: SourceReport[] = [];
  const matched: GearProduct[] = [];
  let scanned = 0;

  for (const result of fetched) {
    if (!result.ok) {
      sourceErrors.push({
        sourceId: result.sourceId,
        message: result.message,
      });
      sourceReports.push({
        sourceId: result.sourceId,
        scanned: 0,
        matched: 0,
        error: result.message,
      });
      continue;
    }

    scanned += result.raw.length;
    let sourceMatched = 0;

    for (const raw of result.raw) {
      const product = qualifyProduct(result.source, raw, now);
      if (product) {
        matched.push(product);
        sourceMatched += 1;
      }
    }

    sourceReports.push({
      sourceId: result.source.id,
      scanned: result.raw.length,
      matched: sourceMatched,
    });
  }

  if (sources.length > 0 && sourceErrors.length === sources.length) {
    return {
      posted: false,
      dryRun,
      reason: "all_sources_failed",
      products: [],
      scanned,
      matched: 0,
      sourceErrors,
      sourceReports,
      message: "新商品の情報源をすべて取得できませんでした。",
    };
  }

  let history = emptyHistory();
  try {
    if (options.loadPostedHistory) {
      history = await options.loadPostedHistory();
    } else if (options.loadPostedUrls) {
      history = { urls: await options.loadPostedUrls(), titles: [] };
    }
  } catch (error) {
    return {
      posted: false,
      dryRun,
      reason: "publish_failed",
      products: [],
      scanned,
      matched: matched.length,
      sourceErrors,
      sourceReports,
      message: `投稿済みの商品を確認できませんでした: ${errorMessage(error)}`,
    };
  }

  const selected = await attachFeaturedImages(
    selectProducts(matched, history.urls),
    fetchText,
  );
  const base = {
    dryRun,
    scanned,
    matched: matched.length,
    sourceErrors,
    sourceReports,
  };

  if (selected.length === 0) {
    return publishAmazonFallback({
      ...base,
      now,
      history,
      loadAmazonBestsellers,
      publish: options.publish,
    });
  }

  const draft = buildGearPost(selected, now);
  const products = selected.map(toProductSummary);

  if (dryRun) {
    return {
      posted: false,
      dryRun: true,
      reason: "dry_run",
      title: draft.title,
      content: draft.content,
      products,
      scanned,
      matched: matched.length,
      sourceErrors,
      sourceReports,
    };
  }

  if (!options.publish) {
    return {
      posted: false,
      dryRun: false,
      reason: "publish_failed",
      title: draft.title,
      products,
      scanned,
      matched: matched.length,
      sourceErrors,
      sourceReports,
      message: "投稿処理が設定されていません。",
    };
  }

  try {
    const created = await options.publish(draft);
    return {
      posted: true,
      dryRun: false,
      reason: "posted",
      title: draft.title,
      contentId: created.id,
      products,
      scanned,
      matched: matched.length,
      sourceErrors,
      sourceReports,
    };
  } catch (error) {
    const message =
      error instanceof PublishConfigError
        ? error.message
        : `投稿に失敗しました: ${errorMessage(error)}`;

    return {
      posted: false,
      dryRun: false,
      reason: "publish_failed",
      title: draft.title,
      products,
      scanned,
      matched: matched.length,
      sourceErrors,
      sourceReports,
      message,
    };
  }
}
