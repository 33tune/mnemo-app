import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f: string) => readFileSync(f, "utf8");
const STICKERS = read("src/components/canvas/CardStickers.tsx");
const CARD = read("src/components/canvas/ProfileCard.tsx");
const LAYERS = read("src/components/canvas/CardLayers.tsx");
const MENU = read("src/components/canvas/ProfileStickersMenu.tsx");

test("stickers are ghosts: never clickable, in the editor or on the public page", () => {
  const layer = STICKERS.slice(STICKERS.indexOf("export function StickerLayer"), STICKERS.indexOf("type Gesture"));
  assert.ok(layer.includes('pointerEvents: "none"'));
  assert.ok(layer.includes("draggable={false}"));
});

test("they live inside the card's tilt / hover / floating wrappers (they move with it)", () => {
  const tilt = LAYERS.indexOf("rotateX(var(--tilt-x,0deg))");
  assert.ok(tilt > 0 && LAYERS.indexOf("{back}") > tilt && LAYERS.indexOf("{front}") > LAYERS.indexOf("{back}"));
  assert.ok(CARD.includes("back={<StickerLayer") && CARD.includes("front={<StickerLayer"));
});

test("edit mode: only in the editor, from Tarjeta › Stickers › Editar; the card holds still meanwhile", () => {
  assert.ok(CARD.includes("const editingStickers = !!canInteract && stickerEdit.cardId === card.id;"));
  assert.ok(CARD.includes("{editingStickers && ("));
  assert.ok(CARD.includes("floating: false"), "floating paused while editing");
  assert.ok(CARD.includes("if (editingStickers) return;"), "no tilt / hover while editing");
  assert.ok(MENU.includes("stickerEditing.apply(); else stickerEditing.start(card.id);"), "Editar / Aplicar");
  assert.ok(MENU.includes("useEffect(() => () => { if (stickerEditing.get().cardId === card.id) stickerEditing.apply(); }, [card.id]);"), "leaving the section applies");
});

test("every gesture is one write through updateProfile (one undo step)", () => {
  assert.ok(CARD.includes("onCommit={stickers => updateProfile(card.id, { stickers })}"));
  assert.ok(STICKERS.includes("if (d && d.size) commit(d);"));
});
