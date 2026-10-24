import assert from "node:assert/strict";
import test from "node:test";
import { buildShareLinks } from "./share";

test("XとFacebookの共有URLに記事タイトルとURLを設定する", () => {
  const title = "秋キャンプの道具";
  const url = "https://example.com/blog/article_1";
  const links = buildShareLinks(title, url);

  const x = new URL(links.x);
  assert.equal(x.origin, "https://twitter.com");
  assert.equal(x.pathname, "/intent/tweet");
  assert.equal(x.searchParams.get("text"), title);
  assert.equal(x.searchParams.get("url"), url);

  const facebook = new URL(links.facebook);
  assert.equal(facebook.origin, "https://www.facebook.com");
  assert.equal(facebook.pathname, "/sharer/sharer.php");
  assert.equal(facebook.searchParams.get("u"), url);
});
