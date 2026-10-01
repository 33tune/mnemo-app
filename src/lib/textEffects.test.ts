import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTextEffectStyle, resolveLetterEffectStyle } from "./textEffects";

test("resolveTextEffectStyle: undefined input returns empty style (no visual change)", () => {
  assert.deepEqual(resolveTextEffectStyle(undefined), {});
});

test("resolveTextEffectStyle: empty object returns empty style", () => {
  assert.deepEqual(resolveTextEffectStyle({}), {});
});

test("resolveTextEffectStyle: shadow with no params reproduces the pre-existing rgba(0,0,0,0.5) look", () => {
  const style = resolveTextEffectStyle({ shadow: {} });
  assert.equal(style.textShadow, "0px 2px 4px rgba(0,0,0,0.5)");
});

test("resolveTextEffectStyle: shadow with explicit color uses full opacity by default", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#ff0000" } });
  assert.equal(style.textShadow, "0px 2px 4px rgba(255,0,0,1)");
});

test("resolveTextEffectStyle: shadow independent offsetX/offsetY/blur/opacity", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#00ff00", offsetX: 3, offsetY: -1, blur: 10, opacity: 0.3 } });
  assert.equal(style.textShadow, "3px -1px 10px rgba(0,255,0,0.3)");
});

test("resolveTextEffectStyle: glow with zero intensity produces no layer", () => {
  const style = resolveTextEffectStyle({ glow: { intensity: 0 } });
  assert.equal(style.textShadow, undefined);
});

test("resolveTextEffectStyle: glow with intensity and explicit radius", () => {
  const style = resolveTextEffectStyle({ glow: { intensity: 0.5, radius: 12, color: "#ffffff" } });
  assert.equal(style.textShadow, "0 0 12px rgba(255,255,255,0.5)");
});

test("resolveTextEffectStyle: shadow and glow combine as two layers", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#000000", opacity: 0.6 }, glow: { intensity: 0.4, radius: 8, color: "#00ffff" } });
  assert.equal(style.textShadow, "0px 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,255,255,0.4)");
});

test("resolveTextEffectStyle: stroke applies WebkitTextStroke", () => {
  const style = resolveTextEffectStyle({ stroke: { width: 1, color: "#0000ff" } });
  assert.equal(style.WebkitTextStroke, "1px #0000ff");
});

test("resolveTextEffectStyle: stroke with width 0 is a no-op", () => {
  const style = resolveTextEffectStyle({ stroke: { width: 0 } });
  assert.equal(style.WebkitTextStroke, undefined);
});

test("resolveTextEffectStyle (FASE 3): blur applies filter, independent of everything else", () => {
  const style = resolveTextEffectStyle({ blur: 2, shadow: { color: "#000000" } });
  assert.equal(style.filter, "blur(2px)");
  assert.ok(style.textShadow); // shadow still applies — no coupling
});

test("resolveTextEffectStyle: gradient (roleEffect param) sets backgroundClip + transparent color, no shimmer", () => {
  const style = resolveTextEffectStyle(undefined, { gradient: { colors: ["#ff0000", "#0000ff"], angle: 90 } });
  assert.equal(style.backgroundImage, "linear-gradient(90deg, #ff0000, #0000ff)");
  assert.equal(style.backgroundClip, "text");
  assert.equal(style.WebkitBackgroundClip, "text");
  assert.equal(style.color, "transparent");
  assert.equal(style.animation, undefined);
});

