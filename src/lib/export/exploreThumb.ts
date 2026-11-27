"use client";
/**
 * Explorar v2 (2026-11-27): the card's picture for the community grid — the
 * same capture as "Compartir" (cardSnapshot.ts: the real card with its
 * stickers, frames and the room's images / texts that touch it, over the
 * room's background, as a phone shows it), on a small 4:5 phone:
 * 360×450 CSS px → 480×600 JPEG (~50 KB). Uploaded over the same file each
 * time (<uid>/explore-thumb.jpg, ?v= busts caches) with the card's ranking
 * numbers (explore_index). Never throws.
 */
import { createClient } from "@/lib/supabase/client";
import { cardViewRect } from "@/lib/mobileFit";
import { exploreNumbers } from "@/lib/explore";
import type { CanvasState, ProfileCardData } from "@/types";
import { startCapture, loadImage, cardRoomRect } from "./cardSnapshot";
import { storyView, storyBackground, drawStoryFrame, type StoryBg } from "./storyRender";
import { canvasToBlob } from "./encodeStory";

export const THUMB_VIEW_W = 360;
export const THUMB_VIEW_H = 450;
export const THUMB_W = 480;

export async function renderExploreThumb(el: HTMLElement, card: ProfileCardData, bg: StoryBg & { imageUrl?: string }): Promise<Blob | null> {
  try {
    const at = cardRoomRect(el);
    const view = storyView(cardViewRect({ ...card, x: at.x, y: at.y, w: at.w }, at.h), THUMB_VIEW_W, THUMB_VIEW_H, THUMB_W);
    const img = bg.imageUrl ? await loadImage(bg.imageUrl) : null;
    const background = storyBackground({ ...bg, image: img, imageW: img?.naturalWidth, imageH: img?.naturalHeight }, view);
    const cap = await startCapture(el, view.region, view.ratio);
    let first: Awaited<ReturnType<typeof cap.frame>>;
    try { first = await cap.frame(0); } finally { cap.done(); }
    const out = document.createElement("canvas");
    out.width = view.W; out.height = view.H;
    drawStoryFrame(out.getContext("2d")!, background, first.shot, first.glass);
    const blob = await canvasToBlob(out, "image/jpeg", 0.82);
    out.width = 0; out.height = 0; first.shot.width = 0; first.shot.height = 0;
    return blob;
  } catch {
    return null;
  }
}

/** Takes the picture, uploads it and saves the card's Explorar row. */
export async function publishExploreThumb(userId: string, el: HTMLElement, card: ProfileCardData, state: CanvasState, bg: StoryBg & { imageUrl?: string }): Promise<boolean> {
  try {
    const nums = exploreNumbers(card, state);
    const sb = createClient();
    let thumb: string | null = null;
    // Only finished cards are shown: no picture needed for the others.
    if (nums.finished) {
      const blob = await renderExploreThumb(el, card, bg);
      if (blob) {
        const path = `${userId}/explore-thumb.jpg`;
        const { error } = await sb.storage.from("canvas-assets").upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "300" });
        if (!error) thumb = `${sb.storage.from("canvas-assets").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }
    }
    const { error } = await sb.rpc("explore_index", { p_thumb: thumb, p_content: nums.content, p_finished: nums.finished, p_collection: nums.collection, p_name: (card.name || "").slice(0, 60) || null });
    return !error;
  } catch {
    return false;
  }
}
