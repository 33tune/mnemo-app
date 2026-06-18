"use client";
import "./landing.css";
import { useState, useEffect } from "react";

const TINTS = [
  "linear-gradient(150deg,#ffd9ec,#e9d9ef)",
  "linear-gradient(150deg,#e7dcef,#ffd0e6)",
  "linear-gradient(150deg,#dfe0ee,#f3d9ec)",
  "linear-gradient(150deg,#ffe0ef,#dcd6ea)",
  "linear-gradient(150deg,#ecd9f0,#ffd9e6)",
  "linear-gradient(150deg,#e2dcf0,#ffdcea)",
];

function ExploreCard({ rank }: { rank: number }) {
  return (
    <div className="scard">
      <div className="thumb" style={{ background: TINTS[(rank - 1) % TINTS.length] }}>
        <span className="rank">{rank}</span>
        <div className="thumb-ph">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.6" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span className="tag">real space</span>
        </div>
      </div>
      <div className="foot">
        <div>
          <span className="sk" style={{ width: 92, height: 11 }}></span>
          <div className="sub">@handle</div>
        </div>
        <div className="views">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="sk" style={{ width: 30, height: 9 }}></span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [handle1, setHandle1] = useState("");
  const [handle2, setHandle2] = useState("");
  const [gridCount, setGridCount] = useState(6);
  const [moreLabel, setMoreLabel] = useState("Explore");

  const isOk1 = /^[a-z0-9_-]{3,20}$/.test(handle1);
  const isOk2 = /^[a-z0-9_-]{3,20}$/.test(handle2);

  function handleInput1(e: React.ChangeEvent<HTMLInputElement>) {
    setHandle1(e.target.value.replace(/\s+/g, "").toLowerCase());
  }
  function handleInput2(e: React.ChangeEvent<HTMLInputElement>) {
    setHandle2(e.target.value.replace(/\s+/g, "").toLowerCase());
  }
  function handleExploreMore() {
    if (gridCount < 15) {
      setGridCount(15);
      setMoreLabel("See everything →");
    }
  }

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const items = Array.from(document.querySelectorAll(".float")) as HTMLElement[];
    let mx = 0, my = 0, sy = 0, raf = 0;

    function apply() {
      raf = 0;
      for (const el of items) {
        const d = parseFloat(el.getAttribute("data-depth") || "0") || 0;
        const k = d / 100;
        el.style.transform = `translate3d(${(-mx * d).toFixed(1)}px,${(-my * d + sy * k * 0.6).toFixed(1)}px,0)`;
      }
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(apply); }

    const onMove = (e: MouseEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; schedule(); };
    const onScroll = () => { sy = window.scrollY || 0; schedule(); };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return;
      mx = Math.max(-0.5, Math.min(0.5, (e.gamma || 0) / 45));
      my = Math.max(-0.5, Math.min(0.5, (e.beta || 0) / 90));
      schedule();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("deviceorientation", onTilt as EventListener, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("deviceorientation", onTilt as EventListener);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="landing-root">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="glow g3" />

      <header className="topbar">
        <a href="#top" className="brand">
          <img className="star" src="/landing/ld-star.png" alt="" />
          myLand
        </a>
        <nav className="topnav">
          <a href="#explore" className="tlink desk">Explore</a>
          <a href="#" className="tlink desk">Sign in</a>
          <a href="#claim" className="tlink" style={{ color: "var(--ink)", fontWeight: 500 }}>Claim →</a>
        </nav>
      </header>

      <main className="hero" id="top">
        {/* LEFT */}
        <section className="intro">
          <div className="eyebrow"><span className="ln"></span>myland.lol · make yourself at home</div>
          <h1 className="title">
            <span className="li">A space</span>{" "}
            <span className="li">that&apos;s <span className="yours">yours</span></span>
          </h1>
          <p className="lead">Build a page that feels like you — links, music, whatever. Make it yours.</p>

          <div className="claimwrap" id="claim">
            <div className={`claim${isOk1 ? " is-ok" : ""}`}>
              <span className="pre">myland.lol/</span>
              <input
                type="text"
                placeholder="your-name"
                spellCheck={false}
                autoComplete="off"
                aria-label="Choose your handle"
                value={handle1}
                onChange={handleInput1}
              />
              <span className="ok">available ✓</span>
            </div>
            <div className="cta-row">
              <button className="btn btn-chrome">Claim your land</button>
              <a href="#explore" className="btn btn-ghost">Explore lands <span className="arr">→</span></a>
            </div>
          </div>

          <div className="videowrap">
            <div className="vlabel"><span className="dot"></span>watch it in motion</div>
            <div className="video-slot">
              <img className="vcorner vc-tl" src="/landing/ld-vcorner.png" alt="" />
              <div className="vplay" aria-hidden="true"></div>
              <div className="vhint">your demo video goes here</div>
              <img className="vcorner vc-br" src="/landing/ld-vcorner.png" alt="" />
            </div>
          </div>
        </section>

        {/* RIGHT — profile cards collage */}
        <section className="stage" id="stage" aria-label="Featured myLand spaces">
          <div className="stage-label top">profile cards system</div>

          <div className="float f-starround orn" data-depth="50"><div className="float-inner"><img src="/landing/ld-starround.png" alt="" /></div></div>
          <div className="float f-tribal orn" data-depth="44"><div className="float-inner"><img src="/landing/ld-tribal.png" alt="" /></div></div>
          <div className="float f-starburst orn" data-depth="56"><div className="float-inner"><img src="/landing/ld-starburst.png" alt="" /></div></div>
          <div className="float f-starburst2 orn" data-depth="52"><div className="float-inner"><img src="/landing/ld-starburst.png" alt="" /></div></div>
          <div className="float f-spine orn" data-depth="38"><div className="float-inner"><img src="/landing/ld-spine.png" alt="" /></div></div>

          <div className="float f-nicolas" data-depth="18"><div className="float-inner"><img src="/landing/ld-card-nicolas.png" alt="Nicolas — CEO of myLand" /></div></div>
          <div className="float f-krystal" data-depth="14"><div className="float-inner"><img src="/landing/ld-card-krystal.png" alt="Krystal — online" /></div></div>
          <div className="float f-mykaila" data-depth="22"><div className="float-inner"><img src="/landing/ld-card-mykaila.png" alt="Mykaila — this is myLand" /></div></div>
          <div className="float f-justme" data-depth="24"><div className="float-inner"><img src="/landing/ld-card-justme.png" alt="JustMe" /></div></div>
          <div className="float f-user" data-depth="30"><div className="float-inner"><img src="/landing/ld-card-user.png" alt="user6677" /></div></div>

          <div className="float f-wings orn" data-depth="58"><div className="float-inner"><img src="/landing/ld-wings.png" alt="" /></div></div>

          <div className="stage-label bot">full customizable</div>
        </section>
      </main>

      {/* EXPLORE */}
      <section className="section" id="explore">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-kicker">· explore lands ·</div>
            <h2 className="sec-title">No two rooms<br />alike</h2>
            <p className="sec-sub">No two are alike. Yours shouldn&apos;t be either.</p>
          </div>
          <div className="grid reveal">
            {Array.from({ length: gridCount }, (_, i) => (
              <ExploreCard key={i + 1} rank={i + 1} />
            ))}
          </div>
          <div className="sec-foot reveal">
            <button className="btn btn-chrome" onClick={handleExploreMore}>{moreLabel}</button>
            <div className="live-note">live · most-viewed spaces load here</div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-kicker">· pricing ·</div>
            <h2 className="sec-title">Start free.<br />Keep what&apos;s yours.</h2>
          </div>
          <div className="plans reveal">
            <div className="plan">
              <div className="plan-name">Free</div>
              <div className="plan-price"><b>$0</b><span>to start</span></div>
              <div className="perks">
                <div className="perk"><span className="d"></span>Your handle + space</div>
                <div className="perk"><span className="d"></span>The core blocks</div>
                <div className="perk"><span className="d"></span>Listed in explore</div>
              </div>
              <button className="btn btn-glass btn-full">Claim your land</button>
            </div>
            <div className="plan feat">
              <span className="plan-tag">most popular</span>
              <div className="plan-name">Lifetime</div>
              <div className="plan-price"><b>$—</b><span>one-time</span></div>
              <div className="perks">
                <div className="perk"><span className="d"></span>Everything in Free</div>
                <div className="perk"><span className="d"></span>Unlimited blocks &amp; storage</div>
                <div className="perk"><span className="d"></span>Custom domain</div>
                <div className="perk"><span className="d"></span>Pay once, keep forever</div>
              </div>
              <button className="btn btn-chrome btn-full">Get lifetime</button>
            </div>
            <div className="plan">
              <div className="plan-name">Premium</div>
              <div className="plan-price"><b>$—</b><span>/ mo</span></div>
              <div className="perks">
                <div className="perk"><span className="d"></span>Everything in Lifetime</div>
                <div className="perk"><span className="d"></span>Rare decorations &amp; tools</div>
                <div className="perk"><span className="d"></span>Visitor insights</div>
              </div>
              <button className="btn btn-glass btn-full">Go premium</button>
            </div>
          </div>
          <p className="live-note" style={{ textAlign: "center", marginTop: 18 }}>tiers &amp; pricing to be finalized</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section final reveal" id="claim-final">
        <img className="topstar" src="/landing/ld-star.png" alt="" />
        <h2 className="sec-title" style={{ fontSize: "clamp(40px,7vw,92px)" }}>Make it <span className="yours">yours</span></h2>
        <div className="claimwrap" style={{ marginTop: 30 }}>
          <div className={`claim${isOk2 ? " is-ok" : ""}`}>
            <span className="pre">myland.lol/</span>
            <input
              type="text"
              placeholder="your-name"
              spellCheck={false}
              autoComplete="off"
              aria-label="Choose your handle"
              value={handle2}
              onChange={handleInput2}
            />
            <span className="ok">available ✓</span>
          </div>
          <div className="cta-row">
            <button className="btn btn-chrome">Claim your land</button>
            <a href="#explore" className="btn btn-ghost">Explore lands <span className="arr">→</span></a>
          </div>
        </div>
        <footer className="footer">
          <div className="fbrand">myLand</div>
          <div className="links">
            <a href="#">about</a>
            <a href="#">privacy</a>
            <a href="#">terms</a>
            <span>myland.lol</span>
          </div>
        </footer>
      </section>
    </div>
  );
}
