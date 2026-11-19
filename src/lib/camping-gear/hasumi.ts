import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  isMicrocmsImage,
  MediaPermissionError,
  uploadOfficialImage,
  type ImageFile,
} from "@/lib/camping-gear/media";
import {
  listMicrocmsMediaUrls,
  mediaUrlMatchesFilename,
} from "@/lib/camping-gear/eyecatch";
import { escapeHtml } from "@/lib/camping-gear/text";

/**
 * 泊ハスミ（キャンプ・車中泊初心者）のひとこと。
 * 商品名と公式の説明文からカテゴリと特徴を拾い、テンプレートで組み立てる。
 * 実際に使った体験は作らず、「使ってみたい」「〜そう」という所感に留める。
 */

export const HASUMI_ICONS = [
  { key: "smile", filename: "hasumi-icon-smile.jpg", label: "笑顔" },
  { key: "laugh", filename: "hasumi-icon-laugh.jpg", label: "大笑い" },
  { key: "wink", filename: "hasumi-icon-wink.jpg", label: "ウインク" },
] as const;

export type HasumiIconKey = (typeof HASUMI_ICONS)[number]["key"];

type Category = {
  id: string;
  keywords: string[];
  impressions: string[];
  usages: string[];
};

const CATEGORIES: Category[] = [
  {
    id: "tent",
    keywords: ["テント", "タープ", "シェルター", "ワンポール", "スクリーン"],
    impressions: [
      "テントまわりは設営のたびにあたふたするから、こういうの気になる…！",
      "拠点がしっかりすると、キャンプ全体が落ち着く気がするんだよね。",
    ],
    usages: [
      "まずは車中泊と組み合わせたデイキャンプで試してみたいな。",
      "最初は広いサイトでのんびり張るところから練習したい。",
    ],
  },
  {
    id: "car",
    keywords: ["車中泊", "車載", "サンシェード", "車内用", "カーテン"],
    impressions: [
      "車中泊ビギナーの私にはドンピシャなやつ…！",
      "車中泊の快適さって、こういう小物で全然変わるらしいよね。",
    ],
    usages: [
      "次の車中泊でさっそく試して、寝心地の変化を比べてみたいな。",
      "週末の車中泊に積んでいって、使い勝手を確かめてみたい。",
    ],
  },
  {
    id: "chair",
    keywords: ["チェア", "椅子", "いす", "ベンチ", "スツール"],
    impressions: [
      "座り心地って、キャンプの満足度に直結すると思うんだよね。",
      "ゆっくり座れる場所があると、サイトが一気に「自分の場所」になる感じがする。",
    ],
    usages: [
      "焚き火のそばに置いて、コーヒー片手にぼーっとする時間に使いたい…！",
      "車中泊の外ごはんスペースに置いて、朝の光の中で使ってみたい。",
    ],
  },
  {
    id: "table",
    keywords: ["テーブル", "ロールトップ", "天板"],
    impressions: [
      "物の置き場が決まるだけで、サイトのごちゃつきが減るんだよね。",
      "作業スペースが安定すると、調理のときの小さなイライラが減りそう。",
    ],
    usages: [
      "車の横に広げて、車中泊のキッチン代わりに使ってみたいな。",
      "ランタンとコップを置いて、夜のまったりスペースを作りたい。",
    ],
  },
  {
    id: "lantern",
    keywords: ["ランタン", "ライト", "ランプ", "照明", "ヘッドライト", "懐中電灯"],
    impressions: [
      "明かりの雰囲気ひとつで、夜のサイトがぐっと落ち着くんだよね。",
      "暗くなってからの安心感って、明かりの準備で全然違うと思う。",
    ],
    usages: [
      "車中泊の夜、車内と外を行き来するときの足元灯にも良さそう。",
      "テントやタープの下に吊るして、夜ごはんの明かりにしたいな。",
    ],
  },
  {
    id: "sleep",
    keywords: [
      "寝袋",
      "シュラフ",
      "マット",
      "コット",
      "ピロー",
      "枕",
      "ブランケット",
      "毛布",
      "エアーベッド",
      "ベッド",
    ],
    impressions: [
      "寝る道具で妥協すると翌日がつらいって、先輩キャンパーに聞いたばかり。",
      "よく眠れるかどうかで、次の日の元気さが全然違うらしいよね。",
    ],
    usages: [
      "車中泊のベッドメイキングにも応用できそうか、サイズを要チェックだね。",
      "まずは家のベランダで寝心地を試すところから始めたいな。",
    ],
  },
  {
    id: "fire",
    keywords: ["焚き火", "焚火", "ファイヤー", "ファイア", "グリル", "バーベキュー", "BBQ", "炭"],
    impressions: [
      "焚き火はまだ少しドキドキするけど、憧れは強い…！",
      "火を囲む時間って、キャンプのハイライトだと思うんだよね。",
    ],
    usages: [
      "最初は小さい火から、安全確認をしながら少しずつ慣れていきたいな。",
      "焚き火で温めた飲み物を片手に、星を見る夜に使ってみたい。",
    ],
  },
  {
    id: "cook",
    keywords: [
      "バーナー",
      "ストーブ",
      "クッカー",
      "コンロ",
      "ケトル",
      "ポット",
      "フライパン",
      "メスティン",
      "ホットサンド",
      "ダッチオーブン",
      "鉄板",
    ],
    impressions: [
      "キャンプごはんのレパートリー、少しずつ増やしていきたいところ。",
      "外で作るごはんって、同じメニューでも特別に感じるんだよね。",
    ],
    usages: [
      "車中泊の朝ごはん作りからデビューさせてみたいな。",
      "まずはコーヒーを淹れるみたいな、簡単なところから試したい。",
    ],
  },
  {
    id: "cooler",
    keywords: ["クーラー", "保冷", "ソフトクーラー", "保冷バッグ"],
    impressions: [
      "保冷がしっかりしていると、買い出しの心配が減って助かる…！",
      "食材が傷む心配が減ると、献立の自由度が上がるんだよね。",
    ],
    usages: [
      "車に積んで、道の駅で買った食材をそのまま持ち帰るのに使いたいな。",
      "普段の買い物にも使えるサイズなら、出番がぐっと増えそう。",
    ],
  },
  {
    id: "storage",
    keywords: ["収納", "コンテナ", "ボックス", "バッグ", "ケース", "ラック", "ハンガー", "ポーチ"],
    impressions: [
      "荷物が散らかるのは、初心者あるあるだと思う…。",
      "定位置が決まると、出発前の確認がすごく楽になるんだよね。",
    ],
    usages: [
      "車内の定位置を決めて積み込めば、忘れ物も減りそう。",
      "家での保管場所も一緒に決めて、積み下ろしを楽にしたいな。",
    ],
  },
  {
    id: "wear",
    keywords: [
      "ジャケット",
      "パンツ",
      "シューズ",
      "ブーツ",
      "サンダル",
      "ウェア",
      "シャツ",
      "帽子",
      "ハット",
      "グローブ",
      "手袋",
    ],
    impressions: [
      "動きやすくて汚れを気にしなくていい服は、それだけで安心感が違う。",
      "天気が変わりやすい場所だと、着るものの備えが大事だって実感してる…。",
    ],
    usages: [
      "車中泊の移動日にもそのまま着ていけそうなのがいいな。",
      "設営で動き回る日に着て、動きやすさを確かめてみたい。",
    ],
  },
];

