import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, PLATFORM_LABELS, type Platform } from "./SocialIcons";

// ── Detection: one canonical URL per platform (Stage 4.2-B §11 "Detection") ──

// bnb / trx share their address format with eth / usdt (the default); the
// owner picks them in the menu, so detection alone never returns them.
const CANONICAL: Record<Exclude<Platform, "bnb" | "trx">, string> = {
  discord:    "https://discord.gg/abc123",
  instagram:  "https://www.instagram.com/someuser/",
  github:     "https://github.com/someuser",
  spotify:    "https://open.spotify.com/artist/abc123",
  youtube:    "https://www.youtube.com/@someuser",
  twitter:    "https://x.com/someuser",
  tiktok:     "https://www.tiktok.com/@someuser",
  twitch:     "https://www.twitch.tv/someuser",
  soundcloud: "https://soundcloud.com/someuser",
  steam:      "https://steamcommunity.com/id/someuser",
  telegram:   "https://t.me/someuser",
  linkedin:   "https://www.linkedin.com/in/someuser",
  facebook:   "https://www.facebook.com/someuser",
  link:       "https://someone-elses-site.example.com/someuser",
  btc:        "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  eth:        "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  sol:        "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
  ltc:        "LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH9",
  doge:       "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L",
  xmr:        "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A",
  usdt:       "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
};

for (const platform of Object.keys(CANONICAL) as (keyof typeof CANONICAL)[]) {
  test(`detectPlatform: recognizes ${platform}`, () => {
    assert.equal(detectPlatform(CANONICAL[platform]), platform);
  });
}

test("detectPlatform: unknown domains fall back to the generic link platform", () => {
  assert.equal(detectPlatform("https://my-personal-blog.example/post/1"), "link");
});

test("every Platform has a human label, including soundcloud and the generic fallback", () => {
  for (const platform of Object.keys(CANONICAL) as Platform[]) {
    assert.ok(PLATFORM_LABELS[platform] && PLATFORM_LABELS[platform].length > 0, `${platform} has no label`);
  }
});

// ── Robustness: scheme, www, path, query, trailing slash, case ───────────────

const INSTAGRAM_VARIANTS = [
  "instagram.com/someuser",
  "http://instagram.com/someuser",
  "https://instagram.com/someuser",
  "https://www.instagram.com/someuser",
  "https://www.instagram.com/someuser/",
  "https://www.instagram.com/someuser?hl=en",
  "https://www.instagram.com/someuser/?hl=en&igshid=abc",
  "HTTPS://WWW.INSTAGRAM.COM/SOMEUSER",
  "https://INSTAGRAM.com/someuser",
];

for (const url of INSTAGRAM_VARIANTS) {
  test(`detectPlatform is robust to URL shape: ${url}`, () => {
    assert.equal(detectPlatform(url), "instagram");
  });
}

test("detectPlatform is case-insensitive for soundcloud", () => {
  assert.equal(detectPlatform("https://SoundCloud.com/someuser/some-track"), "soundcloud");
});

test("detectPlatform handles a bare domain with no scheme at all", () => {
  assert.equal(detectPlatform("github.com/someuser"), "github");
});
