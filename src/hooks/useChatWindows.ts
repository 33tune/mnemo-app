"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatWindow } from "@/types/chat";

export type WindowPatch = Partial<Pick<ChatWindow, "x" | "y" | "w" | "h" | "z_index" | "minimized">>;

export function useChatWindows(currentUserId?: string) {
  const [windows, setWindows] = useState<ChatWindow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWindows = useCallback(async () => {
    if (!currentUserId) { setWindows([]); setLoading(false); return; }
    const sb = createClient();
    const { data } = await sb
      .from("chat_windows")
      .select("id, user_id, chat_id, x, y, w, h, minimized, z_index, updated_at")
      .eq("user_id", currentUserId)
      .order("z_index", { ascending: true });
    setWindows((data ?? []) as ChatWindow[]);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { fetchWindows(); }, [fetchWindows]);

  // ── openWindow — optimistic, UI updates immediately ─────────────────────────
  const openWindow = useCallback(async (chatId: string) => {
    console.log("OPEN WINDOW CALLED", chatId);

    setWindows(prev => {
      console.log("WINDOWS STATE", prev);
      const maxZ = prev.length > 0 ? Math.max(...prev.map(p => p.z_index)) : 0;
      const exists = prev.find(w => w.chat_id === chatId);

      if (exists) {
        return prev.map(w =>
          w.chat_id === chatId
            ? { ...w, minimized: false, z_index: maxZ + 1 }
            : w
        );
      }

      return [
        ...prev,
        {
          id:         crypto.randomUUID(),
          user_id:    currentUserId ?? "",
          chat_id:    chatId,
          minimized:  false,
          x:          120,
          y:          120,
          w:          340,
          h:          440,
          z_index:    maxZ + 1,
          updated_at: new Date().toISOString(),
        },
      ];
    });

    // Background DB persistence — non-blocking, UI never waits for this
    if (!currentUserId) return;
    try {
      const sb = createClient();
      await sb
        .from("chat_windows")
        .upsert(
          { user_id: currentUserId, chat_id: chatId },
          { onConflict: "user_id,chat_id" }
        );
    } catch (e) {
      console.error("[useChatWindows] openWindow persist", e);
    }
  }, [currentUserId]);

  // ── closeWindow ─────────────────────────────────────────────────────────────
  const closeWindow = useCallback(async (chatId: string) => {
    setWindows(prev => prev.filter(w => w.chat_id !== chatId));
    if (!currentUserId) return;
    const sb = createClient();
    await sb.from("chat_windows").delete().eq("user_id", currentUserId).eq("chat_id", chatId);
  }, [currentUserId]);

  // ── minimizeWindow ───────────────────────────────────────────────────────────
  const minimizeWindow = useCallback(async (chatId: string) => {
    setWindows(prev => prev.map(w => w.chat_id === chatId ? { ...w, minimized: true } : w));
    if (!currentUserId) return;
    const sb = createClient();
    await sb.from("chat_windows").update({ minimized: true }).eq("user_id", currentUserId).eq("chat_id", chatId);
  }, [currentUserId]);

  // ── focusWindow ──────────────────────────────────────────────────────────────
  const focusWindow = useCallback(async (chatId: string) => {
    setWindows(prev => {
      const maxZ = prev.length > 0 ? Math.max(...prev.map(w => w.z_index)) : 0;
      const target = prev.find(w => w.chat_id === chatId);
      if (!target || target.z_index === maxZ) return prev;
      return prev.map(w => w.chat_id === chatId ? { ...w, z_index: maxZ + 1 } : w);
    });
  }, []);

  // ── updateWindow ─────────────────────────────────────────────────────────────
  const updateWindow = useCallback(async (chatId: string, patch: WindowPatch) => {
    setWindows(prev => prev.map(w => w.chat_id === chatId ? { ...w, ...patch } : w));
    if (!currentUserId) return;
    const sb = createClient();
    const { error } = await sb
      .from("chat_windows")
      .update(patch)
      .eq("user_id", currentUserId)
      .eq("chat_id", chatId);
    if (error) console.error("[useChatWindows] updateWindow", error);
  }, [currentUserId]);

  return { windows, loading, openWindow, closeWindow, minimizeWindow, focusWindow, updateWindow };
}
