"use client";
import "./landing.css";
import { useState, useEffect, useRef } from "react";

/* ─────────── bokeh sky with gentle mouse parallax ─────────── */
function Sky() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5);
        const y = (e.clientY / window.innerHeight - 0.5);
        const el = ref.current; if (!el) return;
        const blobs = el.querySelectorAll(".blob");
        blobs.forEach((b, i) => {
          const d = (i + 1) * 6;
          (b as HTMLElement).style.marginLeft = (x * d) + "px";
          (b as HTMLElement).style.marginTop = (y * d) + "px";
        });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="sky" ref={ref}>
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <div className="blob b4" /><div className="blob b5" /><div className="blob b6" />
    </div>
  );
}

/* ─────────── claim field ─────────── */
const RESERVED = new Set(["login", "dashboard", "auth", "api", "admin", "settings", "explore", "home", "myland"]);
const TAKEN = new Set(["neve", "mara", "sol", "kyoto", "vega", "atlas", "luna", "rin"]);

function ClaimField({ id, autoFocus }: { id: string; autoFocus?: boolean }) {
  const [val, setVal] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (raw: string) => {
    const h = raw.toLowerCase().replace(/\s/g, "");
    setVal(h);
    if (tRef.current) clearTimeout(tRef.current);
    if (!h) { setStatus("idle"); return; }
    if (!/^[a-z0-9_-]{3,20}$/.test(h) || RESERVED.has(h)) { setStatus("invalid"); return; }
    setStatus("checking");
    tRef.current = setTimeout(() => setStatus(TAKEN.has(h) ? "taken" : "ok"), 520);
  };

  const cls = status === "ok" ? "ok" : (status === "taken" || status === "invalid") ? "bad" : "";
  const hint =
    status === "checking" ? "checking availability…" :
    status === "ok" ? "available — it's yours" :
    status === "taken" ? "already taken, try another" :
    status === "invalid" ? "3–20 characters · a–z, 0–9, - and _" : "";
  const hintColor = status === "ok" ? "var(--pink)" : (status === "taken" || status === "invalid") ? "rgba(210,70,60,0.9)" : "var(--ink-3)";

  return (
    <div className="claimwrap">
      <div className={"claim " + cls}>
        <span className="pre">myland.lol/</span>
        <input id={id} value={val} onChange={(e) => onChange(e.target.value)} placeholder="your-name" spellCheck={false} autoFocus={autoFocus} aria-label="choose your handle" />
        {status === "ok" && <span className="chk" style={{ color: "var(--pink)" }}>✓</span>}
        {status === "checking" && <span className="chk" style={{ color: "var(--ink-3)" }}>•••</span>}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-dark">Claim your land</button>
        <a href="#explore" className="btn btn-ghost">Explore lands</a>
      </div>
      <div className="hint" style={{ color: hintColor }}>{hint}</div>
    </div>
  );
}

/* ─────────── topbar ─────────── */
function Topbar() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 30);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={"topbar " + (solid ? "solid" : "")}>
      <a href="#top" className="brand">
        <img src="/logo.png" alt="myLand" />
        <span>myLand</span>
      </a>
      <nav className="nav">
        <a href="#explore" className="btn btn-ghost btn-sm desk">Explore</a>
        <a href="#" className="btn btn-ghost btn-sm">Sign in</a>
        <a href="#claim" className="btn btn-dark btn-sm">Claim your land</a>
      </nav>
    </header>
  );
}

