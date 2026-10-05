import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRefocusTarget } from "./focusRecovery";

const t = (name: string) => ({ name, focus: () => {} });

test("pickRefocusTarget: first connected candidate with a focusable target, in order", () => {
  const field = t("field"), next = t("next"), group = t("group"), canvas = t("canvas");
  assert.equal(pickRefocusTarget([{ connected: true, target: field }, { connected: true, target: next }]), field);
  assert.equal(pickRefocusTarget([{ connected: false, target: field }, { connected: true, target: next }]), next, "removed field -> next item");
  assert.equal(pickRefocusTarget([null, { connected: true, target: null }, { connected: true, target: group }]), group);
  assert.equal(pickRefocusTarget([{ connected: false, target: field }, undefined, { connected: true, target: canvas }]), canvas, "never body: canvas last");
  assert.equal(pickRefocusTarget([]), null);
});
