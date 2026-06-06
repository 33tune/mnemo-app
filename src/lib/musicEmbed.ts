export type MusicPlatform = "youtube" | "spotify" | "soundcloud" | "unknown";

export function detectMusicPlatform(url: string): MusicPlatform {
  if (!url) return "unknown";
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("spotify.com"))                            return "spotify";
  if (u.includes("soundcloud.com"))                         return "soundcloud";
  return "unknown";
}

export function toEmbedUrl(url: string): string | null {
  const platform = detectMusicPlatform(url);

  if (platform === "youtube") {
    // youtu.be/ID  or  youtube.com/watch?v=ID  or  youtube.com/shorts/ID
    const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    const longMatch  = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    const shortMatch2 = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    const id = (shortMatch ?? longMatch ?? shortMatch2)?.[1];
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?loop=1&playlist=${id}&controls=1&rel=0&modestbranding=1`;
  }

  if (platform === "spotify") {
    // open.spotify.com/track/ID  or  /album/ID  or  /playlist/ID
    const match = url.match(/spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
    if (!match) return null;
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  }

  if (platform === "soundcloud") {
    const encoded = encodeURIComponent(url.startsWith("http") ? url : `https://${url}`);
    return `https://w.soundcloud.com/player/?url=${encoded}&color=%23ffffff&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`;
  }

  return null;
}

export function embedDimensions(platform: MusicPlatform): { w: number; h: number } {
  if (platform === "spotify")    return { w: 352, h: 80 };
  if (platform === "youtube")    return { w: 320, h: 180 };
  if (platform === "soundcloud") return { w: 320, h: 80 };
  return { w: 320, h: 80 };
}