const GENERIC_CATEGORY: Category = {
  id: "generic",
  keywords: [],
  impressions: [
    "新商品って聞くだけでワクワクしちゃう。",
    "こういう道具が増えると、キャンプの楽しみ方も広がるんだろうな。",
  ],
  usages: [
    "自分のキャンプスタイルに合うか、サイズと重さをまず確認したいな。",
    "次のキャンプで使う場面を想像しながら、じっくり検討したい。",
  ],
};

type Feature = {
  keywords: string[];
  reaction: string;
};

const FEATURES: Feature[] = [
  {
    keywords: ["軽量", "超軽量", "軽い"],
    reaction: "軽いと車への積み込みが楽で、腰の心配が減るのが助かる…！",
  },
  {
    keywords: ["コンパクト", "折りたたみ", "折り畳み", "収納サイズ"],
    reaction: "コンパクトにまとまるなら、ハスラーみたいな軽でも荷室に余裕ができそう。",
  },
  {
    keywords: ["ワンタッチ", "簡単設営", "設営が簡単", "組み立て簡単", "ポップアップ"],
    reaction: "組み立てや設営が簡単そうなのは、初心者には何よりの安心材料だね。",
  },
  {
    keywords: ["保冷", "保温"],
    reaction: "保冷・保温がしっかりしていると、季節を問わず出番が多そう。",
  },
  {
    keywords: ["防水", "耐水", "撥水"],
    reaction: "急な雨でも慌てなくていいのは、天気読みがまだ下手な私には心強い…！",
  },
  {
    keywords: ["USB", "充電式", "充電タイプ", "ソーラー"],
    reaction: "充電式なら電池の買い忘れも心配なし。車のUSBからも充電できそう。",
  },
  {
    keywords: ["大容量", "たっぷり", "広々", "大型"],
    reaction: "たっぷり使えるのは、つい荷物が増えがちな私にはありがたい…。",
  },
  {
    keywords: ["高さ調整", "高さ調節", "角度調整", "リクライニング"],
    reaction: "高さや角度を調整できるなら、使う場所を選ばずに済みそう。",
  },
  {
    keywords: ["2WAY", "2way", "兼用", "マルチ", "両用"],
    reaction: "何通りにも使えるなら、荷物を減らしたい車中泊派にはぴったりかも。",
  },
];

const NO_FEATURE_REACTION =
  "公式の説明を読むと、細かいところまで考えて作ってあるんだなぁって感心しちゃう。";

