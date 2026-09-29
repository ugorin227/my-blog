export const RELEASE_WINDOW_DAYS = 14;
export const PRODUCTS_PER_POST = 5;
export const GEAR_POST_TITLE_MARK = "今週の新キャンプギア";

export type GearKind = "manufacturer" | "home-center";

export type RawItem = {
  title: string;
  url: string;
  dateText: string;
  summary?: string;
  categories?: string[];
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
