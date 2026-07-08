const formatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDate(dateString: string): string {
  return formatter.format(new Date(dateString));
}