test("resolveTextEffectStyle (Product closeout): multicolor gradient with 4 stops", () => {
  const style = resolveTextEffectStyle(undefined, { gradient: { colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00"], angle: 45 } });
  assert.equal(style.backgroundImage, "linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)");
});

test("resolveTextEffectStyle (Product closeout): defensive fallback reads legacy {from,to} data with no `colors` array, angle defaults to 90", () => {
  const style = resolveTextEffectStyle(undefined, { gradient: { from: "#111111", to: "#eeeeee" } as never });
  assert.equal(style.backgroundImage, "linear-gradient(90deg, #111111, #eeeeee)");
});

test("resolveTextEffectStyle (Product closeout — shimmer fix): shimmer now works WITHOUT an explicit gradient, using the resolved solid color", () => {
  const style = resolveTextEffectStyle(undefined, { shimmer: { intensity: 0.5 } }, "#ff8800");
  assert.ok(String(style.backgroundImage).includes("#ff8800"));
  assert.equal(style.backgroundClip, "text");
  assert.equal(style.color, "transparent");
  assert.ok(String(style.animation).includes("mnemo-text-shimmer"));
});

test("resolveTextEffectStyle (Product closeout — shimmer fix): shimmer without gradient and without a resolvedColor still renders (falls back to white)", () => {
  const style = resolveTextEffectStyle(undefined, { shimmer: { intensity: 0.5 } });
  assert.ok(style.backgroundImage);
  assert.equal(style.backgroundClip, "text");
});

test("resolveTextEffectStyle (bug fix — real gradient flow): gradient + shimmer scrolls the gradient's own colors, not a static highlight over a frozen gradient", () => {
  const style = resolveTextEffectStyle(undefined, {
    gradient: { colors: ["#ff0000", "#0000ff"], angle: 45 },
    shimmer: { intensity: 0.5, speed: 1 },
  });
  // Single animated layer — a repeating gradient whose period is the full
  // gradient line, every stop offset by the animated --mnemo-flow-offset
  // (see resolveGradientFlowCss's header). No background-size/-position
  // sweep anymore: that only ever moved along X, ignoring `angle`.
  assert.equal(
    style.backgroundImage,
    "repeating-linear-gradient(45deg, #ff0000 calc(var(--mnemo-flow-offset, 0%) + 0%), #0000ff calc(var(--mnemo-flow-offset, 0%) + 50%), #ff0000 calc(var(--mnemo-flow-offset, 0%) + 100%))",
  );
  assert.equal(style.backgroundSize, undefined);
  assert.equal(style.backgroundPosition, undefined);
  assert.ok(String(style.animation).includes("mnemo-text-gradient-flow"));
  assert.ok(!String(style.animation).includes("mnemo-text-shimmer"));
  assert.equal(style.color, "transparent");
});

test("resolveTextEffectStyle (bug fix — real gradient flow): works for 3+ stop / rainbow-style gradients, one evenly spaced period closing on the first color", () => {
  const colors = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#8b00ff"];
  const style = resolveTextEffectStyle(undefined, { gradient: { colors, angle: 90 }, shimmer: {} });
  const css = String(style.backgroundImage);
  assert.ok(css.startsWith("repeating-linear-gradient(90deg, "));
  const stops = css.slice("repeating-linear-gradient(90deg, ".length, -1).split(/, (?=#)/);
  assert.equal(stops.length, colors.length + 1);
  assert.deepEqual(stops.map(s => s.split(" ")[0]), [...colors, colors[0]]);
  assert.ok(stops[0].endsWith("+ 0%)"));
  assert.ok(stops[stops.length - 1].endsWith("+ 100%)"));
});

test("resolveTextEffectStyle (bug fix — real gradient flow): the gradient angle is preserved for every angle (flow follows it, incl. 0°/180° where a horizontal sweep was invisible)", () => {
  for (const angle of [0, 45, 90, 135, 180, 270]) {
    const style = resolveTextEffectStyle(undefined, { gradient: { colors: ["#ff0000", "#0000ff"], angle }, shimmer: {} });
    assert.ok(String(style.backgroundImage).startsWith(`repeating-linear-gradient(${angle}deg, `));
  }
});

test("resolveTextEffectStyle (bug fix — real gradient flow): legacy {from,to} gradient data still flows", () => {
  const style = resolveTextEffectStyle(undefined, {
    gradient: { colors: [], angle: 90, from: "#ff0000", to: "#0000ff" },
    shimmer: {},
  });
  assert.ok(String(style.backgroundImage).includes("#ff0000 calc("));
  assert.ok(String(style.backgroundImage).includes("#0000ff calc("));
});

test("resolveTextEffectStyle (bug fix — real gradient flow): speed maps through to the flow animation's duration, same contract as plain shimmer", () => {
  const slow = resolveTextEffectStyle(undefined, { gradient: { colors: ["#fff", "#000"], angle: 0 }, shimmer: { speed: 0.5 } });
  const fast = resolveTextEffectStyle(undefined, { gradient: { colors: ["#fff", "#000"], angle: 0 }, shimmer: { speed: 2 } });
  const slowDuration = parseFloat(String(slow.animation).split(" ")[1]);
  const fastDuration = parseFloat(String(fast.animation).split(" ")[1]);
  assert.ok(fastDuration < slowDuration, `expected faster speed to produce a shorter duration: ${fastDuration} vs ${slowDuration}`);
});

test("resolveTextEffectStyle (bug fix — real gradient flow): no explicit gradient + shimmer still uses the original static-surface highlight sweep, unchanged", () => {
  const style = resolveTextEffectStyle(undefined, { shimmer: { intensity: 0.5 } }, "#ff8800");
  assert.ok(String(style.backgroundImage).includes("#ff8800"));
  assert.equal(style.backgroundSize, "250% 100%, 100% 100%");
  assert.ok(String(style.animation).includes("mnemo-text-shimmer"));
  assert.ok(!String(style.animation).includes("mnemo-text-gradient-flow"));
});

test("resolveTextEffectStyle: shadow/glow/stroke (effect param) still work combined with gradient (roleEffect param) — no CSS-level conflict", () => {
  const style = resolveTextEffectStyle(
    { shadow: { color: "#000000" }, stroke: { width: 1, color: "#111111" } },
    { gradient: { colors: ["#ffffff", "#000000"], angle: 0 } },
  );
  assert.equal(style.color, "transparent");
  assert.ok(style.textShadow);
  assert.equal(style.WebkitTextStroke, "1px #111111");
});

test("resolveTextEffectStyle: gradient/shimmer are per-role — a role with no roleEffect never renders them even if `effect` is set", () => {
  const style = resolveTextEffectStyle({ shadow: { color: "#000000" } }, undefined);
  assert.equal(style.backgroundImage, undefined);
  assert.equal(style.color, undefined);
});

// ── Name per-letter path: letter animation composed WITH gradient/shimmer ──

const RAINBOW = ["#ff0000", "#ff8800", "#ffee00", "#00cc44", "#0066ff", "#8a2be2"];

test("resolveLetterEffectStyle: gradient + shimmer + letter animation all apply at once (shimmer is not replaced by letter animation)", () => {
  const role = { gradient: { colors: RAINBOW, angle: 90 }, shimmer: { speed: 1 }, letterAnimation: { amplitude: 6, speed: 1, stagger: 0.05 } };
  const s = resolveLetterEffectStyle(role, "#ffffff", 2, 8);
  const anim = String(s.animation);
  assert.ok(anim.includes("mnemo-letter-bounce"), anim);
  assert.ok(anim.includes("mnemo-text-gradient-flow"), anim);
  assert.ok(!anim.includes("mnemo-letter-shimmer-pulse"), anim);
  // Same fill as the non-animated path (dd816a9's angle-following flow).
  assert.equal(s.backgroundImage, resolveTextEffectStyle(undefined, role, "#ffffff").backgroundImage);
  assert.equal(s.backgroundClip, "text");
  assert.equal(s.color, "transparent");
  assert.equal((s as Record<string, unknown>)["--letter-amp"], "6px");
});

test("resolveLetterEffectStyle: gradient flow has no per-letter delay (all slices stay in phase); bounce keeps its stagger", () => {
  const role = { gradient: { colors: RAINBOW, angle: 0 }, shimmer: { speed: 1 }, letterAnimation: { stagger: 0.1 } };
  const a = String(resolveLetterEffectStyle(role, undefined, 0, 5).animation);
  const b = String(resolveLetterEffectStyle(role, undefined, 3, 5).animation);
  const flowOf = (x: string) => x.split(", ").find(p => p.includes("mnemo-text-gradient-flow"));
  assert.equal(flowOf(a), flowOf(b));
  assert.ok(b.includes("mnemo-letter-bounce") && b.includes("0.300s"), b);
});

test("resolveLetterEffectStyle: each letter shows its own slice of one word-wide gradient, for any angle", () => {
  for (const angle of [0, 45, 90, 135, 180]) {
    const role = { gradient: { colors: RAINBOW, angle }, letterAnimation: {} };
    const first = resolveLetterEffectStyle(role, undefined, 0, 5);
    const mid = resolveLetterEffectStyle(role, undefined, 2, 5);
    const last = resolveLetterEffectStyle(role, undefined, 4, 5);
    assert.equal(first.backgroundSize, "500% 100%");
    assert.equal(first.backgroundPosition, "0% 0");
    assert.equal(mid.backgroundPosition, "50% 0");
    assert.equal(last.backgroundPosition, "100% 0");
    assert.ok(String(first.backgroundImage).includes(`${angle}deg`));
  }
});

test("resolveLetterEffectStyle: gradient without shimmer — static sliced gradient + bounce, no flow animation", () => {
  const s = resolveLetterEffectStyle({ gradient: { colors: RAINBOW, angle: 90 }, letterAnimation: {} }, undefined, 1, 4);
  assert.ok(String(s.backgroundImage).startsWith("linear-gradient(90deg"));
  assert.ok(!String(s.animation).includes("mnemo-text-gradient-flow"));
  assert.ok(String(s.animation).includes("mnemo-letter-bounce"));
});

test("resolveLetterEffectStyle: shimmer without gradient — flat-color sweep per letter, staggered like the bounce", () => {
  const s = resolveLetterEffectStyle({ shimmer: { speed: 1 }, letterAnimation: { stagger: 0.05 } }, "#ff8800", 2, 4);
  assert.ok(String(s.backgroundImage).includes("#ff8800"));
  assert.equal(s.backgroundSize, "250% 100%, 100% 100%"); // not sliced — its keyframe owns background-position
  assert.ok(String(s.animation).includes("mnemo-text-shimmer 3.20s ease-in-out 0.100s infinite"), String(s.animation));
});

test("resolveLetterEffectStyle: letter animation alone — bounce only, plain inherited color", () => {
  const s = resolveLetterEffectStyle({ letterAnimation: {} }, "#ffffff", 0, 3);
  assert.equal(s.backgroundImage, undefined);
  assert.equal(s.color, undefined);
  assert.equal(s.display, "inline-block");
  assert.ok(String(s.animation).startsWith("mnemo-letter-bounce"));
  assert.ok(!String(s.animation).includes(","));
});
