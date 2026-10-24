export type ShareLinks = {
  x: string;
  facebook: string;
};

export function buildShareLinks(title: string, url: string): ShareLinks {
  const x = new URL("https://twitter.com/intent/tweet");
  x.searchParams.set("text", title);
  x.searchParams.set("url", url);

  const facebook = new URL("https://www.facebook.com/sharer/sharer.php");
  facebook.searchParams.set("u", url);

  return {
    x: x.toString(),
    facebook: facebook.toString(),
  };
}
