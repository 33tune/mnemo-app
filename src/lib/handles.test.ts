import test from "node:test";
import assert from "node:assert/strict";
import { isClaimableHandle, safeNextPath } from "./handles";

test("claimable handles: format, reserved routes and temp_ names are refused", () => {
  assert.ok(isClaimableHandle("mara"));
  assert.ok(isClaimableHandle("dj_mara-2"));
  for (const h of ["dashboard", "admin", "login", "temp_abc", "ab", "Mara", "a".repeat(21), "../x"]) assert.ok(!isClaimableHandle(h), h);
});

test("next is always a path on this site", () => {
  assert.equal(safeNextPath("/reset-password"), "/reset-password");
  assert.equal(safeNextPath("/dashboard?view=space"), "/dashboard?view=space");
  for (const bad of ["@evil.com", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "", null, undefined, "/a b"]) {
    assert.equal(safeNextPath(bad), "/dashboard", String(bad));
  }
});
