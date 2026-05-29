"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GuestbookMessage } from "@/types";

export function useGuestbook(profileId: string | undefined) {
  const [messages,  setMessages]  = useState<GuestbookMessage[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    const sb = createClient();

    sb.from("guestbook_messages")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setMessages((data as GuestbookMessage[]) ?? []);
        setLoading(false);
      });

    const channel = sb
      .channel(`guestbook:${profileId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guestbook_messages", filter: `profile_id=eq.${profileId}` },
        payload => {
          if (payload.eventType === "INSERT") {
            setMessages(prev => [payload.new as GuestbookMessage, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setMessages(prev => prev.filter(m => m.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [profileId]);

  async function addMessage(
    profileId:    string,
    message:      string,
    authorId:     string | null,
    authorName:   string,
    authorAvatar: string,
    anonymous:    boolean,
  ) {
    const sb = createClient();
    const { error } = await sb.from("guestbook_messages").insert({
      profile_id:    profileId,
      author_id:     authorId,
      author_name:   authorName,
      author_avatar: authorAvatar,
      message,
      anonymous,
    });
    return error;
  }

  async function deleteMessage(id: string) {
    const sb = createClient();
    setMessages(prev => prev.filter(m => m.id !== id));
    await sb.from("guestbook_messages").delete().eq("id", id);
  }

  return { messages, loading, addMessage, deleteMessage };
}
