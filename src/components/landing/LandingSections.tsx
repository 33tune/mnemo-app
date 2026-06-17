"use client";
import { useState, useEffect } from "react";
import { GifEl, MediaEl, NoteEl, LinkPillEl, GuestbookEl } from "./LandingCanvas";
import { GB_FEED, GALLERY, PLANS, type GallerySpace, type GalleryElDef, type PlanDef } from "./LandingData";
import { HandleField } from "./LandingHero";

export function Topbar() {
  const [scrolled, setScrolled] = useState(false);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    const id = setInterval(() => setPulse(p => !p), 2800);
    return () => { window.removeEventListener("scroll", on); clearInterval(id); };
  }, []);
  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px clamp(22px,4vw,48px)",
      background: scrolled ? "rgba(10,10,12,0.72)" : "transparent",
      backdropFilter: scrolled ? "blur(18px)" : "none", WebkitBackdropFilter: scrolled ? "blur(18px)" : "none",
      borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      transition: "all .3s ease",
    }}>
      <a href="#hero" style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <img src="/logo.png" alt="myLand" style={{ width: 34, height: "auto", filter: pulse ? "drop-shadow(0 0 10px rgba(255,64,141,0.6))" : "none", transition: "filter 1.6s ease" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: 4, color: "var(--text)" }}>myLand</span>
      </a>
      <nav style={{ display: "flex", alignItems: "center", gap: "clamp(14px,2.5vw,26px)" }}>
        <a href="#gallery" className="btn btn-ghost desk-only" style={{ padding: 0 }}>explore</a>
        <a href="#" className="btn btn-ghost desk-only" style={{ padding: 0 }}>sign in</a>
        <a href="#claim" className="btn btn-primary" style={{ padding: "10px 18px" }}>claim your space</a>
      </nav>
    </header>
  );
}

function KitObject({ label, rot, children }: { label: string; rot: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div className="floaty2" style={{ transform: `rotate(${rot}deg)`, "--r": rot + "deg" } as React.CSSProperties}>{children}</div>
      <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, color: "var(--dim)", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function MiniProfile() {
  return (
    <div className="art art-noir" style={{ width: 116, height: 150, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 18, boxShadow: "0 16px 36px -18px rgba(0,0,0,0.8)" }}>
      <div className="tile-grain" />
      <span className="art art-rose" style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)" }} />
      <div style={{ width: 56, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.6)", marginTop: 12 }} />
      <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)", marginTop: 7 }} />
      <div style={{ width: 64, height: 16, borderRadius: 5, background: "rgba(212,240,196,0.18)", marginTop: "auto", marginBottom: 14 }} />
    </div>
  );
}

function MiniGuestbook() {
  return (
    <div style={{ width: 134, height: 150, borderRadius: 12, background: "rgba(13,12,17,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", padding: 11, boxShadow: "0 16px 36px -18px rgba(0,0,0,0.8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%,rgba(232,224,212,0.9),rgba(180,160,130,0.4))" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 6.5, letterSpacing: 2, color: "rgba(232,224,212,0.5)", textTransform: "uppercase" }}>guestbook</span>
      </div>
      {["was here ♡", "love this corner", "signing :)"].map((t, i) => (
        <div key={i} style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 9.5, color: "rgba(232,224,212,0.7)", padding: "5px 0", borderBottom: i < 2 ? "1px solid rgba(232,224,212,0.07)" : "none" }}>{t}</div>
      ))}
    </div>
  );
}

export function KitSection() {
  return (
    <section className="section reveal" style={{ padding: "120px 48px 110px", textAlign: "center" }}>
      <span className="kicker">the kit</span>
      <h2 className="display" style={{ fontSize: "clamp(34px,4.5vw,54px)", color: "#fff", marginTop: 16 }}>Furnish your space.</h2>
      <p style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--text-2)", marginTop: 16, maxWidth: 440, marginInline: "auto", lineHeight: 1.5 }}>
        Drop in whatever you are. Arrange it like a room — not a résumé.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "clamp(26px,4vw,52px)", marginTop: 64, alignItems: "flex-end" }}>
        <KitObject label="profile" rot={-3}><MiniProfile /></KitObject>
        <KitObject label="images & gifs" rot={2}><GifEl data={{ gif: "gif-aura", w: 120, h: 120 }} /></KitObject>
        <KitObject label="music" rot={-2}><MediaEl data={{ track: "Boards of Canada", artist: "Roygbiv", art: "art-sea", w: 200, h: 70 }} /></KitObject>
        <KitObject label="guestbook" rot={3}><MiniGuestbook /></KitObject>
        <KitObject label="notes" rot={-5}><NoteEl data={{ tone: "mint", text: "secret diary entry…", size: 12, w: 130, h: 96 }} /></KitObject>
        <KitObject label="links" rot={2}><LinkPillEl data={{ label: "my shop", art: "art-amber", w: 150 }} /></KitObject>
        <KitObject label="video" rot={-2}><GifEl data={{ gif: "gif-scan", w: 116, h: 132 }} /></KitObject>
      </div>
    </section>
  );
}

