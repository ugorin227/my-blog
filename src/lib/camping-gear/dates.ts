type DateHit = {
  index: number;
  date: Date;
};

export function jstParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: read("year"), month: read("month"), day: read("day") };
}

export function jstDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`;
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = jstParts(date);
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    return null;
  }

  return date;
}

export function formatJstDate(iso: string): string {
  const parts = jstParts(new Date(iso));
  return `${parts.year}年${parts.month}月${parts.day}日`;
}

export function formatJstMonthDay(date: Date): string {
  const parts = jstParts(date);
  return `${parts.month}月${parts.day}日`;
}

export function parseFlexibleDate(input: string): Date | null {
  const trimmed = input.trim();
  const ymd = trimmed.match(/^(\d{4})[./年-](\d{1,2})[./月-](\d{1,2})/);

  if (ymd) {
    return jstDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

function inferYear(month: number, day: number, publishedAt: Date): number {
  const { year } = jstParts(publishedAt);
  const candidate = jstDate(year, month, day);
  if (!candidate) {
    return year;
  }

  const sixMonths = 183 * 24 * 60 * 60 * 1000;
  const diff = candidate.getTime() - publishedAt.getTime();

  if (diff < -sixMonths) {
    return year + 1;
  }

  if (diff > sixMonths) {
    return year - 1;
  }

  return year;
}

function collectDates(fragment: string, publishedAt: Date): DateHit[] {
  const hits: DateHit[] = [];

  for (const match of fragment.matchAll(
    /(\d{4})[./年](\d{1,2})[./月](\d{1,2})日?/g,
  )) {
    const date = jstDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (date) {
      hits.push({ index: match.index ?? 0, date });
    }
  }

  for (const match of fragment.matchAll(/(\d{1,2})月(\d{1,2})日/g)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    const date = jstDate(inferYear(month, day, publishedAt), month, day);
    if (date) {
      hits.push({ index: match.index ?? 0, date });
    }
  }

  for (const match of fragment.matchAll(/(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/g)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    const date = jstDate(inferYear(month, day, publishedAt), month, day);
    if (date) {
      hits.push({ index: match.index ?? 0, date });
    }
  }

  return hits;
}

export function extractReleaseDate(text: string, publishedAt: Date): Date | null {
  const anchor = text.search(/新発売|販売開始|発売/);
  if (anchor < 0) {
    return null;
  }

  const before = text.slice(Math.max(0, anchor - 48), anchor);
  const beforeHits = collectDates(before, publishedAt);
  if (beforeHits.length > 0) {
    return beforeHits[beforeHits.length - 1].date;
  }

  const after = text.slice(anchor, Math.min(text.length, anchor + 24));
  const afterHits = collectDates(after, publishedAt);
  return afterHits[0]?.date ?? null;
}

export function isWithinReleaseWindow(
  publishedAt: Date,
  releaseDate: Date | null,
  now: Date,
  days: number,
): boolean {
  const windowMs = days * 24 * 60 * 60 * 1000;
  const start = now.getTime() - windowMs;
  const target = releaseDate ?? publishedAt;
  const end = releaseDate ? now.getTime() + windowMs : now.getTime();
  const time = target.getTime();
  return time >= start && time <= end;
}
