import { readFileSync } from "node:fs";

const CONTENT_ID = "pmknmb52d";
const FILENAME = "yurutto-weekly-eyecatch-20261012.jpg";

async function main() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey =
    process.env.MICROCMS_WRITE_API_KEY || process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    throw new Error("microCMS の投稿用設定がこのビルドにありません。");
  }

  const bytes = readFileSync(
    new URL(`../src/lib/camping-gear/assets/${FILENAME}`, import.meta.url),
  );
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), FILENAME);

  const uploaded = await fetch(
    `https://${serviceDomain}.microcms-management.io/api/v1/media`,
    {
      method: "POST",
      headers: { "X-MICROCMS-API-KEY": apiKey },
      body: form,
    },
  );
  const uploadedDetail = await uploaded.text();
  if (!uploaded.ok) {
    throw new Error(
      `画像のアップロードに失敗しました (${uploaded.status}): ${uploadedDetail.slice(0, 300)}`,
    );
  }

  const payload = JSON.parse(uploadedDetail);
  if (typeof payload.url !== "string" || !payload.url.includes("microcms-assets.io")) {
    throw new Error("microCMSの画像URLを取得できませんでした。");
  }

  const response = await fetch(
    `https://${serviceDomain}.microcms.io/api/v1/blogs/${CONTENT_ID}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-MICROCMS-API-KEY": apiKey,
      },
      body: JSON.stringify({ eyecatch: payload.url }),
    },
  );
  const detail = await response.text();
  if (!response.ok) {
    throw new Error(
      `10月12日の記事のアイキャッチを差し替えられませんでした (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  console.log(`eyecatch replaced on ${CONTENT_ID} (${FILENAME})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
