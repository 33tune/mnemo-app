"use client";
/**
 * /crear (2026-11-20): the page the TikTok link opens. One promise ("tu perfil,
 * 100 % a tu gusto"), real cards, what you can change, and the name claim right
 * away — no distractions. Phone first: that's where the videos are watched.
 */
import React, { useEffect, useRef, useState } from "react";
import type { HandleStatus } from "./siteAuth";

const CARDS = ["r-zaid", "r-raincandy_u", "r-gutted", "r-faexiu", "r-sorceror", "r-cloms"];
const CHANGES = ["Fondo", "Colores", "Letra", "Holo", "Brillos", "Stickers", "Animaciones", "Tu sala", "Música", "Cursor", "Botones", "Tus redes"];
const TAKEN = new Set(["nico", "zaid", "gutted", "faexiu", "sorceror", "cloms", "raincandy_u"]);

type Status = "idle" | "checking" | "short" | "invalid" | "empty" | HandleStatus;
const MSG: Record<Status, string> = {
  idle: "Tu link va a ser myland.lol/tunombre",
  checking: "Buscando…",
  short: "Mínimo 3 caracteres",
  invalid: "Solo letras, números, _ y -",
  empty: "Escribí el nombre que querés",
  ok: "¡Disponible! Es tuyo si lo reclamás",
  taken: "Ese ya es de alguien. Probá otro",
};

function Claim({ checkHandle, onClaim, id }: { checkHandle: (h: string) => Promise<HandleStatus>; onClaim: (h: string) => void; id: string }) {
  const [h, setH] = useState("");
  const [st, setSt] = useState<Status>("idle");
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\s+/g, "").toLowerCase().slice(0, 20);
    setH(v); if (t.current) clearTimeout(t.current);
    if (!v) return setSt("idle");
    if (!/^[a-z0-9_-]*$/.test(v)) return setSt("invalid");
    if (v.length < 3) return setSt("short");
    setSt("checking");
    t.current = setTimeout(async () => { const r = TAKEN.has(v) ? "taken" : await checkHandle(v); setSt(prev => (prev === "checking" ? r : prev)); }, 450);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (st === "ok") return onClaim(h);
    formRef.current?.animate?.([{ transform: "translateX(0)" }, { transform: "translateX(-10px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 360 });
    if (st === "idle") setSt("empty");
    (formRef.current?.querySelector("input") as HTMLInputElement | null)?.focus();
  };
  return (
    <div className="cr-claimwrap">
      <form ref={formRef} className="cr-claim" data-st={st} onSubmit={submit}>
        <label htmlFor={id} className="cr-pre">myland.lol/</label>
        <input id={id} value={h} onChange={onChange} placeholder="tunombre" autoCapitalize="none" autoComplete="off" spellCheck={false} aria-describedby={id + "-m"} />
        <button type="submit">Reclamar</button>
      </form>
      <p id={id + "-m"} className="cr-msg" data-st={st} aria-live="polite">{MSG[st]}</p>
    </div>
  );
}

export default function CrearPage({ checkHandle, navigate }: { checkHandle: (h: string) => Promise<HandleStatus>; navigate: (url: string) => void }) {
  const onClaim = (h: string) => navigate("/login?mode=register&from=claim&handle=" + encodeURIComponent(h));
  const [dock, setDock] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setDock(!e.isIntersecting), { threshold: 0 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <main className="cr" ref={rootRef}>
      <style>{CSS}</style>
      <header className="cr-top">
        <a href="/" className="cr-brand"><img src="/landing/logo.png" alt="" width={30} height={30} /> myLand</a>
        <span className="cr-beta">Beta abierta · Gratis</span>
      </header>

      <section className="cr-hero">
        <h1>Tu perfil,<br /><em>100 % a tu gusto.</em></h1>
        <p className="cr-sub">Las redes te dan el mismo perfil que a todos. En myLand armás tu card y tu sala como quieras, y compartís todo con un solo link.</p>
        <div ref={heroRef}><Claim id="cr-h1" checkHandle={checkHandle} onClaim={onClaim} /></div>
      </section>

      <section className="cr-river" aria-label="Cards reales de la comunidad">
        <div className="cr-track">
          {[...CARDS, ...CARDS].map((c, i) => <img key={i} src={`/landing/hero/${c}.webp`} alt="" loading={i < 4 ? "eager" : "lazy"} />)}
        </div>
        <p className="cr-cap">Cards reales hechas en myLand. No hay dos iguales.</p>
      </section>

      <section className="cr-sec">
        <h2>Cambiás <em>todo</em></h2>
        <ul className="cr-chips">{CHANGES.map((c, i) => <li key={c} style={{ animationDelay: `${i * 60}ms` }}>{c}</li>)}</ul>
      </section>

      <section className="cr-sec">
        <h2>En 3 pasos</h2>
        <ol className="cr-steps">
          <li><b>1</b><span><strong>Reclamá tu nombre</strong> antes que otro: myland.lol/tunombre es único.</span></li>
          <li><b>2</b><span><strong>Armá tu card</strong> con tu foto, tus redes y tu estilo, desde el celular o la compu.</span></li>
          <li><b>3</b><span><strong>Poné tu link</strong> en tu bio de TikTok, Instagram o donde quieras.</span></li>
        </ol>
      </section>

      <section className="cr-sec cr-last">
        <h2>¿Tu nombre sigue libre?</h2>
        <Claim id="cr-h2" checkHandle={checkHandle} onClaim={onClaim} />
      </section>

      <div className="cr-dock" data-on={dock || undefined} aria-hidden={!dock}>
        <button type="button" tabIndex={dock ? 0 : -1} onClick={() => { rootRef.current?.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => (document.getElementById("cr-h1") as HTMLInputElement | null)?.focus({ preventScroll: true }), 450); }}>
          Reclamar mi nombre gratis
        </button>
      </div>
    </main>
  );
}

