// Parity test: effectEditorDefaults.ts mirrors render-side defaults for the
// editor's DISPLAY. These tests exercise the REAL renderers wherever they
// can run outside a browser — CardLayers.tsx through a server render,
// textEffects.ts's resolveTextEffectStyle directly — so a renderer formula
// change breaks this file instead of silently desyncing the menus.
// ProfileCard.tsx's avatar/name-size formulas can't be rendered in
// isolation (Supabase hooks, canvas context), so those are pinned to the
// exact expressions in ProfileCard.tsx instead (see each test's comment).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CardEffects } from "@/types";
import CardLayers from "@/components/canvas/CardLayers";
import { resolveTextEffectStyle, resolveLetterEffectStyle } from "./textEffects";
import { withOpacity } from "./cardColors";
import {
  CARD_GLOW_DEFAULT_COLOR, CARD_BORDER_DEFAULT_WIDTH, CARD_BORDER_DEFAULT_COLOR, CARD_BG_DEFAULT_COLOR,
  CARD_SPOTLIGHT_DEFAULT_SIZE, CARD_SPOTLIGHT_DEFAULT_COLOR,
  cardShadowDisplay, cardGlowRadius,
  TEXT_SHADOW_DEFAULTS, textShadowOpacity, TEXT_GLOW_DEFAULT_COLOR, textGlowRadius, TEXT_STROKE_DEFAULT_COLOR,
  nameFontSizeDefault, pfpBorderDisplay, pfpShadowOn, pfpShadowColor, pfpGlowRadius, PFP_GLOW_DEFAULT_COLOR,
  EFFECT_ON_DEFAULTS, NAME_FONT_DEFAULT, MONO_ROLE_FONT_DEFAULT,
} from "./effectEditorDefaults";

function renderLayers(effects: CardEffects): string {
  return renderToStaticMarkup(
    <CardLayers cardId="parity" effects={effects} isSel={false} borderRadius={14}><span /></CardLayers>,
  );
}

// ── CardLayers ───────────────────────────────────────────────────────────────

for (const shadow of [
  { intensity: 0.5 },
  { intensity: 0.3, color: "#ff0000" },
  { intensity: 0.8, color: "#00ff00", opacity: 0.4, blur: 12 },
  { intensity: 0.15 },
] satisfies NonNullable<CardEffects["shadow"]>[]) {
  test(`cardShadowDisplay matches CardLayers' rendered shadow (${JSON.stringify(shadow)})`, () => {
    const d = cardShadowDisplay(shadow);
    const expected = `${d.offsetX}px ${d.offsetY}px ${d.blur}px ${withOpacity(d.color, d.opacity)}`;
    assert.ok(renderLayers({ shadow }).includes(`box-shadow:${expected}`), expected);
  });
}

for (const glow of [
  { outer: true, intensity: 0.5 },
  { outer: true, intensity: 0.15 },
  { outer: true, intensity: 0.4, radius: 22 },
] satisfies NonNullable<CardEffects["glow"]>[]) {
  test(`cardGlowRadius + default color match CardLayers' outer glow (${JSON.stringify(glow)})`, () => {
    const expected = `0 0 ${cardGlowRadius(glow)}px ${CARD_GLOW_DEFAULT_COLOR}`;
    assert.ok(renderLayers({ glow }).includes(expected), expected);
  });
}

test("border/background defaults match CardLayers (unselected)", () => {
  const html = renderLayers({});
  assert.ok(html.includes(`border:${CARD_BORDER_DEFAULT_WIDTH}px solid ${CARD_BORDER_DEFAULT_COLOR}`));
  assert.ok(html.includes(`background-color:${CARD_BG_DEFAULT_COLOR}`));
});

test("spotlight size/color defaults match CardLayers", () => {
  const html = renderLayers({ interactions: { spotlight: true } });
  assert.ok(html.includes(`${CARD_SPOTLIGHT_DEFAULT_COLOR} 0%,transparent ${CARD_SPOTLIGHT_DEFAULT_SIZE}%`));
});

test("effects.paused is never rendered: CardLayers output is identical with or without it", () => {
  const base: CardEffects = { shadow: { intensity: 0.4 } };
  const withPaused: CardEffects = { ...base, paused: { glow: { outer: true, intensity: 1 }, gradient: { from: "#f00", to: "#0f0", angle: 0, opacity: 1 } } };
  assert.equal(renderLayers(withPaused), renderLayers(base));
});

// ── textEffects.ts ───────────────────────────────────────────────────────────

test("text shadow defaults match resolveTextEffectStyle (no color -> 0.5 opacity)", () => {
  const { color, blur, offsetX, offsetY } = TEXT_SHADOW_DEFAULTS;
  const expected = `${offsetX}px ${offsetY}px ${blur}px ${withOpacity(color, textShadowOpacity(undefined, undefined))}`;
  assert.equal(resolveTextEffectStyle({ shadow: {} }).textShadow, expected);
});

test("text shadow opacity default is 1 with an explicit color", () => {
  const { blur, offsetX, offsetY } = TEXT_SHADOW_DEFAULTS;
  const expected = `${offsetX}px ${offsetY}px ${blur}px ${withOpacity("#336699", textShadowOpacity("#336699", undefined))}`;
  assert.equal(resolveTextEffectStyle({ shadow: { color: "#336699" } }).textShadow, expected);
});

