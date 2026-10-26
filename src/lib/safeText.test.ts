import test from "node:test";
import assert from "node:assert/strict";
import { safeTextHtml, storedTextToPlain, escapeHtml } from "./safeText";

test("plain text is unchanged (escaped only where needed)", () => {
  assert.equal(safeTextHtml("hola, pasá"), "hola, pasá");
  assert.equal(safeTextHtml("línea 1\nlínea 2"), "línea 1\nlínea 2");
  assert.equal(safeTextHtml("te quiero <3 & más"), "te quiero &lt;3 &amp; más");
});

test("no markup survives: scripts and event handlers become inert text or vanish", () => {
  for (const evil of [
    "<img src=x onerror=alert(1)>",
    "<script>alert(1)</script>",
    "<svg onload=alert(1)>",
    "<a href=\"javascript:alert(1)\">x</a>",
    "&lt;img src=x onerror=alert(1)&gt;",
  ]) {
    const out = safeTextHtml(evil);
    assert.ok(!/<[a-z]/i.test(out), `${evil} → ${out}`);
  }
});

test("old content with line-break markup keeps its lines", () => {
  assert.equal(storedTextToPlain("uno<br>dos<br/>tres"), "uno\ndos\ntres");
  assert.equal(storedTextToPlain("<div>uno</div><div>dos</div>"), "uno\ndos");
  assert.equal(storedTextToPlain("a&amp;b&nbsp;c"), "a&b c");
});

test("non-strings render as nothing", () => {
  assert.equal(safeTextHtml(undefined), "");
  assert.equal(safeTextHtml(42), "");
  assert.equal(escapeHtml("\"'"), "&quot;&#39;");
});
