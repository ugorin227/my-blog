import { extractReleaseDate, isWithinReleaseWindow, parseFlexibleDate } from "@/lib/camping-gear/dates";
import {
  RELEASE_WINDOW_DAYS,
  type GearProduct,
  type RawItem,
  type SourceDefinition,
} from "@/lib/camping-gear/types";
import { normalizeUrl, safeHttpUrl, truncate } from "@/lib/camping-gear/text";

const LAUNCH = /新発売|新商品|新製品|新作|新ラインナップ|販売開始|発売|デビュー|登場/;
const STRONG_LAUNCH = /新発売|新商品|新製品|新作|新ラインナップ|販売開始/;
const CAMPING_GEAR =
  /キャンプ|アウトドア|テント|タープ|シェルター|シュラフ|寝袋|コット|チェア|テーブル|バーナー|ランタン|焚き火|焚火|クーラー|バーベキュー|BBQ|ペグ|グランドシート|スリーピング|ハンモック|クッカー|グリル|ストーブ|ヘッドランプ|ダッチオーブン|ドーム|ギア/i;
const NON_GEAR =
  /ウイスキー|焼酎|シューズ|スニーカー|アパレル|ウェア|開業|レストラン|カフェ|カメラ|採用|決算|人事|スポンサー/;
const HARD_EXCLUDE =
  /お詫び|発売時期変更|発売延期|発売中止|価格改定|リコール|不具合|休業|営業再開|閉店|営業終了/;
const NOT_A_LAUNCH =
  /キャンペーン|開催|出展|ポップアップ|フェア|営業時間|開店|お問い合わせ|取扱店舗|義援金|移転|発売日決定/;
const NON_GEAR_CATEGORY = /衣|WEAR|FOOD|食/;

export function isGearLaunch(
  source: Pick<SourceDefinition, "kind">,
  title: string,
  summary: string,
  categories: string[],
  releaseDate: Date | null,
): boolean {
  const text = `${title}\n${summary}`;
  const categoryText = categories.join(" ");

  if (NON_GEAR.test(text) || NON_GEAR_CATEGORY.test(categoryText)) {
    return false;
  }

  if (HARD_EXCLUDE.test(text)) {
    return false;
  }

  if (NOT_A_LAUNCH.test(text) && !STRONG_LAUNCH.test(text)) {
    return false;
  }

  if (/発売日決定|発売延期|発売中止/.test(text) && !releaseDate) {
    return false;
  }

  if (!LAUNCH.test(text)) {
    return false;
  }

  if (source.kind === "home-center" && !CAMPING_GEAR.test(`${text}\n${categoryText}`)) {
    return false;
  }

  return true;
}

export function qualifyProduct(
  source: SourceDefinition,
  raw: RawItem,
  now: Date,
  windowDays = RELEASE_WINDOW_DAYS,
): GearProduct | null {
  const title = raw.title.trim();
  const url = safeHttpUrl(raw.url);
  const publishedAt = parseFlexibleDate(raw.dateText);

  if (!title || !url || !publishedAt) {
    return null;
  }

  const summary = truncate(raw.summary?.trim() ?? "", 180);
  const categories = raw.categories ?? [];
  const releaseDate = extractReleaseDate(`${title}\n${summary}`, publishedAt);

  if (!isGearLaunch(source, title, summary, categories, releaseDate)) {
    return null;
  }

  if (!isWithinReleaseWindow(publishedAt, releaseDate, now, windowDays)) {
    return null;
  }

  return {
    sourceId: source.id,
    brand: source.brand,
    kind: source.kind,
    title,
    url: normalizeUrl(url),
    summary,
    publishedAt: publishedAt.toISOString(),
    releaseDate: releaseDate ? releaseDate.toISOString() : null,
    sortTime: (releaseDate ?? publishedAt).getTime(),
  };
}
