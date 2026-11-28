"use client";
/**
 * Comentar ahí mismo (2026-11-28, pedido del usuario: "en el celular, si quiero
 * comentar un repost o un post de mi feed, me manda al link de la persona").
 * A post shown OUTSIDE its own wall (the Feed, a repost on someone's wall) opens
 * its replies right under it, with a composer that answers on the post's real
 * wall (post_wall with p_parent).
 */
import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hexAlpha } from "@/lib/comments";
import { cleanPostStyle, wallError, type PostStyle, type WallPost } from "@/lib/wall";
import { togglePostLike } from "@/hooks/useWall";
import { isVerifyError, requestVerify } from "@/lib/verify";
import { track } from "@/lib/track";
import { PostView, Composer } from "./WallParts";

export async function replyToPost(post: Pick<WallPost, "id" | "wallOwner">, body: string, style: PostStyle): Promise<string | null> {
  const st = cleanPostStyle(style);
  const { error } = await createClient().rpc("post_wall", { p_owner: post.wallOwner, p_body: body, p_parent: post.id, p_style: Object.keys(st).length ? st : null });
  if (error) { if (isVerifyError(error)) requestVerify(); return wallError(error.message); }
  track("feed_reply");
  return null;
}

export function PostThread({ post, viewer, ink, accent, wallBg, newTab, onReplied, lima }: {
  post: WallPost; viewer: string | null | undefined; ink: string; accent: string; wallBg: string; newTab?: boolean;
  /** Grafito panels (Feed): lime send button. */
  lima?: boolean;
  onReplied?: () => void;
}) {
  const [list, setList] = useState<WallPost[] | null>(null);
  const load = useCallback(() => {
    fetch(`/api/wall?parent=${post.id}`, { cache: "no-store" }).then(r => (r.ok ? r.json() : null))
      .then((d: { posts?: WallPost[] } | null) => setList(d?.posts ?? []), () => setList([]));
  }, [post.id]);
  useEffect(() => { load(); }, [load]);
  const like = (id: string) => {
    const flip = (p: WallPost) => (p.id === id ? { ...p, liked: !p.liked, likes: Math.max(0, p.likes + (p.liked ? -1 : 1)) } : p);
    setList(l => l?.map(flip) ?? l);
    togglePostLike(id).then(r => { if (!r) setList(l => l?.map(flip) ?? l); });
  };
  return (
    <div style={{ marginLeft: 38, paddingLeft: 10, borderLeft: `2px solid ${hexAlpha(ink, 0.14)}` }}>
      {list === null && <div style={{ padding: "6px 0", color: hexAlpha(ink, 0.5), fontSize: 12 }}>…</div>}
      {list?.map(r => (
        <PostView key={r.id} post={r} compact ink={ink} accent={accent} wallBg={wallBg} viewer={viewer} newTab={newTab} onLike={() => like(r.id)} />
      ))}
      {viewer && (
        <div style={{ padding: "6px 0 4px" }}>
          <Composer ink={ink} accent={accent} wallBg={wallBg} lima={lima} autoFocus placeholder={`Responder a @${post.author.handle || "?"}`}
            onSend={async (body, style) => { const e = await replyToPost(post, body, style); if (!e) { load(); onReplied?.(); } return e; }} />
        </div>
      )}
    </div>
  );
}