const CSS = `
.cr{--pink:#FF4F94;--lime:#D6FF5A;--ink:#F6F3F8;--dim:rgba(246,243,248,.62);position:fixed;inset:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;color:var(--ink);background:radial-gradient(120% 60% at 50% -10%,#3a1430 0%,#0E0C12 55%);font-family:'Bricolage Grotesque',system-ui,-apple-system,sans-serif;overflow-x:hidden;padding-bottom:96px}
.cr *{box-sizing:border-box}
.cr-top{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;max-width:880px;margin:0 auto}
.cr-brand{display:flex;align-items:center;gap:8px;color:var(--ink);text-decoration:none;font-weight:800;font-size:18px}
.cr-brand img{border-radius:8px}
.cr-beta{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0E0C12;background:var(--lime);border-radius:999px;padding:6px 10px}
.cr-hero{max-width:880px;margin:0 auto;padding:28px 18px 8px;text-align:center}
.cr-hero h1{font-family:'Archivo',sans-serif;font-stretch:115%;font-weight:900;font-size:clamp(40px,11vw,76px);line-height:.95;letter-spacing:-.02em;margin:0;text-transform:uppercase}
.cr-hero h1 em,.cr h2 em{font-style:normal;color:var(--pink)}
.cr-sub{font-size:clamp(16px,4.3vw,19px);line-height:1.4;color:var(--dim);max-width:560px;margin:16px auto 22px}
.cr-claimwrap{max-width:520px;margin:0 auto}
.cr-claim{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.16);border-radius:999px;padding:6px 6px 6px 18px;transition:border-color .2s}
.cr-claim[data-st=ok]{border-color:var(--lime)}
.cr-claim[data-st=taken],.cr-claim[data-st=invalid],.cr-claim[data-st=empty]{border-color:#ff6b6b}
.cr-pre{color:var(--dim);font-weight:600;font-size:16px;white-space:nowrap}
.cr-claim input{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--ink);font:inherit;font-size:16px;font-weight:700;padding:10px 0}
.cr-claim button{flex:none;border:none;border-radius:999px;background:var(--pink);color:#fff;font:inherit;font-weight:800;font-size:16px;padding:12px 18px;cursor:pointer}
.cr-claim button:focus-visible,.cr-dock button:focus-visible{outline:3px solid var(--lime);outline-offset:2px}
.cr-msg{font-size:13px;margin:10px 0 0;color:var(--dim);min-height:18px}
.cr-msg[data-st=ok]{color:var(--lime)}.cr-msg[data-st=taken],.cr-msg[data-st=invalid],.cr-msg[data-st=empty]{color:#ff8a8a}
.cr-river{margin:36px 0 8px;overflow:hidden;-webkit-mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.cr-track{display:flex;gap:16px;width:max-content;animation:cr-scroll 34s linear infinite;align-items:center}
.cr-track img{height:clamp(210px,52vw,300px);width:auto;filter:drop-shadow(0 18px 30px rgba(0,0,0,.5))}
@keyframes cr-scroll{to{transform:translateX(-50%)}}
.cr-cap{text-align:center;color:var(--dim);font-size:14px;margin:14px 18px 0}
.cr-sec{max-width:880px;margin:0 auto;padding:34px 18px 0;text-align:center}
.cr h2{font-family:'Archivo',sans-serif;font-stretch:112%;font-weight:900;font-size:clamp(28px,7.5vw,44px);text-transform:uppercase;margin:0 0 18px;letter-spacing:-.01em}
.cr-chips{list-style:none;padding:0;margin:0 auto;max-width:620px;display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.cr-chips li{padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);font-weight:700;font-size:15px;animation:cr-pop .5s both}
.cr-chips li:nth-child(3n+1){background:rgba(255,79,148,.16);border-color:rgba(255,79,148,.45)}
@keyframes cr-pop{from{opacity:0;transform:translateY(8px) scale(.94)}}
.cr-steps{list-style:none;padding:0;margin:0 auto;max-width:560px;display:flex;flex-direction:column;gap:12px;text-align:left}
.cr-steps li{display:flex;gap:14px;align-items:flex-start;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:14px 16px}
.cr-steps b{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--pink);color:#fff;font-weight:900}
.cr-steps span{color:var(--dim);font-size:15px;line-height:1.4}.cr-steps strong{color:var(--ink)}
.cr-last{padding-bottom:20px}
.cr-dock{position:fixed;left:0;right:0;bottom:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,rgba(14,12,18,.92) 35%);transform:translateY(110%);transition:transform .25s;z-index:20}
.cr-dock[data-on]{transform:none}
.cr-dock button{width:100%;max-width:520px;display:block;margin:0 auto;border:none;border-radius:999px;background:var(--pink);color:#fff;font:inherit;font-weight:800;font-size:17px;padding:15px}
@media (prefers-reduced-motion:reduce){.cr-track{animation:none}.cr-chips li{animation:none}}
`;