for (const intensity of [0.5, 0.33, 1]) {
  test(`text glow radius/color defaults match resolveTextEffectStyle (intensity ${intensity})`, () => {
    const expected = `0 0 ${textGlowRadius(undefined, intensity)}px ${withOpacity(TEXT_GLOW_DEFAULT_COLOR, intensity)}`;
    assert.equal(resolveTextEffectStyle({ glow: { intensity } }).textShadow, expected);
  });
}

test("text stroke default color matches resolveTextEffectStyle", () => {
  assert.equal(resolveTextEffectStyle({ stroke: { width: 1 } }).WebkitTextStroke, `1px ${TEXT_STROKE_DEFAULT_COLOR}`);
});

// ── ProfileCard.tsx (pinned to its expressions) ──────────────────────────────

test("nameFontSizeDefault: `guns|poster ? 17 : 15` (ProfileCard.tsx nameFontSize)", () => {
  assert.equal(nameFontSizeDefault("guns"), 17);
  assert.equal(nameFontSizeDefault("poster"), 17);
  assert.equal(nameFontSizeDefault("classic"), 15);
  assert.equal(nameFontSizeDefault("minimal"), 15);
  assert.equal(nameFontSizeDefault(undefined), 15);
});

test("pfpBorderDisplay: variant-derived width/color when pfp.border is absent (ProfileCard.tsx pfpBorderWidth/ColorBase)", () => {
  const base = "#ffffff";
  assert.deepEqual(pfpBorderDisplay("minimal", base, undefined), { width: 0, color: withOpacity(base, 0.14), opacity: 1 });
  assert.deepEqual(pfpBorderDisplay("classic", base, undefined), { width: 2, color: withOpacity(base, 0.14), opacity: 1 });
  assert.deepEqual(pfpBorderDisplay("guns", base, undefined), { width: 2, color: withOpacity(base, 0.22), opacity: 1 });
  // An explicit border object switches width to `border.width ?? 2` even on minimal.
  assert.equal(pfpBorderDisplay("minimal", base, { color: "#ff0000" }).width, 2);
  assert.equal(pfpBorderDisplay("minimal", base, { color: "#ff0000" }).color, "#ff0000");
});

test("pfpShadowOn: variant default on guns/poster only; explicit shadow wins", () => {
  assert.equal(pfpShadowOn("guns", undefined), true);
  assert.equal(pfpShadowOn("poster", undefined), true);
  assert.equal(pfpShadowOn("classic", undefined), false);
  assert.equal(pfpShadowOn("guns", { intensity: 0 }), false, "the pause sentinel really turns it off");
  assert.equal(pfpShadowOn("classic", { intensity: 0.4 }), true);
  assert.equal(pfpShadowColor("#000000", undefined), withOpacity("#000000", 0.14));
});

test("pfpGlowRadius: `radius ?? round(intensity * 24)` (ProfileCard.tsx avatarGlowLayers)", () => {
  assert.equal(pfpGlowRadius({ intensity: 0.5 }), 12);
  assert.equal(pfpGlowRadius({ intensity: 0.5, radius: 30 }), 30);
  assert.equal(PFP_GLOW_DEFAULT_COLOR, "#ffffff");
});

// ── Menu redesign Phase 1: role/"on" defaults moved out of the menus ───────

test("shimmer 'on' intensity == textEffects' DEFAULT_SHIMMER_INTENSITY (absent intensity renders the same band)", () => {
  const absent = resolveTextEffectStyle(undefined, { shimmer: { speed: 1 } }, "#ffffff");
  const explicit = resolveTextEffectStyle(undefined, { shimmer: { ...EFFECT_ON_DEFAULTS.textShimmer } }, "#ffffff");
  assert.deepEqual(absent, explicit);
});

test("letter animation 'on' values == textEffects' fallbacks (absent fields render the same letter)", () => {
  for (const i of [0, 3]) {
    const absent = resolveLetterEffectStyle({ letterAnimation: {} }, "#ffffff", i, 5);
    const explicit = resolveLetterEffectStyle({ letterAnimation: { ...EFFECT_ON_DEFAULTS.letterAnimation } }, "#ffffff", i, 5);
    assert.deepEqual(absent, explicit);
  }
});

test("role font defaults are pinned to ProfileCard.tsx's fallbacks", () => {
  // ProfileCard.tsx: `card.nameFont ?? card.font ?? "DM Sans"` and
  // `fontStyle(card.<role>Font, MONO)` with MONO = Space Mono.
  const src = readFileSync(join(process.cwd(), "src/components/canvas/ProfileCard.tsx"), "utf8");
  assert.ok(src.includes(`card.nameFont ?? card.font ?? "${NAME_FONT_DEFAULT}"`), "name font fallback");
  assert.ok(src.includes(`const MONO = "'${MONO_ROLE_FONT_DEFAULT}', monospace"`), "mono role font fallback");
  for (const f of ["handleFont", "statusFont", "locationFont", "bioFont", "viewsFont"]) {
    assert.ok(src.includes(`fontStyle(card.${f}, MONO)`), f);
  }
});
