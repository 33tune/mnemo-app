// Landing page static data

export type GBEntry = {
  name: string;
  time: string;
  art: string;
  text: string;
};

export type LandingEl = Record<string, any> & {
  id: string;
  type: string;
};

export type GallerySpace = {
  handle: string;
  name: string;
  role: string;
  wall: string;
  bg: string;
  marks: number;
  online: boolean;
  accent: string;
  els: Record<string, any>[];
};

export type Plan = {
  id: string;
  name: string;
  price: string;
  sub: string;
  cta: string;
  featured: boolean;
  soon?: boolean;
  perks: string[];
};

export const HERO_GB: GBEntry[] = [
  { name: "mara",  time: "2m", art: "art-rose",   text: "your room is so cozy i never want to leave" },
  { name: "j_0x",  time: "1h", art: "art-ice",    text: "found you in the gallery. instant follow." },
  { name: "anon",  time: "3h", art: "art-moss",   text: "was here ♡" },
  { name: "pixel", time: "1d", art: "art-violet",  text: "the gif wall goes so hard" },
];

export const HERO_ELS: LandingEl[] = [
  { id: "banner", type: "banner", text: "welcome to my corner ✦", sub: "neve's space · est. 2024", w: 320, x: 590, y: 30, rot: -1, depth: 0.42, z: 9 },
  { id: "p1", type: "profile", name: "neve", handle: "neve",
    status: "building a quiet place on the loud internet",
    followers: "3.4k", following_n: "212", following: true, art: "art-violet", avatarArt: "art-rose",
    w: 246, h: 314, x: 612, y: 150, rot: -2, depth: 0.30, z: 6 },
  { id: "phBig", type: "photo", scene: "scene-portrait", film: "portra 400", caption: "self, dec",
    w: 244, h: 298, x: 868, y: -44, rot: 3, depth: 0.52, z: 3 },
  { id: "ph2", type: "photo", scene: "scene-night", film: "35mm", caption: "berlin · 3am",
    w: 184, h: 148, x: 540, y: 262, rot: -6, depth: 0.70, z: 4 },
  { id: "ph3", type: "photo", scene: "scene-fog", film: "",
    w: 150, h: 120, x: 560, y: 360, rot: 5, depth: 0.72, z: 5 },
  { id: "stk1", type: "sticker", shape: "star", w: 34, h: 34, x: 600, y: 300, rot: -12, depth: 0.92, z: 8 },
  { id: "gb", type: "guestbook", total: "2,481", messages: HERO_GB,
    w: 252, h: 330, x: 1012, y: 152, rot: 2, depth: 0.42, z: 4 },
  { id: "nPink", type: "note", tone: "pink", text: "happy bday neve!! 🎂", size: 13,
    w: 142, h: 80, x: 970, y: 116, rot: -8, depth: 0.95, z: 7 },
  { id: "gf1", type: "gif", gif: "gif-aura", w: 92, h: 92, x: 1186, y: 438, rot: 6, depth: 0.98, z: 7 },
  { id: "m1", type: "media", track: "Strawberry Switchblade", artist: "Since Yesterday", art: "art-ember",
    w: 246, h: 80, x: 616, y: 504, rot: -2, depth: 0.55, z: 5 },
  { id: "l1", type: "link", label: "read my zine", art: "art-ice", w: 170, x: 540, y: 482, rot: -3, depth: 0.60, z: 6 },
  { id: "l2", type: "link", label: "my photos",    art: "art-rose", w: 150, x: 540, y: 532, rot: 2,  depth: 0.62, z: 6 },
  { id: "kao1", type: "kao", text: "(｡•ᴗ•｡)♡",      size: 26, color: "#ffd2e6", w: 150, x: 876, y: 298, rot: -4, depth: 1.0,  z: 8 },
  { id: "kao2", type: "kao", text: ".: ☆ *:･ﾟ",     size: 15, color: "#cfe6ff", w: 110, x: 548, y: 214, rot: 0,  depth: 1.0,  z: 8 },
  { id: "ts",   type: "kao", text: "♡ 2,481 visits · 3 online", size: 10, color: "rgba(255,255,255,0.72)", w: 220, x: 876, y: 262, rot: 0, depth: 0.85, z: 8 },
  { id: "stk2", type: "sticker", shape: "heart", w: 26, h: 26, x: 974,  y: 332, rot: -10, depth: 1.05, z: 8 },
  { id: "stk3", type: "sticker", shape: "star",  w: 24, h: 24, x: 1152, y: 120, rot: 14,  depth: 1.05, z: 8 },
];

