"use client";
import { useState, useEffect } from "react";

const KEY = "mnemo_onboarding_v1";

/**
 * Returns whether the onboarding overlay should be shown,
 * and a dismiss function that persists the decision to localStorage.
 *
 * Only shows for the canvas owner (canEdit=true) after auth is resolved.
 */
export function useOnboarding(canEdit: boolean, authResolved: boolean) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!authResolved || !canEdit) return;
    try {
      if (!localStorage.getItem(KEY)) setShowOnboarding(true);
    } catch {
      // Private browsing or storage blocked — skip onboarding silently
    }
  }, [authResolved, canEdit]);

  function dismissOnboarding() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShowOnboarding(false);
  }

  return { showOnboarding, dismissOnboarding };
}