export function GuestbookSection() {
  return (
    <section className="reveal" style={{ background: "linear-gradient(to bottom,transparent,rgba(232,224,212,0.018),transparent)", padding: "70px 0" }}>
      <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 56 }}>
        <div className="gb-grid" style={{ display: "grid", gap: 56, alignItems: "center" }}>
          <div>
            <span className="kicker" style={{ color: "rgba(232,224,212,0.7)" }}>guestbook</span>
            <h2 className="display" style={{ fontSize: "clamp(36px,5vw,62px)", color: "#fff", marginTop: 18, lineHeight: 1.0 }}>
              People leave<br />traces here.
            </h2>
            <p className="serif-it" style={{ fontSize: 21, color: "rgba(232,224,212,0.78)", marginTop: 22, maxWidth: 420, lineHeight: 1.45 }}>
              Every visit leaves a mark. Your space remembers who passed through — and slowly fills with the people who&apos;ve been.
            </p>
            <div style={{ display: "flex", gap: 30, marginTop: 32, flexWrap: "wrap" }}>
              <div><div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 30, color: "#fff" }}>2,481</div><div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, color: "var(--dim)", textTransform: "uppercase", marginTop: 2 }}>marks left</div></div>
              <div><div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 30, color: "var(--mint)" }}>3</div><div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, color: "var(--dim)", textTransform: "uppercase", marginTop: 2 }}>here right now</div></div>
              <div><div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 30, color: "#fff" }}>&apos;24</div><div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, color: "var(--dim)", textTransform: "uppercase", marginTop: 2 }}>since</div></div>
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "center", minHeight: 420 }}>
            <div style={{ position: "relative", width: 300, height: 420 }}>
              <GuestbookEl data={{ total: "2,481", messages: GB_FEED, w: 300, h: 420 }} />
              <div className="floaty2" style={{ position: "absolute", top: -26, right: -40, transform: "rotate(8deg)", "--r": "8deg", zIndex: 5 } as React.CSSProperties}>
                <NoteEl data={{ tone: "pink", text: "happy bday!! 🎂", size: 13, w: 130, h: 80 }} />
              </div>
              <div className="floaty2" style={{ position: "absolute", bottom: 30, left: -52, transform: "rotate(-7deg)", "--r": "-7deg", zIndex: 5 } as React.CSSProperties}>
                <GifEl data={{ gif: "gif-aura", w: 92, h: 92 }} />
              </div>
              <div className="floaty2" style={{ position: "absolute", bottom: -24, right: -30, transform: "rotate(5deg)", "--r": "5deg", zIndex: 5 } as React.CSSProperties}>
                <NoteEl data={{ tone: "", text: "was here ♡", size: 13, w: 110, h: 66 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media(min-width:861px){.gb-grid{grid-template-columns:1fr 0.95fr !important;}}`}</style>
    </section>
  );
}

function miniStyle(e: GalleryElDef): React.CSSProperties {
  const base: React.CSSProperties = { position: "absolute", left: e.x, top: e.y, width: e.w, height: e.h, borderRadius: e.r ?? 6, transform: `rotate(${e.t || 0}deg)`, overflow: "hidden" };
  if (e.cls === "glass") return { ...base, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(6px)" };
  if (e.cls === "pill") return { ...base, height: e.h, borderRadius: 20, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" };
  if (e.cls === "note-mini") return { ...base, background: "linear-gradient(170deg,#f4e58c,#e8d35e)", boxShadow: "0 6px 14px -8px rgba(0,0,0,0.5)" };
  if (e.cls === "code") return { ...base, background: "#0c0d12", border: "1px solid rgba(255,255,255,0.1)" };
  if (e.cls === "grid6") return { ...base, background: "#fff", padding: 3, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 };
  if (e.cls === "mediawin") return { ...base, background: "#0a0a0d", border: "1px solid rgba(255,255,255,0.14)" };
  if (e.cls === "ascii") return { ...base, background: "rgba(255,255,255,0.9)", overflow: "hidden" };
  if (e.cls === "heartbig") return { ...base, background: "none", overflow: "visible", borderRadius: 0 };
  return { ...base, boxShadow: "0 8px 18px -10px rgba(0,0,0,0.55)" };
}

const GRID6 = ["scene-portrait", "scene-dune", "riso-2", "scene-fog", "riso-3", "scene-night"];

function MiniCode() {
  return (
    <div style={{ padding: "11px 9px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ height: 4, width: "68%", borderRadius: 2, background: "#c98fff" }} />
      <div style={{ height: 4, width: "48%", borderRadius: 2, background: "#9fd0ff", marginLeft: 9 }} />
      <div style={{ height: 4, width: "58%", borderRadius: 2, background: "#d4f0c4", marginLeft: 9 }} />
      <div style={{ height: 4, width: "38%", borderRadius: 2, background: "#f0c33a" }} />
    </div>
  );
}

function MiniTileInner({ cls }: { cls: string }) {
  if (cls === "gif-aura") return <div className="spin" />;
  if (cls === "gif-scan") return <div className="line" />;
  if (cls === "code") return <MiniCode />;
  if (cls === "grid6") return <>{GRID6.map((g, i) => <span key={i} className={"art " + g} style={{ borderRadius: 2 }} />)}</>;
  if (cls === "mediawin") return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 12, background: "#000", display: "flex", alignItems: "center", paddingLeft: 5, gap: 3 }}>
        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ff5a5a" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 5, color: "rgba(255,255,255,0.6)" }}>MEDIA</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 6, letterSpacing: 1, color: "rgba(255,255,255,0.3)" }}>NO SIGNAL</div>
    </div>
  );
  if (cls === "ascii") return <pre style={{ margin: 0, fontFamily: "var(--mono)", fontSize: 5, lineHeight: 1.05, color: "#2a2a2a", padding: 4, whiteSpace: "pre" }}>{`  /\\_/\\\n ( o.o )\n  > ^ <\n /|   |\\\n  ^   ^`}</pre>;
  if (cls === "heartbig") return <div className="stk stk-heart" style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 38% 30%,#ff7a4a,#c01818)" }} />;
  return null;
}

function MiniSpace({ s }: { s: GallerySpace }) {
  const [hov, setHov] = useState(false);
  const [m, setM] = useState({ x: 0.5, y: 0.5 });
  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setM({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  };
  const px = hov ? (m.x - 0.5) * -16 : 0, py = hov ? (m.y - 0.5) * -10 : 0;
  return (
    <a href="#" onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setM({ x: .5, y: .5 }); }} onMouseMove={onMove}
      style={{ position: "relative", display: "block", borderRadius: 14, overflow: "hidden", border: `1px solid ${hov ? "rgba(255,255,255,0.16)" : "var(--border)"}`, boxShadow: hov ? "0 22px 50px -22px rgba(0,0,0,0.8)" : "0 4px 18px rgba(0,0,0,0.4)", transform: hov ? "scale(1.025)" : "scale(1)", transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease", cursor: "pointer" }}>
      <div style={{ position: "relative", height: 200, background: s.bg, overflow: "hidden" }}>
        {s.wall && <div className={"wall " + s.wall} />}
        <div className="tile-grain" style={{ opacity: 0.3 }} />
        <div style={{ position: "absolute", inset: 0, transform: `translate(${px}px,${py}px) scale(${hov ? 1.05 : 1})`, transition: hov ? "transform .08s linear" : "transform .35s ease", filter: hov ? "brightness(1.08)" : "none" }}>
          {s.els.map((e: GalleryElDef, i: number) => {
            if (e.kao) return <div key={i} className="kao" style={{ left: e.x, top: e.y, fontSize: e.size || 12, color: e.color || "#fff" }}>{e.kao}</div>;
            if (e.cls === "star" || e.cls === "heart" || e.cls === "cross")
              return <div key={i} className={"stk stk-" + e.cls} style={{ position: "absolute", left: e.x, top: e.y, width: e.w, height: e.h, transform: `rotate(${e.t || 0}deg)` }} />;
            const c = e.cls || "";
            const isArt = c.startsWith("art-") || c.startsWith("gif-");
            const isScene = c.startsWith("scene-");
            const isRiso = c.startsWith("riso-");
            const cn = isScene ? "art film " + c : isRiso ? "art halftone " + c : isArt ? "art " + c : "";
            return <div key={i} className={cn} style={miniStyle(e)}><MiniTileInner cls={c} /></div>;
          })}
        </div>
        <div style={{ position: "absolute", inset: 0, background: hov ? "linear-gradient(to top,rgba(0,0,0,0.82),rgba(0,0,0,0.05) 52%,transparent)" : "linear-gradient(to top,rgba(0,0,0,0.68),transparent 52%)", transition: "background .2s" }} />
        <div style={{ position: "absolute", top: 11, left: 11, fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.82)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "4px 9px" }}>{s.role}</div>
        <div style={{ position: "absolute", top: 11, right: 11, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "4px 9px" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: 0.5, color: s.accent }}>{s.marks.toLocaleString()} marks</span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 14px 13px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 15, color: "#fff" }}>{s.name}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>@{s.handle}</div>
        </div>
        {s.online && <span className="pdot" />}
      </div>
    </a>
  );
}

export function GallerySection() {
  return (
    <section id="gallery" className="section reveal" style={{ padding: "110px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 40 }}>
        <div>
          <span className="kicker">explore</span>
          <h2 className="display" style={{ fontSize: "clamp(34px,4.5vw,54px)", color: "#fff", marginTop: 14 }}>No two rooms alike.</h2>
          <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--text-2)", marginTop: 12 }}>Kawaii, gothic, cursed, Y2K — whatever you are. Wander in.</p>
        </div>
        <a href="#" className="btn btn-ghost" style={{ padding: 0 }}>see all spaces →</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 22 }}>
        {GALLERY.map(s => <MiniSpace key={s.handle} s={s} />)}
      </div>
    </section>
  );
}

function PlanCard({ p }: { p: PlanDef }) {
  return (
    <div style={{
      position: "relative", flex: "1 1 240px", maxWidth: 320,
      background: p.featured ? "rgba(212,240,196,0.05)" : "var(--surface)",
      border: p.featured ? "1px solid rgba(212,240,196,0.3)" : "1px solid var(--border)",
      borderRadius: 14, padding: "26px 24px", display: "flex", flexDirection: "column",
      opacity: p.soon ? 0.78 : 1, borderStyle: p.soon ? "dashed" : "solid",
    }}>
      {p.featured && <span style={{ position: "absolute", top: -10, left: 24, background: "var(--mint)", color: "#0a0a0c", fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", padding: "4px 9px", borderRadius: 5 }}>recommended</span>}
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: p.featured ? "var(--mint)" : "var(--text-2)" }}>{p.name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
        <span className="display" style={{ fontSize: 38, color: "#fff" }}>{p.price}</span>
        {p.sub && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)" }}>{p.sub}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 22, flex: 1 }}>
        {p.perks.map((perk, i) => (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.featured ? "var(--mint)" : "var(--dim)", marginTop: 7, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.4 }}>{perk}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ marginTop: 24, width: "100%", ...(p.featured ? { background: "rgba(212,240,196,0.12)", borderColor: "rgba(212,240,196,0.4)", color: "#fff" } : {}) }}>{p.cta}</button>
    </div>
  );
}

export function PricingSection() {
  return (
    <section className="section reveal" style={{ padding: "100px 48px", textAlign: "center" }}>
      <span className="kicker">room to grow</span>
      <h2 className="display" style={{ fontSize: "clamp(32px,4vw,48px)", color: "#fff", marginTop: 14 }}>Start with a plot.</h2>
      <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--text-2)", marginTop: 13, maxWidth: 420, marginInline: "auto", lineHeight: 1.5 }}>
        Free, forever. Add room, decorations and tools whenever you want them.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "stretch", gap: 18, marginTop: 50 }}>
        {PLANS.map(p => <PlanCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section id="claim" className="reveal gridlines" style={{ position: "relative", padding: "150px 48px 70px", textAlign: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 80% at 50% 40%,rgba(212,240,196,0.05),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
        <img src="/logo.png" alt="myLand" style={{ width: 84, height: "auto", margin: "0 auto 22px", display: "block", filter: "drop-shadow(0 8px 26px rgba(255,64,141,0.32))" }} />
        <h2 className="serif-it" style={{ fontSize: "clamp(34px,5.5vw,66px)", color: "rgba(232,224,212,0.92)", lineHeight: 1.05 }}>The internet used to feel personal.</h2>
        <p className="display" style={{ fontSize: "clamp(26px,3.5vw,42px)", color: "#fff", marginTop: 18 }}>Make it personal again.</p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}><HandleField big /></div>
      </div>
      <footer style={{ position: "relative", marginTop: 130, paddingTop: 26, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, maxWidth: 1144, marginInline: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src="/logo.png" alt="" style={{ width: 28, height: "auto" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: 3, color: "var(--text-2)" }}>myLand</span>
        </div>
        <div style={{ display: "flex", gap: 22, fontFamily: "var(--mono)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "var(--dim)" }}>
          <a href="#">about</a><a href="#">privacy</a><a href="#">terms</a><span>the personal web</span><span>© 2026</span>
        </div>
      </footer>
    </section>
  );
}
