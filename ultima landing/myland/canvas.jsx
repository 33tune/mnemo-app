/* ════════ myLand canvas elements — faithful recreations of the real app widgets ════════ */
const { useState, useEffect, useRef } = React;

/* ── gradient avatar (crafted, never stock) ── */
function Avatar({ art = "art-dusk", size = 64, ring = "rgba(255,255,255,0.15)" }) {
  return (
    <div className={"art " + art} style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${ring}`, flexShrink: 0, position: "relative" }}>
      <div className="tile-grain" />
    </div>
  );
}

/* ── art image tile ── */
function ImageEl({ data }) {
  return (
    <div className={"cel art " + data.art} style={{ width: data.w, height: data.h, borderRadius: data.radius ?? 10, boxShadow: "0 18px 44px -20px rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="tile-grain" />
      {data.caption && (
        <div style={{ position: "absolute", left: 10, bottom: 9, fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{data.caption}</div>
      )}
    </div>
  );
}

/* ── animated "gif" tile ── */
function GifEl({ data }) {
  const kind = data.gif || "gif-aura";
  return (
    <div className={"cel art " + kind} style={{ width: data.w, height: data.h, borderRadius: data.radius ?? 10, overflow: "hidden", boxShadow: "0 18px 44px -20px rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {kind === "gif-aura" && <div className="spin" />}
      {kind === "gif-scan" && <div className="line" />}
      <div className="tile-grain" />
      <div style={{ position: "absolute", top: 8, left: 9, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff5a5a", boxShadow: "0 0 6px #ff5a5a" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 7, letterSpacing: 2, color: "rgba(255,255,255,0.78)" }}>GIF</span>
      </div>
    </div>
  );
}

/* ── profile card (recreates ProfileCard.tsx, published state) ── */
function ProfileCardEl({ data }) {
  const [following, setFollowing] = useState(data.following ?? false);
  return (
    <div className="cel" style={{ width: data.w, height: data.h }}>
      <div className={"art " + (data.art || "art-noir")} style={{ position: "absolute", inset: 0, borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 26px 60px -24px rgba(0,0,0,0.85)", overflow: "hidden" }}>
        <div className="tile-grain" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0.12),rgba(0,0,0,0.55))" }} />
      </div>
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "26px 18px 18px", textAlign: "center" }}>
        <Avatar art={data.avatarArt || "art-dusk"} size={76} />
        <div style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 19, color: "#fff", marginTop: 13, letterSpacing: "-0.01em" }}>{data.name}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>@{data.handle}</div>
        {data.status && <div style={{ fontFamily: "var(--sans)", fontSize: 11.5, color: "rgba(255,255,255,0.72)", marginTop: 9, lineHeight: 1.4, maxWidth: 180 }}>{data.status}</div>}
        <div style={{ display: "flex", gap: 14, marginTop: 13, fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
          <span><b style={{ color: "#fff" }}>{data.followers}</b> followers</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span><b style={{ color: "#fff" }}>{data.following_n}</b> following</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 16, width: "100%", justifyContent: "center" }}>
          <button onClick={() => setFollowing(f => !f)}
            style={{ padding: "9px 16px", borderRadius: 9, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              background: following ? "rgba(212,240,196,0.16)" : "rgba(255,255,255,0.1)",
              color: following ? "var(--mint)" : "#fff",
              outline: following ? "1px solid rgba(212,240,196,0.3)" : "none", transition: "all .15s ease" }}>
            {following ? "following" : "follow"}
          </button>
          <button style={{ padding: "9px 14px", borderRadius: 9, fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>message</button>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 10, left: 13, display: "flex", alignItems: "center", gap: 6 }}>
        <span className="pdot" style={{ width: 5, height: 5 }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 7, letterSpacing: 2, textTransform: "uppercase", color: "rgba(212,240,196,0.8)" }}>online now</span>
      </div>
    </div>
  );
}

/* ── guestbook (recreates GuestbookWidget.tsx) ── */
function GuestbookEl({ data }) {
  const msgs = data.messages || [];
  return (
    <div className="cel" style={{ width: data.w, height: data.h }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: "rgba(13,12,17,0.82)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 16px 54px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ padding: "11px 14px 10px", borderBottom: "1px solid rgba(232,224,212,0.09)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(232,224,212,0.9), rgba(180,160,130,0.4))", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 3.5, color: "rgba(232,224,212,0.5)", textTransform: "uppercase" }}>guestbook</span>
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 7, letterSpacing: 1, color: "rgba(232,224,212,0.25)" }}>{data.total ?? msgs.length} entries</span>
        </div>
        {/* messages */}
        <div style={{ flex: 1, overflow: "hidden", padding: "11px 13px 4px", display: "flex", flexDirection: "column", gap: 9 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ background: i === 0 ? "rgba(232,224,212,0.05)" : "rgba(232,224,212,0.025)", border: `1px solid ${i === 0 ? "rgba(232,224,212,0.10)" : "rgba(232,224,212,0.05)"}`, borderRadius: 8, padding: "9px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={"art " + (m.art || "art-violet")} style={{ width: 13, height: 13, borderRadius: "50%", opacity: 0.9 }} />
                  <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 1.5, color: "rgba(232,224,212,0.55)" }}>{m.name}</span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 7, color: "rgba(232,224,212,0.25)" }}>{m.time}</span>
              </div>
              <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 12.5, color: "rgba(232,224,212,0.82)", lineHeight: 1.5, margin: 0 }}>{m.text}</p>
            </div>
          ))}
        </div>
        {/* compose */}
        <div style={{ padding: "8px 13px 12px", flexShrink: 0 }}>
          <div style={{ height: 1, background: "linear-gradient(to right,transparent,rgba(232,224,212,0.12),transparent)", marginBottom: 9 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, background: "rgba(232,224,212,0.04)", border: "1px solid rgba(232,224,212,0.09)", borderRadius: 7, padding: "8px 10px", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 11.5, color: "rgba(232,224,212,0.3)" }}>leave a note…</div>
            <button style={{ background: "rgba(232,224,212,0.08)", border: "1px solid rgba(232,224,212,0.22)", borderRadius: 6, padding: "7px 13px", fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 1.5, color: "rgba(232,224,212,0.75)", textTransform: "uppercase" }}>sign</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── media card (recreates MediaCardWidget.tsx — faux spotify now-playing) ── */
function MediaEl({ data }) {
  const [t, setT] = useState(38);
  useEffect(() => { const id = setInterval(() => setT(v => (v + 0.4) % 100), 240); return () => clearInterval(id); }, []);
  return (
    <div className="cel" style={{ width: data.w, height: data.h }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 5, background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 8px 26px rgba(0,0,0,0.65)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 28, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", background: "#07070a", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(30,215,96,0.85)", boxShadow: "0 0 6px rgba(30,215,96,0.6)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 7.5, letterSpacing: 2, color: "rgba(255,255,255,0.6)" }}>SPOTIFY / TRACK</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 11, padding: "0 12px" }}>
          <div className={"art " + (data.art || "art-ember")} style={{ width: 44, height: 44, borderRadius: 4, flexShrink: 0, position: "relative" }}><div className="tile-grain" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 12, color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.track}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{data.artist}</div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.1)", marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: t + "%", background: "rgba(30,215,96,0.7)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── sticky note ── */
function NoteEl({ data }) {
  return (
    <div className={"cel note " + (data.tone || "")} style={{ width: data.w, height: data.h, borderRadius: 4, padding: "13px 15px", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: data.size || 14, lineHeight: 1.45, display: "flex", alignItems: "center" }}>
      {data.text}
    </div>
  );
}

/* ── link pill ── */
function LinkPillEl({ data }) {
  return (
    <div className="cel lpill" style={{ width: data.w }}>
      <span className={"art " + (data.art || "art-ice")} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0 }} />
      <span style={{ flex: 1, fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{data.label}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
    </div>
  );
}

/* ── free editorial text ── */
function TextEl({ data }) {
  return (
    <div className="cel" style={{ width: data.w, fontFamily: data.font === "display" ? "var(--display)" : "var(--mono)", fontWeight: data.font === "display" ? 800 : 400, fontSize: data.size || 40, lineHeight: 1, color: data.color || "rgba(255,255,255,0.9)", letterSpacing: data.font === "display" ? "-0.02em" : "2px", textTransform: data.upper ? "uppercase" : "none" }}>
      {data.text}
    </div>
  );
}

/* ── film-framed photograph (duotone scene) ── */
function PhotoEl({ data }) {
  return (
    <div className={"cel art film " + (data.scene || "scene-night")} style={{ width: data.w, height: data.h, borderRadius: 6, boxShadow: "0 20px 46px -20px rgba(0,0,0,0.85)" }}>
      <div className="tile-grain" />
      <div style={{ position: "absolute", left: 10, top: 13, fontFamily: "var(--mono)", fontSize: 7, letterSpacing: 1.5, color: "rgba(255,255,255,0.62)" }}>{data.film || "35MM"}</div>
      {data.caption && <div style={{ position: "absolute", left: 10, bottom: 13, fontFamily: "var(--mono)", fontSize: 8, letterSpacing: 1.2, color: "rgba(255,255,255,0.88)", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{data.caption}</div>}
    </div>
  );
}

/* ── code card (developer rooms) ── */
const CODE_LINES = [
  '<span style="color:#c98fff">const</span> <span style="color:#9fd0ff">room</span> = <span style="color:#d4f0c4">mine</span>();',
  '<span style="color:#9fd0ff">room</span>.<span style="color:#f0c33a">paint</span>(<span style="color:#e88fa6">\'dusk\'</span>);',
  '<span style="color:#9fd0ff">room</span>.<span style="color:#f0c33a">open</span>(); <span style="color:#555">// hi :)</span>',
];
function CodeEl({ data }) {
  const lines = data.lines || CODE_LINES;
  return (
    <div className="cel" style={{ width: data.w, height: data.h }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 8, background: "#0c0d12", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 16px 38px -16px rgba(0,0,0,0.82)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 24, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#28c840" }} />
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 7, letterSpacing: 1, color: "rgba(255,255,255,0.3)" }}>{data.file || "room.js"}</span>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 9, lineHeight: 1.8, color: "rgba(255,255,255,0.8)" }}>
          {lines.map((ln, i) => (
            <div key={i} style={{ display: "flex", gap: 9 }}>
              <span style={{ color: "rgba(255,255,255,0.16)", width: 8, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
              <span dangerouslySetInnerHTML={{ __html: ln }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── glitter sticker (star / heart / cross) ── */
function StickerEl({ data }) {
  return (
    <div className="cel" style={{ width: data.w, height: data.h }}>
      <div className={"stk stk-" + (data.shape || "star")} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

/* ── kaomoji / ascii text bit ── */
function KaoEl({ data }) {
  return (
    <div className="cel" style={{ width: data.w || "auto" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: data.size || 20, color: data.color || "#fff", textShadow: "0 1px 6px rgba(0,0,0,0.55)", whiteSpace: "nowrap", letterSpacing: 0.5 }}>{data.text}</span>
    </div>
  );
}

/* ── hand-authored welcome banner ── */
function BannerEl({ data }) {
  return (
    <div className="cel" style={{ width: data.w }}>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: data.size || 34, color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,0.6)", lineHeight: 1.04, letterSpacing: "0.01em" }}>{data.text}</div>
      {data.sub && <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: 3, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginTop: 7 }}>{data.sub}</div>}
    </div>
  );
}

/* ── dispatcher ── */
function CanvasEl({ el }) {
  switch (el.type) {
    case "profile": return <ProfileCardEl data={el} />;
    case "guestbook": return <GuestbookEl data={el} />;
    case "media": return <MediaEl data={el} />;
    case "image": return <ImageEl data={el} />;
    case "photo": return <PhotoEl data={el} />;
    case "code": return <CodeEl data={el} />;
    case "gif": return <GifEl data={el} />;
    case "note": return <NoteEl data={el} />;
    case "link": return <LinkPillEl data={el} />;
    case "text": return <TextEl data={el} />;
    case "sticker": return <StickerEl data={el} />;
    case "kao": return <KaoEl data={el} />;
    case "banner": return <BannerEl data={el} />;
    default: return null;
  }
}

Object.assign(window, { Avatar, ImageEl, GifEl, PhotoEl, CodeEl, ProfileCardEl, GuestbookEl, MediaEl, NoteEl, LinkPillEl, TextEl, StickerEl, KaoEl, BannerEl, CanvasEl });
