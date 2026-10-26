/**
 * Phones only VIEW profiles (decision of 2026-10-26): creating an account,
 * logging in and editing happen on a computer. Server-side, from the
 * User-Agent, so there is no flash. iPadOS Safari reports a desktop UA and is
 * treated as a computer.
 */
const MOBILE_UA = /android|iphone|ipad|ipod|mobile|blackberry|windows phone/i;

export function isMobileUserAgent(ua: string | null | undefined): boolean {
  return MOBILE_UA.test(ua ?? "");
}
