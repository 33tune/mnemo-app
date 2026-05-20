/**
 * Lightweight analytics hooks for Mnemo.
 *
 * All calls are synchronous and fire-and-forget — they never block UI.
 * Swap the `emit` function body for your analytics SDK (PostHog, Segment, etc.)
 * when you're ready for real telemetry.
 *
 * Usage:
 *   analytics.follow({ targetId: "abc", followerId: "xyz" });
 *   analytics.messageSent({ chatId: "...", senderId: "..." });
 */

type Event =
  | { name: "signup";         userId: string }
  | { name: "profile_visit";  handle: string; viewerId?: string }
  | { name: "follow";         targetId: string; followerId: string }
  | { name: "message_sent";   chatId: string; senderId: string }
  | { name: "canvas_edit";    userId: string; opType: string };

function emit(event: Event): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event.name, event);
  }
  // Drop-in replacement:
  // window.posthog?.capture(event.name, event);
  // analytics.track(event.name, event);
}

export const analytics = {
  signup(userId: string): void {
    emit({ name: "signup", userId });
  },

  profileVisit(handle: string, viewerId?: string): void {
    emit({ name: "profile_visit", handle, viewerId });
  },

  follow(targetId: string, followerId: string): void {
    emit({ name: "follow", targetId, followerId });
  },

  messageSent(chatId: string, senderId: string): void {
    emit({ name: "message_sent", chatId, senderId });
  },

  canvasEdit(userId: string, opType: string): void {
    emit({ name: "canvas_edit", userId, opType });
  },
} as const;
