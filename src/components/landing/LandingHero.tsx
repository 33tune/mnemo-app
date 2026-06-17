"use client";
import { useState, useEffect, useRef } from "react";
import { CanvasEl } from "./LandingCanvas";
import { HERO_ELS, type CanvasElDef } from "./LandingData";

const RESERVED = new Set(["neve", "admin", "me", "myland", "home", "tomo", "sol"]);
const STAGE_W = 1240, STAGE_H = 720;

function useViewport() {
  const [v, setV] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 1280, h: typeof window !== "undefined" ? window.innerHeight : 800 });
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return v;
}

export function HandleField({ big }: { big?: boolean }) {
  const [val, setVal] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(raw: string) {
    const h = raw.toLowerCase().replace(/\s/g, "");
    setVal(h);
    if (tRef.current) clearTimeout(tRef.current);
    if (!h) { setStatus("idle"); return; }
    if (!/^[a-z0-9_-]{3,20}$/.test(h)) { setStatus("invalid"); return; }
    if (RESERVED.has(h)) { setStatus("checking"); tRef.current = setTimeout(() => setStatus("taken"), 480); return; }
    setStatus("checking");
    tRef.current = setTimeout(() => setStatus("ok"), 520);
  }

  const cls = status === "ok" ? "ok" : (status === "taken" || status === "invalid") ? "bad" : "";
  const hint = status === "checking" ? "checking…" : status === "ok" ? "available" : status === "taken" ? "taken" : status === "invalid" ? "a–z, 0–9, 3–20" : "";
  const hintColor = status === "ok" ? "var(--mint)" : (status === "taken" || status === "invalid") ? "rgba(255,120,100,0.9)" : "var(--dim)";

  return (
    <div style={{ width: "100%", maxWidth: big ? 460 : 420 }}>
      <div className={"handle " + cls}>
        <span className="pre">myland.app/</span>
        <input value={val} onChange={e => onChange(e.target.value)} placeholder="your-name" spellCheck={false} aria-label="choose your handle" />
        {status !== "idle" && <span className="stat" style={{ color: hintColor }}>{status === "ok" ? "✓" : status === "checking" ? "•••" : hint}</span>}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 13, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" style={status === "ok" ? { background: "rgba(212,240,196,0.12)", borderColor: "rgba(212,240,196,0.4)", color: "#fff" } : {}}>
          claim your space →
        </button>
        <a href="#gallery" className="btn btn-ghost">explore spaces</a>
      </div>
      {status === "ok" && <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--mint)", marginTop: 11, letterSpacing: 1 }}>myland.app/{val} is yours.</div>}
    </div>
  );
}

interface StageElProps {
  el: CanvasElDef;
  mouse: { x: number; y: number };
  motion: boolean;
}

function StageEl({ el, mouse, motion }: StageElProps) {
  const px = motion ? mouse.x * (el.depth ?? 0) * 30 : 0;
  const py = motion ? mouse.y * (el.depth ?? 0) * 30 : 0;
  const floatCls = motion && (el.type === "gif" || el.type === "note" || el.type === "sticker" || el.type === "kao") ? "floaty" : "";
  return (
    <div style={{ position: "absolute", left: el.x, top: el.y, transform: `translate(${px}px,${py}px)`, willChange: "transform", zIndex: el.z != null ? el.z : Math.round((el.depth ?? 0) * 10) }}>
      <div className={floatCls} style={{ transform: `rotate(${el.rot || 0}deg)`, "--r": (el.rot || 0) + "deg" } as React.CSSProperties}>
        <CanvasEl el={el} />
      </div>
    </div>
  );
}

function HeroStage({ vp }: { vp: { w: number; h: number } }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const raf = useRef<number>(0);
  const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = !reduced;

  useEffect(() => {
    if (!motion) return;
    function move(e: MouseEvent) {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        setMouse({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
      });
    }
    window.addEventListener("mousemove", move);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf.current); };
  }, [motion]);

  const scale = Math.min(Math.max(vp.w / 1280, 0.62), vp.w > 1380 ? 1.08 : 1);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "relative", width: STAGE_W, height: STAGE_H, transform: `scale(${scale}) translateX(4%)`, transformOrigin: "center" }}>
        {HERO_ELS.map(el => <StageEl key={el.id} el={el} mouse={mouse} motion={motion} />)}
      </div>
    </div>
  );
}

