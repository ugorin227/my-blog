import { parseRssItems } from "@/lib/camping-gear/rss";
import {
  parseCainzNews,
  parseCampalNews,
  parseCaptainStagNews,
  parseColemanNews,
  parseDcmNews,
  parseLogosNews,
} from "@/lib/camping-gear/html";
import type { SourceDefinition } from "@/lib/camping-gear/types";

export const GEAR_SOURCES: SourceDefinition[] = [
  {
    id: "snow-peak",
    brand: "スノーピーク",
    kind: "manufacturer",
    listUrl: "https://www.snowpeak.co.jp/news/feed/",
    parse: parseRssItems,
  },
  {
    id: "dod",
    brand: "DOD",
    kind: "manufacturer",
    listUrl: "https://www.dod.camp/news/release/feed/",
    parse: parseRssItems,
  },
  {
    id: "uniflame",
    brand: "ユニフレーム",
    kind: "manufacturer",
    listUrl: "https://www.uniflame.co.jp/feed/",
    parse: parseRssItems,
  },
  {
    id: "logos",
    brand: "LOGOS",
    kind: "manufacturer",
    listUrl: "https://www.logos.ne.jp/news-list",
    parse: parseLogosNews,
  },
  {
    id: "captain-stag",
    brand: "キャプテンスタッグ",
    kind: "manufacturer",
    listUrl: "https://www.captainstag.net/news/",
    parse: parseCaptainStagNews,
  },
  {
    id: "coleman",
    brand: "コールマン",
    kind: "manufacturer",
    listUrl: "https://www.coleman.co.jp/news/",
    parse: parseColemanNews,
  },
  {
    id: "ogawa",
    brand: "ogawa",
    kind: "manufacturer",
    listUrl: "https://www.campal.co.jp/news/",
    parse: parseCampalNews,
  },
  {
    id: "workman",
    brand: "ワークマン",
    kind: "home-center",
    listUrl: "https://www.workman.co.jp/news/feed/",
    parse: parseRssItems,
  },
  {
    id: "cainz",
    brand: "カインズ",
    kind: "home-center",
    listUrl: "https://www.cainz.co.jp/news/",
    parse: parseCainzNews,
  },
  {
    id: "dcm",
    brand: "DCM",
    kind: "home-center",
    listUrl: "https://www.dcm-hc.co.jp/news/",
    parse: parseDcmNews,
  },
];

export async function fetchSourceText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "my-blog-camping-gear/1.0 (+https://my-blog-two-amber.vercel.app)",
      Accept:
        "text/html,application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}
