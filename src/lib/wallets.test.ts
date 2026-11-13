import { test } from "node:test";
import assert from "node:assert/strict";
import { walletCoins, walletCoin, normalizeWallet, looksLikeBadWallet, shortWallet } from "./wallets";

test("detects each coin from its address format", () => {
  const cases: [string, string][] = [
    ["bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "btc"],
    ["1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2", "btc"],
    ["3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", "btc"],
    ["0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "eth"],
    ["ltc1qg82tsfehd7t2qtxrfz2ma3p0hxcr7xcvf8vfxj", "ltc"],
    ["LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH9", "ltc"],
    ["DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L", "doge"],
    ["TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE", "usdt"],
    ["7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV", "sol"],
    ["44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A", "xmr"],
  ];
  for (const [addr, coin] of cases) assert.equal(walletCoin(addr), coin, addr);
});

test("ambiguous formats list every coin and honor the owner's pick", () => {
  assert.deepEqual(walletCoins("0x71C7656EC7ab88b098defB751B7401B5f6d8976F"), ["eth", "usdt", "bnb"]);
  assert.equal(walletCoin("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "bnb"), "bnb");
  assert.equal(walletCoin("TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE", "trx"), "trx");
  // A pick that doesn't fit the address falls back to the default.
  assert.equal(walletCoin("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "eth"), "btc");
});

test("links and plain words are never wallets", () => {
  for (const s of ["instagram.com/nico", "https://x.com/abc", "nico", "mailto:a@b.com", "discord.gg/abcdefghijklmnopqrstuvwxyz12345"])
    assert.equal(walletCoins(s), null, s);
});

test("payment URIs and spaces are cleaned", () => {
  assert.equal(normalizeWallet(" bitcoin:BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ?amount=0.1 "), "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq");
  assert.equal(walletCoin("ethereum:0x71C7656EC7ab88b098defB751B7401B5f6d8976F"), "eth");
});

test("a typo'd address is flagged, a link is not", () => {
  assert.equal(looksLikeBadWallet("0x71C7656EC7ab88b098defB751B7401B5f6d8976"), true);
  assert.equal(looksLikeBadWallet("instagram.com/averyveryverylongusername"), false);
  assert.equal(shortWallet("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"), "bc1qar…f5mdq");
});
