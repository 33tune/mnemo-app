"use client";
/**
 * Idioma (2026-11-27): with English on, every UI text and label in the page
 * (text nodes, placeholder, aria-label, title, data-tip) that is in the
 * dictionary (src/lib/i18n/en.ts) is shown in English, and back to the
 * original when Spanish is chosen again. It never touches what people make:
 * the card ([data-profile-card]), fields being typed in, posts and anything
 * marked [data-no-i18n]; the landing keeps its own switch ([data-en]).
 */
import { useEffect } from "react";
import { EN, EN_PATTERNS } from "@/lib/i18n/en";
import { getLang, LANG_EVENT, type Lang } from "@/lib/i18n/lang";

const ATTRS = ["placeholder", "aria-label", "title", "data-tip", "alt"] as const;
const SKIP = "[data-profile-card],[data-no-i18n],[data-mnw-fx],[data-en],[contenteditable='true'],script,style,textarea,code,pre";

function translate(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const hit = EN[t];
  if (hit !== undefined) return hit;
  for (const [re, fn] of EN_PATTERNS) {
    const m = t.match(re);
    if (m) return fn(m, x => EN[x] ?? x);
  }
  return null;
}

export default function Translator() {
  useEffect(() => {
    // Originals, to put back when Spanish is chosen again.
    const textOrig = new WeakMap<Text, string>();
    const attrOrig = new WeakMap<Element, Record<string, string>>();
    const touched = new Set<WeakRef<Node>>();
    let lang: Lang = getLang();
    let busy = false;

    const skip = (el: Element | null) => !el || !!el.closest(SKIP);

    const written = new WeakMap<Text, string>();
    function doText(n: Text) {
      const cur = n.data;
      const orig = textOrig.get(n);
      // Still our own translation → its original; else React wrote a new text.
      const base = orig !== undefined && cur === written.get(n) ? orig : cur;
      const tr = translate(base);
      if (tr === null) return;
      if (skip(n.parentElement)) return;
      const lead = base.match(/^\s*/)![0], trail = base.match(/\s*$/)![0];
      const next = lead + tr + trail;
      if (cur === next) return;
      textOrig.set(n, base); written.set(n, next);
      touched.add(new WeakRef(n));
      n.data = next;
    }
    function doAttrs(el: Element) {
      if (skip(el)) return;
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v) continue;
        const rec = attrOrig.get(el) ?? {};
        const base = rec[a] !== undefined && v === translate(rec[a]) ? rec[a] : v;
        const tr = translate(base);
        if (tr === null || v === tr) continue;
        rec[a] = base; attrOrig.set(el, rec);
        touched.add(new WeakRef(el));
        el.setAttribute(a, tr);
      }
    }
    function walk(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) { doText(root as Text); return; }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const el = root as Element;
      if (el.closest(SKIP)) return;
      doAttrs(el);
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.nodeType === Node.ELEMENT_NODE && (n as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) doText(n as Text); else doAttrs(n as Element);
      }
    }
    function restore() {
      for (const ref of touched) {
        const n = ref.deref();
        if (!n) continue;
        if (n.nodeType === Node.TEXT_NODE) { const o = textOrig.get(n as Text); if (o !== undefined) (n as Text).data = o; }
        else { const rec = attrOrig.get(n as Element); if (rec) for (const [a, v] of Object.entries(rec)) (n as Element).setAttribute(a, v); }
      }
      touched.clear();
    }

    const mo = new MutationObserver(list => {
      if (lang !== "en" || busy) return;
      busy = true;
      try {
        for (const m of list) {
          if (m.type === "characterData") doText(m.target as Text);
          else if (m.type === "attributes") doAttrs(m.target as Element);
          else m.addedNodes.forEach(walk);
        }
      } finally { busy = false; }
    });
    const start = () => {
      document.documentElement.lang = lang;
      if (lang === "en") {
        walk(document.body);
        mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
      }
    };
    start();
    const onLang = (e: Event) => {
      const next = (e as CustomEvent<Lang>).detail;
      if (next === lang) return;
      lang = next;
      mo.disconnect();
      if (lang === "es") restore();
      start();
    };
    window.addEventListener(LANG_EVENT, onLang);
    return () => { window.removeEventListener(LANG_EVENT, onLang); mo.disconnect(); };
  }, []);
  return null;
}
