"use client";
/**
 * Anti-bots (2026-11-27): Cloudflare Turnstile, the invisible "no soy un
 * robot". Supabase Auth checks the token on sign-up, sign-in, password reset
 * and the verification code (Authentication › Attack Protection › Captcha,
 * provider Turnstile, with the secret key). The site key goes in
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY; without it this returns undefined and every
 * call works as before (so the key must be deployed BEFORE captcha is turned
 * on in Supabase). Most people never see anything; a suspicious browser gets
 * a small check box in the corner.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

let scriptP: Promise<Turnstile | null> | null = null;
function loadScript(): Promise<Turnstile | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptP ??= new Promise(res => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => res(window.turnstile ?? null);
    s.onerror = () => { scriptP = null; res(null); };
    document.head.appendChild(s);
  });
  return scriptP;
}

export const captchaEnabled = () => !!SITE_KEY;

/** A fresh token for one auth call (undefined when captcha is not set up). */
export async function getCaptchaToken(): Promise<string | undefined> {
  if (!SITE_KEY || typeof window === "undefined") return undefined;
  const ts = await loadScript();
  if (!ts) return undefined;
  return new Promise(resolve => {
    const box = document.createElement("div");
    box.setAttribute("data-mnemo-ui", "");
    box.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647";
    document.body.appendChild(box);
    let id = "";
    const done = (t?: string) => {
      try { if (id) ts.remove(id); } catch { /* gone */ }
      box.remove();
      resolve(t);
    };
    const timer = window.setTimeout(() => done(undefined), 60_000);
    try {
      id = ts.render(box, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        callback: (t: string) => { clearTimeout(timer); done(t); },
        "error-callback": () => { clearTimeout(timer); done(undefined); },
        "expired-callback": () => { clearTimeout(timer); done(undefined); },
      });
    } catch { clearTimeout(timer); done(undefined); }
  });
}
