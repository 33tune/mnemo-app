// Iteration 0 — O4 parity (getMusicCardEffects === the object
// MusicCardWidget.tsx used to build inline) and O2 (player text defaults).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { CardEffects, MusicCardData } from "@/types";
import CardLayers from "@/components/canvas/CardLayers";
import ProfileMusicPlayer from "@/components/canvas/ProfileMusicPlayer";
import { getMusicCardEffects } from "./profileCardEffects";
import { resolveMusicPlayerText, MUSIC_TEXT_SIZE_DEFAULT } from "./musicPlayerFormat";

type MusicLike = Pick<MusicCardData, "bgColor" | "bgImage" | "bgMode" | "borderColor" | "borderWidth" | "borderRadius" | "glowColor" | "glowIntensity" | "opacity" | "effects">;

/** FROZEN copy of MusicCardWidget.tsx's inline formula before Iteration 0. */
function legacyInline(card: MusicLike): CardEffects {
  return {
    ...card.effects,
    bg:     { color: card.bgColor, image: card.bgImage, imageMode: card.bgMode, ...card.effects?.bg },
    border: { color: card.borderColor, width: card.borderWidth, radius: card.borderRadius ?? 10, ...card.effects?.border },
    glow:   { color: card.glowColor, intensity: card.glowIntensity, outer: true, ...card.effects?.glow },
    opacity: card.effects?.opacity ?? card.opacity,
  };
}

const CASES: MusicLike[] = [
  {},
  { bgColor: "#123456", borderRadius: 4, glowColor: "#ff00ff", glowIntensity: 0.6, opacity: 0.8 },
  { glowIntensity: 0.3, effects: { glow: { outer: false, inner: true }, border: { width: 2 } } },
  { effects: { shadow: { intensity: 0.5 }, padding: 6, gradient: { from: "#000000", to: "#ffffff", angle: 90, opacity: 0.5 }, interactions: { tilt3d: true } } },
  { bgImage: "https://x/y.png", bgMode: "cover", effects: { bg: { color: "#000000", blur: 4 }, opacity: 0.5 } },
];

for (const [i, c] of CASES.entries()) {
  test(`getMusicCardEffects == the legacy inline object, and CardLayers renders identically (case ${i})`, () => {
    const a = getMusicCardEffects(c);
    const b = legacyInline(c);
    // padding: the module helper sets the key explicitly (possibly
    // undefined); the inline version got it through ...card.effects.
    const strip = (e: CardEffects) => JSON.parse(JSON.stringify(e));
    assert.deepEqual(strip(a), strip(b));
    const render = (e: CardEffects) => renderToStaticMarkup(
      <CardLayers cardId="m" effects={e} isSel={false} borderRadius={e.border?.radius ?? 10}><span /></CardLayers>);
    assert.equal(render(a), render(b));
  });
}

test("O2: no stored Tamaño (or 8) = today's exact px and fonts", () => {
  for (const size of [undefined, MUSIC_TEXT_SIZE_DEFAULT]) {
    const t = resolveMusicPlayerText(size, undefined);
    assert.deepEqual([t.titleSize, t.artistSize, t.timeSize, t.errorSize], [10, 8, 8, 7]);
    assert.equal(t.titleFont, "'DM Sans', sans-serif");
    assert.equal(t.artistFont, "'Space Mono', monospace");
  }
});

test("O2: Tamaño scales the whole hierarchy; Fuente applies to title + artist, times stay mono", () => {
  const t = resolveMusicPlayerText(12, "'Anton', sans-serif");
  assert.deepEqual([t.titleSize, t.artistSize, t.timeSize, t.errorSize], [15, 12, 12, 10.5]);
  assert.equal(t.titleFont, "'Anton', sans-serif");
  assert.equal(t.artistFont, "'Anton', sans-serif");
  assert.equal(t.timeFont, "'Space Mono', monospace");
});

const MUSIC = { sourceType: "upload" as const, audioUrl: "", title: "Tema", artist: "Artista" };

test("O2: ProfileMusicPlayer with no textSize/font renders the previous sizes and fonts", () => {
  const html = renderToStaticMarkup(<ProfileMusicPlayer music={MUSIC} textColor="#fff" secondaryColor="#ccc" mutedColor="#999" />);
  assert.match(html, /font-family:&#x27;DM Sans&#x27;, sans-serif;font-size:10px;font-weight:600/);
  assert.match(html, /font-family:&#x27;Space Mono&#x27;, monospace;font-size:8px/);
});

test("O2: ProfileMusicPlayer applies textSize and fontFamily", () => {
  const html = renderToStaticMarkup(<ProfileMusicPlayer music={MUSIC} textColor="#fff" secondaryColor="#ccc" mutedColor="#999" textSize={16} fontFamily="Georgia, serif" />);
  assert.match(html, /font-family:Georgia, serif;font-size:20px;font-weight:600/);
  assert.match(html, /font-family:Georgia, serif;font-size:16px/);
});
