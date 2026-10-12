import { OFFICIAL_IMAGE_DESCRIPTION } from "@/lib/camping-gear/images";
import { decodeEntities, escapeHtml } from "@/lib/camping-gear/text";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MICROCMS_IMAGE_HOST = "images.microcms-assets.io";

const OFFICIAL_FIGURE =
  /<figure><img src="([^"]+)" alt="([^"]*)"><figcaption>画像は公式サイトより<\/figcaption><\/figure>/g;

export type ImageFile = {
  bytes: Uint8Array;
  mime: string;
  filename: string;
};

export class MediaPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaPermissionError";
  }
}

export function officialImageMarkup(src: string, alt: string): string {
  return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"><figcaption>${OFFICIAL_IMAGE_DESCRIPTION}</figcaption></figure>`;
}

export function isMicrocmsImage(url: string): boolean {
  try {
    return new URL(url).hostname === MICROCMS_IMAGE_HOST;
  } catch {
    return false;
  }
}

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "img";
  }
}

export function sniffImage(bytes: Uint8Array, sourceUrl: string): ImageFile | null {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    return null;
  }

  let mime: string | null = null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    mime = "image/jpeg";
  } else if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    mime = "image/png";
  } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    mime = "image/gif";
  } else if (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    mime = "image/webp";
  }

  if (!mime) {
    return null;
  }

  return {
    bytes,
    mime,
    filename: filenameFor(sourceUrl, extensionFor(mime)),
  };
}

function filenameFor(sourceUrl: string, extension: string): string {
  let base = "official-image";
  try {
    const name = decodeURIComponent(new URL(sourceUrl).pathname.split("/").pop() ?? "");
    const stripped = name.replace(/\.[a-z0-9]+$/i, "");
    const safe = stripped.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    if (safe) {
      base = safe.slice(0, 80);
    }
  } catch {
    base = "official-image";
  }

  return `${base}.${extension}`;
}

export async function downloadOfficialImage(url: string): Promise<ImageFile> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "my-blog-camping-gear/1.0 (+https://my-blog-two-amber.vercel.app)",
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`画像を取得できませんでした (${response.status})`);
  }

  const advertised = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertised) && advertised > MAX_IMAGE_BYTES) {
    throw new Error("画像が5MBを超えています。");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const image = sniffImage(bytes, response.url || url);
  if (!image) {
    throw new Error("jpg、png、gif、webp の画像を取得できませんでした。");
  }

  return image;
}

export async function uploadOfficialImage(file: ImageFile): Promise<string> {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey =
    process.env.MICROCMS_WRITE_API_KEY || process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    throw new MediaPermissionError(
      "MICROCMS_SERVICE_DOMAIN と投稿用 API キーが必要です。",
    );
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(file.bytes)], { type: file.mime }),
    file.filename,
  );

  const response = await fetch(
    `https://${serviceDomain}.microcms-management.io/api/v1/media`,
    {
      method: "POST",
      headers: { "X-MICROCMS-API-KEY": apiKey },
      body: form,
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
      "microCMSのメディアアップロード権限がありません。マネジメントAPIで「メディアのアップロード」を有効にしてください。",
    );
  }

  if (!response.ok) {
    throw new Error(
      `画像のアップロードに失敗しました (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  let payload: { url?: string };
  try {
    payload = JSON.parse(detail) as { url?: string };
  } catch {
    throw new Error("microCMSの画像URLを取得できませんでした。");
  }

  if (!payload.url || !isMicrocmsImage(payload.url)) {
    throw new Error("microCMSの画像URLを取得できませんでした。");
  }

  return payload.url;
}

export async function hostOfficialImages(
  html: string,
  options: {
    download?: (url: string) => Promise<ImageFile>;
    upload?: (file: ImageFile) => Promise<string>;
  } = {},
): Promise<string> {
  const download = options.download ?? downloadOfficialImage;
  const upload = options.upload ?? uploadOfficialImage;
  const matches = [...html.matchAll(OFFICIAL_FIGURE)];
  if (matches.length === 0) {
    return html;
  }

  const replacements = await Promise.all(
    matches.map(async (match) => {
      const src = decodeEntities(match[1]);
      const alt = decodeEntities(match[2]);
      if (isMicrocmsImage(src)) {
        return officialImageMarkup(src, alt);
      }

      try {
        const hosted = await upload(await download(src));
        if (!isMicrocmsImage(hosted)) {
          throw new Error("microCMSの画像URLではありません。");
        }
        return officialImageMarkup(hosted, alt);
      } catch (error) {
        if (error instanceof MediaPermissionError) {
          throw error;
        }
        return "";
      }
    }),
  );

  let result = "";
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    result += html.slice(cursor, start) + replacements[index];
    cursor = start + match[0].length;
  });

  return result + html.slice(cursor);
}
