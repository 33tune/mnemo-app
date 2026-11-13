/**
 * Crypto wallet addresses in the card's Íconos row (2026-11-13, pedido del
 * usuario: "como guns.lol"). A contact link whose text is a wallet address is
 * NOT a link: its icon only copies the address. The coin is detected from the
 * address format; when one format serves several coins (0x… = Ethereum / USDT
 * / BNB, T… = USDT / Tron) the owner can pick one (ContactLink.coin), and the
 * first candidate is the default.
 */

export type Coin = "btc" | "eth" | "sol" | "ltc" | "doge" | "xmr" | "usdt" | "bnb" | "trx";

export const COIN_LABELS: Record<Coin, string> = {
  btc: "Bitcoin", eth: "Ethereum", sol: "Solana", ltc: "Litecoin", doge: "Dogecoin",
  xmr: "Monero", usdt: "USDT", bnb: "BNB", trx: "Tron",
};

export const COIN_COLORS: Record<Coin, string> = {
  btc: "#F7931A", eth: "#627EEA", sol: "#14F195", ltc: "#345D9D", doge: "#C2A633",
  xmr: "#FF6600", usdt: "#26A17B", bnb: "#F3BA2F", trx: "#FF060A",
};

const B58 = "1-9A-HJ-NP-Za-km-z";
const BECH = "02-9ac-hj-np-z";
const RULES: { re: RegExp; coins: Coin[] }[] = [
  { re: /^0x[0-9a-fA-F]{40}$/, coins: ["eth", "usdt", "bnb"] },
  { re: new RegExp(`^[48][0-9AB][${B58}]{93}([${B58}]{11})?$`), coins: ["xmr"] },
  { re: new RegExp(`^(bc1[${BECH}]{11,71}|[13][${B58}]{25,34})$`), coins: ["btc"] },
  { re: new RegExp(`^(ltc1[${BECH}]{11,71}|[LM][${B58}]{26,33})$`), coins: ["ltc"] },
  { re: new RegExp(`^D[5-9A-HJ-NP-U][${B58}]{32}$`), coins: ["doge"] },
  { re: new RegExp(`^T[${B58}]{33}$`), coins: ["usdt", "trx"] },
  { re: new RegExp(`^[${B58}]{32,44}$`), coins: ["sol"] },
];

/** The bare address: trims, drops a payment-URI scheme ("bitcoin:…") and its
 * query (?amount=…), and lowercases bech32 (bc1 / ltc1), which is case-blind. */
export function normalizeWallet(raw: string): string {
  let s = raw.trim().replace(/\s+/g, "");
  const m = s.match(/^[a-z]+:(.+)$/i);
  if (m && !/^https?:/i.test(s)) s = m[1];
  s = s.split("?")[0];
  if (/^(bc1|ltc1)/i.test(s)) s = s.toLowerCase();
  return s;
}

/** The coins this text can be an address of (first = default), or null when
 * it is not a wallet address. */
export function walletCoins(raw: string): Coin[] | null {
  const s = normalizeWallet(raw);
  if (!s || s.includes(".") || s.includes("/")) return null;
  for (const r of RULES) if (r.re.test(s)) return r.coins;
  return null;
}

/** The coin to show: the owner's pick when it fits the address, else the
 * default for the format. */
export function walletCoin(raw: string, pick?: Coin): Coin | null {
  const coins = walletCoins(raw);
  if (!coins) return null;
  return pick && coins.includes(pick) ? pick : coins[0];
}

/** Text that looks meant as an address (long, no dots or slashes) but fails
 * every format: the menu warns instead of adding it. */
export function looksLikeBadWallet(raw: string): boolean {
  const s = normalizeWallet(raw);
  return s.length >= 24 && !/[./@]/.test(s) && !walletCoins(s);
}

/** "bc1qxy…x0wlh": enough to check it is the right one. */
export function shortWallet(addr: string): string {
  return addr.length <= 14 ? addr : `${addr.slice(0, 6)}…${addr.slice(-5)}`;
}
