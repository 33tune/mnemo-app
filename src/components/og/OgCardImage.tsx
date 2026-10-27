/**
 * The link preview's picture (1200×630): the card on the room's color, as
 * ogCardOf() describes it. JSX for next/og (Satori): flex layout and inline
 * styles only.
 */
import type { OgCard } from "@/lib/ogCard";

export const OG_SIZE = { width: 1200, height: 630 };

export function OgCardImage({ og }: { og: OgCard }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: og.roomBg }}>
      {og.roomImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={og.roomImage} alt="" width={1200} height={630} style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, objectFit: "cover" }} />
      ) : null}
      <div style={{
        position: "relative", display: "flex", alignItems: "center", gap: 48, width: 860, height: 420, padding: "0 56px",
        borderRadius: og.radius * 1.4, background: og.bg, overflow: "hidden",
        boxShadow: "0 40px 90px -30px rgba(0,0,0,.75)",
      }}>
        {og.bgImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={og.bgImage} alt="" width={860} height={420} style={{ position: "absolute", left: 0, top: 0, width: 860, height: 420, objectFit: "cover" }} />
        ) : null}
        {og.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={og.photo} alt="" width={240} height={240} style={{ width: 240, height: 240, borderRadius: og.pfpRadius, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 240, height: 240, borderRadius: og.pfpRadius, background: "rgba(127,127,127,.25)", flexShrink: 0, display: "flex" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", fontSize: og.name.length > 18 ? 52 : 68, fontWeight: 700, lineHeight: 1.05, color: og.nameColor, letterSpacing: "-0.02em" }}>{og.name}</div>
          <div style={{ display: "flex", fontSize: 32, color: og.handleColor, opacity: 0.7 }}>@{og.handle}</div>
          {og.phrase ? <div style={{ display: "flex", fontSize: 28, color: og.textColor, opacity: 0.6, marginTop: 6 }}>{og.phrase}</div> : null}
        </div>
      </div>
      <div style={{
        position: "absolute", right: 36, bottom: 30, display: "flex", alignItems: "center", height: 46, padding: "0 20px",
        borderRadius: 999, background: "rgba(14,12,18,.72)", color: "#F6F3F8", fontSize: 24,
      }}>
        myland.lol/<span style={{ color: "#FF4F94" }}>{og.handle}</span>
      </div>
    </div>
  );
}

/** No public card: the myLand mark with the name. */
export function OgFallbackImage({ handle }: { handle: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0E0C12", color: "#F6F3F8" }}>
      <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: "-0.04em" }}>myLand</div>
      <div style={{ display: "flex", fontSize: 40, marginTop: 12 }}>myland.lol/<span style={{ color: "#FF4F94" }}>{handle}</span></div>
    </div>
  );
}
