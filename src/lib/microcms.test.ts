import assert from "node:assert/strict";
import test from "node:test";
import { isPublishedBlog, publishedOnly } from "@/lib/microcms";

const published = { id: "a", publishedAt: "2026-11-16T00:02:04.647Z" };
const draft = { id: "b", publishedAt: null };
const draftUndefined = { id: "c", publishedAt: undefined };

test("isPublishedBlog は publishedAt がある記事だけを公開済みとする", () => {
  assert.equal(isPublishedBlog(published), true);
  assert.equal(isPublishedBlog(draft), false);
  assert.equal(isPublishedBlog(draftUndefined), false);
});

test("publishedOnly は下書きを除いて公開済みだけを残す", () => {
  const result = publishedOnly([published, draft, draftUndefined]);
  assert.deepEqual(
    result.map((blog) => blog.id),
    ["a"],
  );
});

test("publishedOnly は空配列と全件公開済みでもそのまま動く", () => {
  assert.deepEqual(publishedOnly([]), []);
  assert.deepEqual(publishedOnly([published]), [published]);
});
