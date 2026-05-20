"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/chat";
import { analytics } from "@/lib/analytics";

export function useMessages(chatId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const cancelledRef  = useRef(false);
  const mountedRef    = useRef(false);
  const sendInFlight  = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    setLoading(true);

    try {
      const sb = createClient();
      const { data, error } = await sb
        .from("messages")
        .select("id, chat_id, sender_id, content, image_url, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!cancelledRef.current) setMessages((data ?? []) as Message[]);
    } catch (e) {
      console.error("[useMessages] fetch", e);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchMessages();
    return () => { cancelledRef.current = true; };
  }, [fetchMessages]);

  // Realtime subscription — unique channel name prevents reuse of a cached subscribed channel
  useEffect(() => {
    if (!chatId) return;
    if (mountedRef.current) return;
    mountedRef.current = true;
    const sb = createClient();
    const channel = sb
      .channel(`chat-messages:${chatId}:${crypto.randomUUID()}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const msg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();
    return () => {
      mountedRef.current = false;
      sb.removeChannel(channel);
    };
  }, [chatId]);

  const sendMessage = useCallback(async (
    content: string,
    imageUrl?: string,
  ): Promise<void> => {
    if (!chatId || !content.trim() || sendInFlight.current) return;

    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    sendInFlight.current = true;

    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Message = {
      id:         optimisticId,
      chat_id:    chatId,
      sender_id:  user.id,
      content:    content.trim(),
      image_url:  imageUrl ?? null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);
    setSending(true);

    try {
      const { data, error } = await sb
        .from("messages")
        .insert({
          chat_id:   chatId,
          sender_id: user.id,
          content:   content.trim(),
          image_url: imageUrl ?? null,
        })
        .select("id, chat_id, sender_id, content, image_url, created_at")
        .single();

      if (error) throw error;

      analytics.messageSent(chatId, user.id);

      // Replace optimistic row with real row
      setMessages(prev =>
        prev.map(m => m.id === optimisticId ? (data as Message) : m)
      );
    } catch (e) {
      console.error("[useMessages] send", e);
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    } finally {
      setSending(false);
      sendInFlight.current = false;
    }
  }, [chatId]);

  return { messages, loading, sending, sendMessage, refreshMessages: fetchMessages };
}
