"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTypingPresence(chatId: string, currentUserId?: string) {
  const [peerTyping, setPeerTyping] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chatId || !currentUserId) return;
    const sb = createClient();
    // Unique channel name prevents collision when React re-mounts the hook
    const channelName = `typing:${chatId}:${currentUserId}:${Math.random().toString(36).slice(2)}`;
    const ch = sb.channel(channelName, {
      config: { presence: { key: currentUserId } },
    });

    ch.on("presence", { event: "sync" }, () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state: Record<string, any[]> = ch.presenceState();
      const anyPeer = Object.entries(state)
        .filter(([key]) => key !== currentUserId)
        .some(([, presences]) =>
          presences.some((p: { typing?: boolean }) => p.typing === true)
        );
      setPeerTyping(anyPeer);
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      sb.removeChannel(ch);
      channelRef.current = null;
    };
  }, [chatId, currentUserId]);

  const trackTyping = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.track({ typing: true });
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      channelRef.current?.track({ typing: false });
    }, 2500);
  }, []);

  const stopTyping = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    channelRef.current?.track({ typing: false });
  }, []);

  return { peerTyping, trackTyping, stopTyping };
}
