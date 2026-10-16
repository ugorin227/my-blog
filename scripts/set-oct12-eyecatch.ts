import { jstDate } from "../src/lib/camping-gear/dates";
import { renderWeeklyEyecatch } from "../src/lib/camping-gear/eyecatch";
import { uploadOfficialImage } from "../src/lib/camping-gear/media";

const CONTENT_ID = "pmknmb52d";

async function main() {
  const date = jstDate(2026, 10, 12);
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey =
    process.env.MICROCMS_WRITE_API_KEY || process.env.MICROCMS_API_KEY;

  if (!date || !serviceDomain || !apiKey) {
    throw new Error(
      "10月12日の日付、または microCMS の投稿用設定がこのビルドにありません。",
    );
  }

  const file = await renderWeeklyEyecatch(date);
  const eyecatch = await uploadOfficialImage(file);
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
      `10月12日の記事のアイキャッチを差し替えられませんでした (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  console.log(`eyecatch replaced on ${CONTENT_ID} (${file.filename})`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
