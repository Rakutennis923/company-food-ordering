import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("exports a usable GitHub Pages entry document", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  assert.match(html, /<html[^>]*lang="zh-Hant"/i);
  assert.match(html, /公司訂餐系統/);
  assert.match(html, /今天吃什麼？/);
});