/* ─────────── fanned cards ─────────── */
const FAN = [
  { cls: "fg-violet", w: 168, h: 224, x: 250, y: 70, rot: -13, label: "" },
  { cls: "fg-blue",   w: 176, h: 234, x: 372, y: 36, rot: -6,  label: "" },
  { cls: "fg-mint",   w: 180, h: 240, x: 500, y: 18, rot: 1,   label: "myland.lol" },
  { cls: "fg-warm",   w: 176, h: 234, x: 628, y: 40, rot: 8,   label: "" },
  { cls: "fg-pink",   w: 168, h: 224, x: 752, y: 78, rot: 15,  label: "" },
];
function Fan() {
  return (
    <div className="fan desk" style={{ right: -90, top: "50%", transform: "translateY(-46%)", width: 700, height: 320, position: "absolute" }} aria-hidden="true">
      {FAN.map((c, i) => (
        <div key={i} className={"fancard " + c.cls} style={{ width: c.w, height: c.h, left: c.x, top: c.y, transform: `rotate(${c.rot}deg)` }}>
          <div className="gloss" /><div className="grain" />
          {c.label && <span className="vlabel">{c.label}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─────────── hero ─────────── */
function Hero() {
  return (
    <section id="top" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", paddingTop: 96, paddingBottom: 56 }}>
      <div className="aura aura-pink" style={{ width: 720, height: 560, right: -120, top: "8%" }} aria-hidden="true" />
      <div className="aura aura-violet" style={{ width: 460, height: 460, right: 280, top: "44%" }} aria-hidden="true" />
      <div className="ghost" style={{ fontSize: "clamp(140px,20vw,300px)", left: "-2%", bottom: "-8%", opacity: 0.6 }} aria-hidden="true">myland</div>
      <Fan />

      <div className="wrap" style={{ width: "100%", position: "relative", zIndex: 2 }}>
        <div className="toplabels" style={{ marginBottom: "clamp(28px,5vw,64px)", maxWidth: 760 }}>
          <span>✦ myland.lol</span><span className="sep" /><span>make yourself at home</span><span className="sep desk" /><span className="desk">est. 2024</span>
        </div>

        <div style={{ maxWidth: 760, position: "relative" }}>
          <div className="mlabel" style={{ marginBottom: 16 }}>not a link in bio —</div>
          <h1 style={{ fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 0.9, fontSize: "clamp(52px,11.5vw,150px)", textTransform: "uppercase", color: "var(--ink)" }}>
            A space<br />that&apos;s <span className="gradtext">yours.</span>
          </h1>
          <p className="lead" style={{ fontSize: "clamp(17px,2.2vw,21px)", marginTop: 26, maxWidth: 430 }}>
            Build a page that feels like you — links, music, whatever. Make it yours.
          </p>
          <div id="claim" style={{ marginTop: 32, position: "relative" }}>
            <ClaimField id="hero-claim" />
            <div className="anno desk" style={{ left: 500, top: -6 }} aria-hidden="true">
              <span className="txt">claim your name<br />in seconds —</span>
              <svg width="64" height="40" viewBox="0 0 64 40" fill="none"><path d="M60 4 C40 8 14 12 6 30" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 0"/><path d="M6 30 l10 -3 M6 30 l3 -10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="desk" style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, zIndex: 2 }}>
        <span className="mlabel" style={{ fontSize: 9 }}>explore lands</span>
        <span style={{ width: 1, height: 26, background: "linear-gradient(to bottom,var(--ink-3),transparent)" }} />
      </div>
    </section>
  );
}

/* ─────────── explore ─────────── */
const TINTS = [
  "linear-gradient(140deg,#fdeef4,#eef2fb)",
  "linear-gradient(140deg,#eef6f1,#f3eefb)",
  "linear-gradient(140deg,#fef3ea,#eef1f8)",
  "linear-gradient(140deg,#eef1fb,#fbeef6)",
  "linear-gradient(140deg,#f3f0fb,#eef7f4)",
  "linear-gradient(140deg,#fbeef0,#eef4fb)",
];
function SpaceCard({ rank }: { rank: number }) {
  const [m, setM] = useState({ x: 0.5, y: 0.5 });
  const [hov, setHov] = useState(false);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); setM({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); };
  const px = hov ? (m.x - 0.5) * -10 : 0, py = hov ? (m.y - 0.5) * -7 : 0;
  return (
    <div className="spacecard" onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setM({ x: .5, y: .5 }); }} onMouseMove={onMove}>
      <div className="thumb" style={{ background: TINTS[(rank - 1) % TINTS.length] }}>
        <span className="rank">{rank}</span>
        <div className="thumb-ph" style={{ transform: `translate(${px}px,${py}px) scale(${hov ? 1.04 : 1})`, transition: hov ? "transform .08s linear" : "transform .3s ease" }}>
          <div className="ph-mark">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="ph-tag">real space</span>
          </div>
        </div>
      </div>
      <div className="card-foot">
        <div style={{ minWidth: 0 }}>
          <div className="sk" style={{ width: 92, height: 11 }} />
          <div className="card-sub" style={{ marginTop: 7 }}>@handle</div>
        </div>
        <div className="views">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
          <span className="sk" style={{ width: 30, height: 9 }} />
        </div>
      </div>
    </div>
  );
}
function Explore() {
  const [expanded, setExpanded] = useState(false);
  const count = expanded ? 15 : 6;
  return (
    <section id="explore" className="wrap rev" style={{ padding: "110px 32px 90px", position: "relative", overflow: "hidden" }}>
      <div className="ghost" style={{ fontSize: "clamp(110px,17vw,240px)", right: "-3%", top: "-2%", opacity: 0.55 }} aria-hidden="true">rooms</div>
      <div style={{ position: "relative", maxWidth: 640, margin: "0 auto 50px", textAlign: "center", zIndex: 1 }}>
        <div className="mlabel" style={{ marginBottom: 14 }}>· explore lands ·</div>
        <h2 style={{ fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 0.92, fontSize: "clamp(40px,7vw,86px)", textTransform: "uppercase" }}>No two rooms<br />alike.</h2>
        <p className="lead" style={{ fontSize: "clamp(16px,2vw,19px)", marginTop: 18 }}>
          No two are alike. Yours shouldn&apos;t be either.
        </p>
      </div>
      <div className="grid" style={{ position: "relative", zIndex: 1 }}>
        {Array.from({ length: count }, (_, i) => <SpaceCard key={i} rank={i + 1} />)}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 42, position: "relative", zIndex: 1 }}>
        {!expanded
          ? <button className="btn btn-dark" onClick={() => setExpanded(true)}>Explore more spaces</button>
          : <a href="#" className="btn btn-ghost">See everything →</a>}
      </div>
      <p style={{ textAlign: "center", marginTop: 18, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.5px", color: "var(--ink-3)" }}>
        live · most-viewed spaces load here
      </p>
    </section>
  );
}

/* ─────────── pricing ─────────── */
const PLANS = [
  { name: "Free",     price: "$0", sub: "to start",  feat: false, cta: "Claim your land",
    perks: ["Your handle + space", "The core blocks", "Listed in explore"] },
  { name: "Lifetime", price: "$—", sub: "one-time",  feat: true,  cta: "Get lifetime",
    perks: ["Everything in Free", "Unlimited blocks & storage", "Custom domain", "Pay once, keep forever"] },
  { name: "Premium",  price: "$—", sub: "/ mo",      feat: false, cta: "Go premium",
    perks: ["Everything in Lifetime", "Rare decorations & tools", "Visitor insights"] },
];
function PricingCard({ p }: { p: typeof PLANS[number] }) {
  return (
    <div className={"plan" + (p.feat ? " feat" : "")}>
      {p.feat && <span className="plan-tag">most popular</span>}
      <div className="plan-name">{p.name}</div>
      <div className="plan-price"><b>{p.price}</b><span>{p.sub}</span></div>
      <div style={{ marginTop: 22, flex: 1 }}>
        {p.perks.map((perk, i) => (
          <div className="perk" key={i}><span className="dot" /><span style={{ fontSize: 14.5, color: "var(--ink-2)", letterSpacing: "-0.01em" }}>{perk}</span></div>
        ))}
      </div>
      <button className={"btn " + (p.feat ? "btn-dark" : "btn-glass")} style={{ marginTop: 24, width: "100%" }}>{p.cta}</button>
    </div>
  );
}
function Pricing() {
  return (
    <section className="wrap rev" style={{ padding: "30px 32px 40px" }}>
      <div style={{ textAlign: "center", maxWidth: 540, margin: "0 auto 46px" }}>
        <span className="mlabel">· pricing ·</span>
        <h2 style={{ fontWeight: 600, letterSpacing: "-0.035em", lineHeight: 0.95, fontSize: "clamp(32px,5vw,60px)", textTransform: "uppercase", marginTop: 14 }}>Start free.<br />Keep what&apos;s yours.</h2>
      </div>
      <div className="plans">
        {PLANS.map(p => <PricingCard key={p.name} p={p} />)}
      </div>
      <p style={{ textAlign: "center", marginTop: 18, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.5px", color: "var(--ink-3)" }}>
        tiers &amp; pricing to be finalized
      </p>
    </section>
  );
}

/* ─────────── final CTA + footer ─────────── */
function FinalCTA() {
  return (
    <section className="rev" style={{ position: "relative", padding: "120px 32px 60px", textAlign: "center", overflow: "hidden" }}>
      <div className="aura aura-pink" style={{ width: 600, height: 460, left: "50%", top: "10%", transform: "translateX(-50%)", opacity: 0.5 }} aria-hidden="true" />
      <div className="wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
        <img src="/logo.png" alt="" style={{ width: 64, height: "auto", marginBottom: 22 }} />
        <h2 style={{ fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 0.92, fontSize: "clamp(38px,7vw,92px)", textTransform: "uppercase", maxWidth: 820 }}>
          Make it <span className="gradtext">yours.</span>
        </h2>
        <div style={{ marginTop: 34, display: "flex", justifyContent: "center", width: "100%" }}>
          <ClaimField id="final-claim" />
        </div>
      </div>
      <footer style={{ marginTop: 110, paddingTop: 26, borderTop: "1px solid var(--hair)", maxWidth: 1116, marginInline: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div className="brand"><img src="/logo.png" alt="" style={{ width: 22 }} /><span style={{ fontSize: 15 }}>myLand</span></div>
        <div style={{ display: "flex", gap: 22, fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "1px", color: "var(--ink-3)" }}>
          <a href="#">about</a><a href="#">privacy</a><a href="#">terms</a><span>myland.lol</span>
        </div>
      </footer>
    </section>
  );
}

/* ─────────── reveal on scroll ─────────── */
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll(".rev").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function HomePage() {
  useReveal();
  return (
    <div className="landing-root">
      <Sky />
      <div className="dots" />
      <Topbar />
      <Hero />
      <Explore />
      <Pricing />
      <FinalCTA />
    </div>
  );
}
