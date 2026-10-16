import path from "node:path";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { formatJstMonthDay, jstParts } from "@/lib/camping-gear/dates";
import {
  isMicrocmsImage,
  MediaPermissionError,
  uploadOfficialImage,
  type ImageFile,
} from "@/lib/camping-gear/media";

const TITLE_FONT = "EyecatchTitle";
const BODY_FONT = "EyecatchBody";
const BRAND = "ゆるっとソロキャン";
const KICKER = "WEEKLY CAMP GEAR";

const MEDIA_PAGE_LIMIT = 100;
const MEDIA_PAGE_CAP = 20;

let fontsReady = false;

function assetPath(...parts: string[]): string {
  return path.join(process.cwd(), "src/lib/camping-gear/assets", ...parts);
}

function ensureFonts(): void {
  if (fontsReady) {
    return;
  }

  const title = GlobalFonts.registerFromPath(
    assetPath("fonts", "NotoSansJP-Bold.ttf"),
    TITLE_FONT,
  );
  const body = GlobalFonts.registerFromPath(
    assetPath("fonts", "NotoSansJP-Regular.ttf"),
    BODY_FONT,
  );

  if (!title || !body) {
    throw new Error("アイキャッチ用のフォントを読み込めませんでした。");
  }

  fontsReady = true;
}

export function weeklyEyecatchTitle(date: Date): string {
  return `今週のキャンプギア　${formatJstMonthDay(date)}`;
}

export function weeklyEyecatchFilename(date: Date): string {
  const { year, month, day } = jstParts(date);
  const stamp = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  return `yurutto-weekly-eyecatch-${stamp}.jpg`;
}

function drawTracked(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  x: number,
  y: number,
  tracking: number,
): number {
  let cursor = x;
  for (const character of text) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + tracking;
  }
  return cursor;
}

export async function renderWeeklyEyecatch(date: Date): Promise<ImageFile> {
  ensureFonts();

  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const background = await loadImage(assetPath("background.jpg"));
  ctx.drawImage(background, 0, 0, width, height);

  const veil = ctx.createLinearGradient(0, 0, 1280, 0);
  veil.addColorStop(0, "rgba(5, 12, 26, 0.42)");
  veil.addColorStop(1, "rgba(5, 12, 26, 0)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, 1280, height);

  ctx.textBaseline = "top";
  const left = 132;
  const kickerY = 368;
  const titleY = 424;
  const titleSize = 84;
  const brandSize = 32;
  const brandY = titleY + titleSize + 28;

  ctx.fillStyle = "#EC7030";
  ctx.fillRect(92, kickerY + 2, 3, brandY + brandSize - kickerY);

  ctx.font = `20px ${BODY_FONT}`;
  ctx.fillStyle = "#EC7030";
  drawTracked(ctx, KICKER, left, kickerY, 7.2);

  ctx.font = `${titleSize}px ${TITLE_FONT}`;
  ctx.fillStyle = "#F8F5EF";
  drawTracked(ctx, weeklyEyecatchTitle(date), left, titleY, 1);

  ctx.font = `${brandSize}px ${BODY_FONT}`;
  ctx.fillStyle = "#CED6E0";
  drawTracked(ctx, BRAND, left, brandY, 1.2);

  return {
    bytes: new Uint8Array(canvas.toBuffer("image/jpeg", 93)),
    mime: "image/jpeg",
    filename: weeklyEyecatchFilename(date),
  };
}

export function extractMediaUrls(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as { media?: unknown; contents?: unknown };
  const lists = [record.media, record.contents].filter(Array.isArray);
  const urls: string[] = [];

  for (const list of lists) {
    for (const item of list) {
      if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof item.url === "string"
      ) {
        urls.push(item.url);
      }
    }
  }

  return urls;
}

export function mediaUrlMatchesFilename(url: string, filename: string): boolean {
  try {
    return decodeURIComponent(new URL(url).pathname).endsWith(`/${filename}`);
  } catch {
    return false;
  }
}

type MediaPage = {
  urls: string[];
  totalCount: number;
};

async function fetchMicrocmsMediaPage(offset: number): Promise<MediaPage> {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey =
    process.env.MICROCMS_WRITE_API_KEY || process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    throw new MediaPermissionError(
      "MICROCMS_SERVICE_DOMAIN と投稿用 API キーが必要です。",
    );
  }

  const response = await fetch(
    `https://${serviceDomain}.microcms-management.io/api/v1/media?limit=${MEDIA_PAGE_LIMIT}&offset=${offset}`,
    {
      headers: { "X-MICROCMS-API-KEY": apiKey },
      signal: AbortSignal.timeout(8000),
    },
  );
  const detail = await response.text();

  if (
    response.status === 401 ||
    response.status === 403 ||
    /forbidden/i.test(detail)
  ) {
    throw new MediaPermissionError(
      "microCMSのメディア一覧を取得できません。マネジメントAPIの権限を確認してください。",
    );
  }

  if (!response.ok) {
    throw new Error(
      `メディア一覧の取得に失敗しました (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  let payload: { totalCount?: number };
  try {
    payload = JSON.parse(detail) as { totalCount?: number };
  } catch {
    throw new Error("microCMSのメディア一覧を読み取れませんでした。");
  }

  return {
    urls: extractMediaUrls(payload),
    totalCount:
      typeof payload.totalCount === "number"
        ? payload.totalCount
        : Number.POSITIVE_INFINITY,
  };
}

export async function listMicrocmsMediaUrls(
  fetchPage: (offset: number) => Promise<MediaPage> = fetchMicrocmsMediaPage,
): Promise<string[]> {
  const seen = new Set<string>();

  for (let page = 0; page < MEDIA_PAGE_CAP; page += 1) {
    const { urls, totalCount } = await fetchPage(page * MEDIA_PAGE_LIMIT);
    let added = 0;

    for (const url of urls) {
      if (!seen.has(url)) {
        seen.add(url);
        added += 1;
      }
    }

    if (added === 0 || seen.size >= totalCount || urls.length < MEDIA_PAGE_LIMIT) {
      break;
    }
  }

  return [...seen];
}

export async function resolveWeeklyEyecatchUrl(
  options: {
    date?: Date;
    read?: () => ImageFile | Promise<ImageFile>;
    listUrls?: () => Promise<string[]>;
    upload?: (file: ImageFile) => Promise<string>;
  } = {},
): Promise<string> {
  const date = options.date ?? new Date();
  const read = options.read ?? (() => renderWeeklyEyecatch(date));
  const listUrls = options.listUrls ?? listMicrocmsMediaUrls;
  const upload = options.upload ?? uploadOfficialImage;
  const file = await read();

  try {
    const existing = (await listUrls()).find(
      (url) => mediaUrlMatchesFilename(url, file.filename) && isMicrocmsImage(url),
    );
    if (existing) {
      return existing;
    }
  } catch {
    // 一覧が取れない週も、アップロードでアイキャッチを付ける。
  }

  const uploaded = await upload(file);
  if (!isMicrocmsImage(uploaded)) {
    throw new Error("microCMSの画像URLを取得できませんでした。");
  }

  return uploaded;
}