export const GB_FEED: GBEntry[] = [
  { name: "mara",   time: "2m",  art: "art-rose",   text: "your room is so cozy i never want to leave" },
  { name: "kō",     time: "26m", art: "art-sea",    text: "came for the playlist, stayed an hour scrolling your gifs" },
  { name: "anon",   time: "1h",  art: "art-moss",   text: "was here ♡" },
  { name: "delphi", time: "2h",  art: "art-violet", text: "this is the most 'you' thing on the internet" },
  { name: "j_0x",   time: "5h",  art: "art-ice",    text: "found you through the gallery — instant follow" },
  { name: "noor",   time: "1d",  art: "art-amber",  text: "i made one too because of yours. thank you :')" },
  { name: "pixel",  time: "2d",  art: "art-ember",  text: "the gif wall is unreal" },
  { name: "anon",   time: "3d",  art: "art-dusk",   text: "happy birthday !! left you something in the corner" },
];

export const GALLERY: GallerySpace[] = [
  { handle: "krystal", name: "krystal", role: "kawaii", wall: "wall-hearts", bg: "#f3c7da", marks: 3290, online: true, accent: "#ff86bc",
    els: [
      { x: 18, y: 22, w: 96, h: 110, cls: "riso-2", r: 10, t: -3 },
      { x: 124, y: 16, w: 96, h: 64, cls: "scene-portrait", r: 8, t: 2 },
      { x: 124, y: 86, w: 96, h: 56, cls: "grid6" },
      { x: 228, y: 28, w: 70, h: 70, cls: "scene-dune", r: 10, t: 4 },
      { x: 236, y: 104, w: 54, h: 40, cls: "note-mini", t: -4 },
      { kao: "(✿◕ ‿ ◕)", x: 150, y: 150, size: 13, color: "#7a2f52" },
      { cls: "star", x: 96, y: 8, w: 30, h: 30, t: -12 },
      { cls: "star", x: 210, y: 96, w: 22, h: 22, t: 14 },
      { cls: "heart", x: 6, y: 120, w: 26, h: 26, t: -8 },
    ] },
  { handle: "kyoto", name: "kyoto", role: "cursed", wall: "wall-concrete", bg: "#83817d", marks: 1204, online: false, accent: "#9ee84f",
    els: [
      { x: 16, y: 20, w: 60, h: 48, cls: "scene-fog", r: 3, t: -2 },
      { x: 82, y: 14, w: 52, h: 60, cls: "scene-portrait", r: 3, t: 3 },
      { x: 140, y: 22, w: 64, h: 50, cls: "scene-night", r: 3 },
      { x: 210, y: 16, w: 86, h: 66, cls: "scene-fog", r: 3, t: 2 },
      { x: 20, y: 78, w: 90, h: 64, cls: "scene-night", r: 3, t: 1 },
      { x: 118, y: 82, w: 78, h: 60, cls: "glass", r: 4 },
      { x: 204, y: 92, w: 92, h: 50, cls: "note-mini", t: -3 },
      { kao: "i have your IP", x: 210, y: 100, size: 9, color: "#3a2e08" },
      { kao: "(╬ ಠ益ಠ)", x: 24, y: 150, size: 12, color: "#e9ffd0" },
    ] },
  { handle: "dracovin", name: "dracovin", role: "gothic", wall: "wall-dots", bg: "#ece6da", marks: 876, online: true, accent: "#b06a86",
    els: [
      { x: 16, y: 20, w: 104, h: 118, cls: "scene-portrait", r: 6 },
      { x: 128, y: 18, w: 78, h: 58, cls: "riso-3", r: 8, t: 3 },
      { x: 128, y: 84, w: 78, h: 56, cls: "scene-fog", r: 6, t: -2 },
      { x: 216, y: 28, w: 80, h: 110, cls: "glass", r: 10 },
      { x: 234, y: 12, w: 26, h: 40, cls: "cross", t: 6 },
      { kao: "♱ ☹ ♱", x: 150, y: 150, size: 12, color: "#5a3346" },
      { cls: "heart", x: 6, y: 118, w: 22, h: 22, t: -10 },
    ] },
  { handle: "ouro", name: "ouro", role: "emo", wall: "wall-clouds", bg: "#8da6c4", marks: 2058, online: false, accent: "#e85a6a",
    els: [
      { x: 16, y: 22, w: 92, h: 120, cls: "scene-night", r: 6, t: -2 },
      { x: 118, y: 20, w: 104, h: 64, cls: "mediawin" },
      { x: 118, y: 94, w: 104, h: 48, cls: "note-mini", t: 2 },
      { x: 232, y: 30, w: 64, h: 80, cls: "scene-portrait", r: 6, t: 3 },
      { x: 246, y: 116, w: 44, h: 44, cls: "heartbig" },
      { kao: "(╹◡╹)♡", x: 130, y: 150, size: 12, color: "#fff" },
      { kao: "I HAVE A SOUL", x: 124, y: 100, size: 8, color: "#3a2e08" },
    ] },
  { handle: "wraith", name: "wraith", role: "developer", wall: "wall-cyber", bg: "#0a0612", marks: 408, online: true, accent: "#7fd4ff",
    els: [
      { x: 18, y: 22, w: 140, h: 100, cls: "code", r: 8 },
      { x: 170, y: 18, w: 54, h: 104, cls: "gif-scan", r: 6, t: 2 },
      { x: 234, y: 26, w: 62, h: 62, cls: "ascii" },
      { x: 238, y: 98, w: 56, h: 44, cls: "glass", r: 8 },
      { kao: "01101001 :)", x: 24, y: 150, size: 10, color: "#7fd4ff" },
    ] },
  { handle: "vega", name: "vega", role: "y2k", wall: "wall-stars", bg: "#0d0b18", marks: 1640, online: false, accent: "#9fd0ff",
    els: [
      { x: 18, y: 24, w: 96, h: 96, cls: "gif-aura", r: 50, t: 0 },
      { x: 126, y: 20, w: 84, h: 66, cls: "scene-night", r: 8, t: 3 },
      { x: 126, y: 92, w: 84, h: 50, cls: "gif-wave", r: 8 },
      { x: 220, y: 30, w: 78, h: 108, cls: "glass", r: 10 },
      { cls: "star", x: 96, y: 100, w: 34, h: 34, t: -10 },
      { cls: "star", x: 206, y: 8, w: 22, h: 22, t: 16 },
      { kao: ".: ☆ *:･ﾟ", x: 26, y: 150, size: 12, color: "#cfe6ff" },
    ] },
];

export const PLANS: Plan[] = [
  { id: "plot", name: "Plot", price: "Free", sub: "forever", cta: "claim your space", featured: false,
    perks: ["Your handle + space", "All the core blocks", "Guestbook & presence", "Listed in the gallery"] },
  { id: "acre", name: "Acre", price: "$5", sub: "/ month", cta: "get more room", featured: true,
    perks: ["Everything in Plot", "Unlimited blocks & storage", "Rare wallpapers & decorations", "Custom domain", "See who's visited"] },
  { id: "estate", name: "Estate", price: "Soon", sub: "", cta: "join the waitlist", featured: false, soon: true,
    perks: ["Everything in Acre", "Multiple rooms", "Collaborative spaces", "Early access to new blocks"] },
];