function HeroStageMobile() {
  const byId = Object.fromEntries(HERO_ELS.map(e => [e.id!, e])) as Record<string, CanvasElDef>;
  return (
    <div style={{ position: "relative", padding: "4px 0 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ alignSelf: "flex-start", marginLeft: 4, transform: "rotate(-1deg)" }}>
        <CanvasEl el={{ ...byId["banner"], w: 280, size: 27 }} />
      </div>
      <div style={{ position: "relative", transform: "rotate(-2deg)" }}>
        <CanvasEl el={{ ...byId["p1"], w: 238, h: 300 }} />
        <div style={{ position: "absolute", top: -12, right: -10, transform: "rotate(-12deg)" }}><CanvasEl el={{ ...byId["stk1"], w: 36, h: 36 }} /></div>
        <div style={{ position: "absolute", bottom: 24, left: -26 }}><CanvasEl el={{ ...byId["kao2"] }} /></div>
      </div>
      <div style={{ position: "relative", width: 290, height: 184 }}>
        <div style={{ position: "absolute", left: 2, top: 0, transform: "rotate(-5deg)" }}><CanvasEl el={{ ...byId["phBig"], w: 172, h: 150 }} /></div>
        <div style={{ position: "absolute", right: 2, top: 36, transform: "rotate(5deg)" }}><CanvasEl el={{ ...byId["ph2"], w: 150, h: 120 }} /></div>
        <div style={{ position: "absolute", left: 120, top: -12 }}><CanvasEl el={{ ...byId["kao1"], size: 21 }} /></div>
      </div>
      <div style={{ position: "relative", transform: "rotate(1deg)" }}>
        <CanvasEl el={{ ...byId["gb"], w: 288, h: 338 }} />
        <div style={{ position: "absolute", top: -18, right: -8, transform: "rotate(-8deg)" }}><CanvasEl el={{ ...byId["nPink"], w: 142, h: 78 }} /></div>
        <div style={{ position: "absolute", bottom: -16, left: -16, transform: "rotate(6deg)" }}><CanvasEl el={{ ...byId["gf1"], w: 84, h: 84 }} /></div>
      </div>
      <div style={{ transform: "rotate(-1.5deg)" }}><CanvasEl el={{ ...byId["m1"], w: 288, h: 80 }} /></div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ transform: "rotate(-3deg)" }}><CanvasEl el={{ ...byId["l1"], w: 162 }} /></div>
        <div style={{ transform: "rotate(2deg)" }}><CanvasEl el={{ ...byId["l2"], w: 140 }} /></div>
      </div>
    </div>
  );
}

function PresencePill() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 30, padding: "8px 15px", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
      <span className="pdot" />
      <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 0.3, color: "var(--text-2)" }}>3 people are in <span style={{ color: "var(--text)" }}>neve&apos;s room</span> right now</span>
    </div>
  );
}

export function Hero() {
  const vp = useViewport();
  const mobile = vp.w <= 860;
  return (
    <section id="hero" style={{ position: "relative", minHeight: mobile ? "auto" : "100vh", overflow: "hidden", paddingTop: mobile ? 78 : 0 }}>
      <div className="wall wall-dusk" style={{ position: "absolute", inset: 0, zIndex: 0 }} />
      {!mobile && <HeroStage vp={vp} />}
      {!mobile && <div className="hero-scrim" />}
      {!mobile && (
        <div style={{ position: "absolute", top: 92, left: "50%", transform: "translateX(-50%)", zIndex: 6 }}>
          <PresencePill />
        </div>
      )}

      <div className="section" style={{ position: "relative", zIndex: 5, minHeight: mobile ? "auto" : "100vh", display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: mobile ? 8 : 0, paddingBottom: mobile ? 8 : 0 }}>
        <div style={{ maxWidth: mobile ? "100%" : 460 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
            <span className="pdot" />
            <span className="eyebrow">make yourself at home</span>
          </div>
          <h1 className="display" style={{ fontSize: mobile ? "clamp(38px,11vw,54px)" : "clamp(46px,4.8vw,72px)", color: "#fff" }}>
            A room of your own<br />on the internet.
          </h1>
          <p style={{ fontFamily: "var(--sans)", fontSize: mobile ? 16 : 18, color: "var(--text-2)", marginTop: 20, maxWidth: 380, lineHeight: 1.5 }}>
            Decorate it. Fill it. <span style={{ color: "var(--text)" }}>Let people in.</span>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16 }}>
            <span style={{ width: 18, height: 1, background: "var(--dim)" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: 1.5, color: "var(--dim)", textTransform: "uppercase" }}>not a link in bio — a room</span>
          </div>
          <div style={{ marginTop: 26 }}><HandleField big /></div>
        </div>
      </div>

      {mobile && (
        <div className="section" style={{ display: "flex", justifyContent: "center", marginTop: 10, marginBottom: 2 }}>
          <PresencePill />
        </div>
      )}
      {mobile && <div className="section"><HeroStageMobile /></div>}

      {!mobile && (
        <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 3, color: "var(--ghost)", textTransform: "uppercase" }}>scroll</span>
          <span style={{ width: 1, height: 30, background: "linear-gradient(to bottom,var(--ghost),transparent)" }} />
        </div>
      )}
    </section>
  );
}