const CLOSINGS = [
  "使う前に、サイズと使い方をもう一回確認しておこうっと。",
  "よーし、次のキャンプの候補メモに入れておこう。",
  "買う前に口コミもチェックして、慎重に決めるのが私流だよ。",
  "まずは店頭で実物を見てみたいな。",
];

function seedOf(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: number): T {
  const length = items.length;
  const index = ((Math.floor(seed) % length) + length) % length;
  return items[index];
}

export function hasumiIconKeyForIndex(index: number): HasumiIconKey {
  const icon = HASUMI_ICONS[((index % HASUMI_ICONS.length) + HASUMI_ICONS.length) % HASUMI_ICONS.length];
  return icon.key;
}

export function hasumiIconFilename(key: HasumiIconKey): string {
  return HASUMI_ICONS.find((icon) => icon.key === key)?.filename ?? HASUMI_ICONS[0].filename;
}

/** 商品名と説明文から、ハスミのひとこと（所感＋使い方の案）を組み立てる。 */
export function buildHasumiComment(input: {
  title: string;
  summary: string;
  index: number;
}): string {
  const haystack = `${input.title} ${input.summary}`;
  const category =
    CATEGORIES.find((candidate) =>
      candidate.keywords.some((keyword) => haystack.includes(keyword)),
    ) ?? GENERIC_CATEGORY;
  const feature = FEATURES.find((candidate) =>
    candidate.keywords.some((keyword) => haystack.includes(keyword)),
  );
  const seed = seedOf(`${input.title}#${input.index}`);

  return [
    pick(category.impressions, seed),
    feature?.reaction ?? NO_FEATURE_REACTION,
    pick(category.usages, seed / 8),
    pick(CLOSINGS, seed / 32),
  ].join("");
}

export function hasumiCommentMarkup(input: {
  title: string;
  summary: string;
  index: number;
}): string {
  const iconKey = hasumiIconKeyForIndex(input.index);
  const filename = hasumiIconFilename(iconKey);
  const comment = buildHasumiComment(input);

  return [
    `<div class="hasumi-comment">`,
    `<img class="hasumi-comment__icon" src="${filename}" alt="泊ハスミのアイコン" width="320" height="320">`,
    `<div class="hasumi-comment__bubble">`,
    `<p class="hasumi-comment__name">泊ハスミ｜キャンプ初心者のひとこと</p>`,
    `<p>${escapeHtml(comment)}</p>`,
    `</div></div>`,
  ].join("");
}

const HASUMI_ICON_IMG =
  /<img class="hasumi-comment__icon" src="(hasumi-icon-(?:smile|laugh|wink)\.jpg)"[^>]*>/g;

function iconAssetPath(filename: string): string {
  return path.join(
    process.cwd(),
    "src/lib/camping-gear/assets",
    filename,
  );
}

async function readIconFile(filename: string): Promise<ImageFile> {
  const bytes = new Uint8Array(await readFile(iconAssetPath(filename)));
  return { bytes, mime: "image/jpeg", filename };
}

/**
 * 本文中のハスミアイコン（ファイル名の仮置き）を microCMS のメディアURLへ差し替える。
 * アイコンは同名メディアがあれば再利用し、無ければ一度だけアップロードする。
 * 権限エラー以外の失敗ではアイコン画像だけを省き、吹き出しの文面は残す。
 */
export async function hostHasumiIcons(
  html: string,
  options: {
    read?: (filename: string) => Promise<ImageFile>;
    listUrls?: () => Promise<string[]>;
    upload?: (file: ImageFile) => Promise<string>;
  } = {},
): Promise<string> {
  const matches = [...html.matchAll(HASUMI_ICON_IMG)];
  if (matches.length === 0) {
    return html;
  }

  const read = options.read ?? readIconFile;
  const listUrls = options.listUrls ?? listMicrocmsMediaUrls;
  const upload = options.upload ?? uploadOfficialImage;

  const filenames = [...new Set(matches.map((match) => match[1]))];
  let existing: string[] = [];
  try {
    existing = await listUrls();
  } catch {
    // 一覧が取れなくても、アップロードでアイコンを付ける。
  }

  const resolved = new Map<string, string | null>();
  for (const filename of filenames) {
    const kept = existing.find(
      (url) => mediaUrlMatchesFilename(url, filename) && isMicrocmsImage(url),
    );
    if (kept) {
      resolved.set(filename, kept);
      continue;
    }

    try {
      const uploaded = await upload(await read(filename));
      resolved.set(filename, isMicrocmsImage(uploaded) ? uploaded : null);
    } catch (error) {
      if (error instanceof MediaPermissionError) {
        throw error;
      }
      resolved.set(filename, null);
    }
  }

  return html.replace(HASUMI_ICON_IMG, (whole, filename: string) => {
    const url = resolved.get(filename);
    if (!url) {
      return "";
    }
    return whole.replace(`src="${filename}"`, `src="${escapeHtml(url)}"`);
  });
}
