import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFavorite(targetUserId: string, currentUserId?: string) {
  const supabase = createClient();

  const [isFavorite,    setIsFavorite]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [justFavorited, setJustFavorited] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!targetUserId || !currentUserId) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("target_user_id", targetUserId)
          .maybeSingle();

        if (!cancelled) {
          setIsFavorite(!!data);
        }
      } catch (e) {
        console.error("[useFavorite]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [targetUserId, currentUserId]);

  const addFavorite = async () => {
    if (!currentUserId) return;

    setIsFavorite(true);

    const { error } = await supabase.from("favorites").insert({
      user_id: currentUserId,
      target_user_id: targetUserId,
    });

    if (error) {
      console.error("[favorite error]", error);
      setIsFavorite(false);
    } else {
      setJustFavorited(true);
      if (flashRef.current) clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setJustFavorited(false), 1400);
    }
  };

  const removeFavorite = async () => {
    if (!currentUserId) return;

    setIsFavorite(false);

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", currentUserId)
      .eq("target_user_id", targetUserId);

    if (error) {
      console.error("[unfavorite error]", error);
      setIsFavorite(true);
    }
  };

  return {
    isFavorite,
    addFavorite,
    removeFavorite,
    loading,
    justFavorited,
  };
}
