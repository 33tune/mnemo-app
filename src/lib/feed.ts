/** Feed (Explorar › Feed, 2026-11-28) — what one item is. */
import type { PostAuthor, WallPost } from "@/lib/wall";

export interface FeedResource { ownerId: string; ownerHandle: string; key: string; src: string; owner?: PostAuthor }
export interface FeedItem {
  kind: "post" | "repost_post" | "repost_resource";
  at: string;
  actor: PostAuthor;
  post?: WallPost;
  resource?: FeedResource;
}
