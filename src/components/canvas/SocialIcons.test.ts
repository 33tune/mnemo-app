import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform, PLATFORM_LABELS, type Platform } from "./SocialIcons";

// ── Detection: one canonical URL per platform (Stage 4.2-B §11 "Detection") ──

const CANONICAL: Record<Platform, string> = {
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
};

for (const platform of Object.keys(CANONICAL) as Platform[]) {
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
