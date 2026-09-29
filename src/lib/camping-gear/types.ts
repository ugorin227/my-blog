export const RELEASE_WINDOW_DAYS = 14;
export const PRODUCTS_PER_POST = 5;
export const GEAR_POST_TITLE_MARK = "今週の新キャンプギア";
export const AMAZON_POST_TITLE_MARK = "Amazon売上TOP5";
export const AMAZON_ASSOCIATE_TAG = "erogemusou-22";
export const AMAZON_BESTSELLERS_URL =
  "https://www.amazon.co.jp/gp/bestsellers/sports/14315411";
export const REVIEW_SUMMARY_MIN = 200;
export const REVIEW_SUMMARY_MAX = 300;

export type GearKind = "manufacturer" | "home-center" | "amazon";

export type RawItem = {
  title: string;
  url: string;
  dateText: string;
  summary?: string;
  categories?: string[];
  imageUrl?: string;
};

export type GearProduct = {
  sourceId: string;
  brand: string;
  kind: GearKind;
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
  releaseDate: string | null;
  sortTime: number;
  imageUrl: string | null;
};

export type SourceDefinition = {
  id: string;
  brand: string;
  kind: GearKind;
  listUrl: string;
  parse: (body: string, listUrl: string) => RawItem[];
};

export type BlogDraft = {
  title: string;
  content: string;
};

export type PostedHistory = {
  urls: Set<string>;
  titles: string[];
};

export type AmazonPick = {
  rank: number;
  asin: string;
  title: string;
  url: string;
  images: string[];
  summary: string;
  ratingText: string | null;
};

export type SourceError = {
  sourceId: string;
  message: string;
};

export type SourceReport = {
  sourceId: string;
  scanned: number;
  matched: number;
  error?: string;
};

export type RunResult = {
  posted: boolean;
  dryRun: boolean;
  reason:
    | "posted"
    | "dry_run"
    | "no_products_within_window"
    | "amazon_bestsellers_unavailable"
    | "already_posted"
    | "all_sources_failed"
    | "publish_failed";
  title?: string;
  content?: string;
  contentId?: string;
  products: Array<{
    brand: string;
    kind: GearKind;
    title: string;
    url: string;
    releaseDate: string | null;
    publishedAt: string;
  }>;
  scanned: number;
  matched: number;
  sourceErrors: SourceError[];
  sourceReports: SourceReport[];
  message?: string;
};
