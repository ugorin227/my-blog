import { resolveWeeklyEyecatchUrl } from "../src/lib/camping-gear/eyecatch";

const CONTENT_ID = "pmknmb52d";

async function main() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey =
    process.env.MICROCMS_WRITE_API_KEY || process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    throw new Error(
      "MICROCMS_SERVICE_DOMAIN と投稿用 API キーがこのビルドにありません。",
    );
  }

  const eyecatch = await resolveWeeklyEyecatchUrl();
  const response = await fetch(
    `https://${serviceDomain}.microcms.io/api/v1/blogs/${CONTENT_ID}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-MICROCMS-API-KEY": apiKey,
      },
      body: JSON.stringify({ eyecatch }),
    },
  );
  const detail = await response.text();

  if (!response.ok) {
    throw new Error(
      `10月12日の記事へアイキャッチを設定できませんでした (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  console.log(`eyecatch set on ${CONTENT_ID}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
