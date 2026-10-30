import test from "node:test";
import assert from "node:assert/strict";
import { miniCardOf, googleFontsHref, foundedText, CREW_FONTS } from "./crewLook";
import { parseInvite, slugify, cleanCrewName, cleanTag, lineCount, URL_OK, normalizeUrl, timeAgo, normalizeDiscord, DISCORD_RE, inkOn, memberNumber, isFounder, crewErrorText } from "./crewTypes";

test("mini-card: the card's photo, name, colors and name font; a member without a public room still shows", () => {
  const m = miniCardOf({ name: "Zaid", handle: "zaid", photo: "https://x/p.webp", nameFont: "Bookman", nameColor: "#039f00",
    effects: { bg: { color: "#022d00" } } }, "zaid", null);
  assert.equal(m.name, "Zaid");
  assert.equal(m.photo, "https://x/p.webp");
  assert.equal(m.nameColor, "#039f00");
  assert.equal(m.bg, "#022d00");
  assert.match(m.nameFont, /Bookman/);
  const bare = miniCardOf(null, "mili", "Mili");
  assert.equal(bare.name, "Mili");
  assert.equal(bare.photo, null);
});

test("Google fonts: one link for the ones that need it, device fonts skipped", () => {
  assert.equal(googleFontsHref(["Arial", "Georgia"]), null);
  const href = googleFontsHref(["Syne", "Unbounded", "Syne", "Arial"])!;
  assert.match(href, /family=Syne/);
  assert.match(href, /family=Unbounded/);
  assert.equal(href.match(/family=Syne/g)!.length, 1);
  assert.ok(CREW_FONTS.includes("Unbounded") && CREW_FONTS.includes("DM Sans"));
});

test("crew helpers", () => {
  assert.equal(slugify("Los Búhos"), "los-buhos");
  assert.equal(slugify("  Ñandú  Club "), "nandu-club");
  assert.equal(cleanCrewName("Night/Shift ✦ 99"), "NightShift 99");
  assert.ok(DISCORD_RE.test(normalizeDiscord("discord.gg/abc123")));
  assert.ok(!DISCORD_RE.test(normalizeDiscord("https://evil.com/discord.gg/x")));
  assert.equal(inkOn("#ffffff"), "#141118");
  assert.equal(inkOn("#000000"), "#ffffff");
  assert.equal(memberNumber(7), "#07");
  assert.ok(isFounder(1) && !isFounder(2));
  assert.match(crewErrorText({ message: "banned" }), /No podés entrar/);
  assert.match(crewErrorText({ message: "tag_taken" }), /tag/);
  assert.equal(cleanTag("lx-m9!"), "LXM9");
  assert.equal(lineCount("a\nb\nc"), 3);
  assert.ok(URL_OK(normalizeUrl("youtube.com/@x")) && !URL_OK("https://nada") && !URL_OK(normalizeUrl("")));
  const now = Date.parse("2026-10-31T12:00:00Z");
  assert.equal(timeAgo("2026-10-31T11:59:40Z", now), "recién");
  assert.equal(timeAgo("2026-10-31T11:45:00Z", now), "hace 15 min");
  assert.equal(timeAgo("2026-10-31T07:00:00Z", now), "hace 5 h");
  assert.equal(foundedText("2026-10-29T12:00:00Z"), "Fundado el 29/10/2026");
});

test("invite links pasted in the Crews panel", () => {
  assert.deepEqual(parseInvite("https://www.myland.lol/c/gun/unirme?k=abc_12-X"), { slug: "gun", code: "abc_12-X" });
  assert.deepEqual(parseInvite("  myland.lol/c/los-buhos/unirme?k=Zz9  "), { slug: "los-buhos", code: "Zz9" });
  assert.equal(parseInvite("https://www.myland.lol/c/gun"), null);
  assert.equal(parseInvite("hola"), null);
});
