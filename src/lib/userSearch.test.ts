import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSearchQuery, ilikeEscape, rankSearchHits, SEARCH_MAX_RESULTS } from "./userSearch";

test("search query: lowercase, no @, no wildcards or PostgREST syntax, 30 max", () => {
  assert.equal(cleanSearchQuery("  @Zaid "), "zaid");
  assert.equal(cleanSearchQuery("a%b,c(d)*"), "abcd");
  assert.equal(cleanSearchQuery("Ñandú  club"), "ñandú club");
  assert.equal(cleanSearchQuery("x".repeat(50)).length, 30);
  assert.equal(cleanSearchQuery("%%%"), "");
});

test("ILIKE escape keeps _ and backslash literal", () => {
  assert.equal(ilikeEscape("a_b"), "a\\_b");
  assert.equal(ilikeEscape("a\\b"), "a\\\\b");
});

test("ranking: exact handle, handle prefix, name prefix, word prefix, rest", () => {
  const hits = [
    { handle: "xzaid", name: "Otro" },
    { handle: "maria", name: "Zaida Pérez" },
    { handle: "zaidito", name: "Z" },
    { handle: "zaid", name: "Zaid" },
    { handle: "lu", name: "Lu Zaid" },
  ];
  assert.deepEqual(rankSearchHits(hits, "zaid").map(h => h.handle), ["zaid", "zaidito", "maria", "lu", "xzaid"]);
  assert.equal(rankSearchHits(Array.from({ length: 40 }, (_, i) => ({ handle: `u${i}`, name: "n" })), "u").length, SEARCH_MAX_RESULTS);
});
