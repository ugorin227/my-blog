import type { BlogDraft } from "@/lib/camping-gear/types";

export const CAMPING_GEAR_CATEGORY_NAME = "キャンプ";

export function buildCampingGearPayload(draft: BlogDraft, categoryId: string) {
  return {
    title: draft.title,
    content: draft.content,
    category: categoryId,
  };
}

async function findCategoryId(
  serviceDomain: string,
  apiKey: string,
  name: string,
): Promise<string> {
  const filters = `name[equals]${name}`;
  const response = await fetch(
    `https://${serviceDomain}.microcms.io/api/v1/categories?filters=${encodeURIComponent(filters)}&fields=id,name&limit=1`,
    {
      headers: { "X-MICROCMS-API-KEY": apiKey },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `カテゴリー「${name}」を取得できませんでした (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as {
    contents?: Array<{ id?: string }>;
  };
  const categoryId = payload.contents?.[0]?.id;

  if (!categoryId) {
    throw new Error(`カテゴリー「${name}」が microCMS にありません。`);
  }

  return categoryId;
}

export class PublishConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishConfigError";
  }
}

export async function publishCampingGearPost(
  draft: BlogDraft,
): Promise<{ id: string }> {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey =
    process.env.MICROCMS_WRITE_API_KEY || process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    throw new PublishConfigError(
      "MICROCMS_SERVICE_DOMAIN と、POST 権限のある MICROCMS_WRITE_API_KEY（または MICROCMS_API_KEY）が必要です。",
    );
  }

  const categoryId = await findCategoryId(
    serviceDomain,
    process.env.MICROCMS_API_KEY || apiKey,
    CAMPING_GEAR_CATEGORY_NAME,
  );

  const response = await fetch(
    `https://${serviceDomain}.microcms.io/api/v1/blogs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MICROCMS-API-KEY": apiKey,
      },
      body: JSON.stringify(buildCampingGearPayload(draft, categoryId)),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`microCMS への投稿に失敗しました (${response.status}): ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { id?: string };
  if (!payload.id) {
    throw new Error("microCMS の応答にコンテンツ ID がありません。");
  }

  return { id: payload.id };
}
