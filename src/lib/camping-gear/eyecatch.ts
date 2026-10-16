import { readFileSync } from "node:fs";
import path from "node:path";
import {
  isMicrocmsImage,
  MediaPermissionError,
  uploadOfficialImage,
  type ImageFile,
} from "@/lib/camping-gear/media";

/** 同名メディアがあれば再アップロードしない。絵を差し替えるときはファイル名も変える。 */
export const WEEKLY_EYECATCH_FILENAME = "yurutto-weekly-eyecatch.jpg";

const MEDIA_PAGE_LIMIT = 100;
const MEDIA_PAGE_CAP = 20;

export function weeklyEyecatchPath(): string {
  return path.join(
    process.cwd(),
    "src/lib/camping-gear/assets",
    WEEKLY_EYECATCH_FILENAME,
  );
}

export function readWeeklyEyecatch(): ImageFile {
  return {
    bytes: new Uint8Array(readFileSync(weeklyEyecatchPath())),
    mime: "image/jpeg",
    filename: WEEKLY_EYECATCH_FILENAME,
  };
}

export function mediaUrlMatchesFilename(url: string, filename: string): boolean {
  try {
    return decodeURIComponent(new URL(url).pathname).endsWith(`/${filename}`);
  } catch {
    return false;
  }
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
      typeof payload.totalCount === "number" ? payload.totalCount : Number.POSITIVE_INFINITY,
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
    read?: () => ImageFile;
    listUrls?: () => Promise<string[]>;
    upload?: (file: ImageFile) => Promise<string>;
  } = {},
): Promise<string> {
  const read = options.read ?? readWeeklyEyecatch;
  const listUrls = options.listUrls ?? listMicrocmsMediaUrls;
  const upload = options.upload ?? uploadOfficialImage;
  const file = read();

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
