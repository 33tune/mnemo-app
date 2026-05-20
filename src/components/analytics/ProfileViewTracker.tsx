"use client";
import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

interface Props {
  handle:    string;
  viewerId?: string;
}

/**
 * Renders nothing — fires analytics.profileVisit once on mount.
 * Used in the server-rendered /[handle] page to report profile views.
 */
export default function ProfileViewTracker({ handle, viewerId }: Props) {
  useEffect(() => {
    analytics.profileVisit(handle, viewerId);
  }, [handle, viewerId]);

  return null;
}
