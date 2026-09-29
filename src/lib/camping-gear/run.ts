import { buildGearPost } from "@/lib/camping-gear/article";
import { qualifyProduct } from "@/lib/camping-gear/filter";
import { PublishConfigError } from "@/lib/camping-gear/publish";
import { selectProducts } from "@/lib/camping-gear/select";
import { fetchSourceText, GEAR_SOURCES } from "@/lib/camping-gear/sources";
import type {
  BlogDraft,
  GearProduct,
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

export async function runWeeklyCampingGearPost(
  options: RunOptions = {},
): Promise<RunResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const sources = options.sources ?? GEAR_SOURCES;
  const fetchText = options.fetchText ?? fetchSourceText;
  const loadPostedUrls = options.loadPostedUrls ?? (async () => new Set<string>());
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

  let postedUrls = new Set<string>();
  try {
    postedUrls = await loadPostedUrls();
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

  const selected = selectProducts(matched, postedUrls);

  if (selected.length === 0) {
    return {
      posted: false,
      dryRun,
      reason: "no_products_within_window",
      products: [],
      scanned,
      matched: matched.length,
      sourceErrors,
      sourceReports,
      message: "直近2週間の新しいキャンプギアが見つからなかったため、投稿しませんでした。",
    };
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
