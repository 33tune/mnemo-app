// @ts-nocheck — generated from the Claude Design file "Auth v4"
// (design-import/landing-auth/Auth v4.dc.html). The logic class and the
// template are the design's own, converted 1:1; app wiring: Supabase auth
// through props.auth (email + password, Google, reset, resend), the real
// name check (props.checkHandle) and navigation (props.navigate).
"use client";
import React from "react";
import { Icon as DsIcon, IconTabs as DsIconTabs } from "./ds";

export default 
class AuthPage extends React.Component<any, any> {
  TAKEN = new Set(["login","dashboard","auth","api","admin","settings","myland","browse","setup","space","reset-password","landing"]);
  DISPLAY = { "Unbounded": "'Unbounded',sans-serif", "Funnel Display": "'Funnel Display',sans-serif", "Bricolage Grotesque": "'Bricolage Grotesque',sans-serif" };
  rootRef = React.createRef(); introRef = React.createRef(); outBarRef = React.createRef(); okRef = React.createRef();
  IRI = ["radial-gradient(110% 80% at 15% 10%,#FFE14D,transparent 60%),radial-gradient(100% 100% at 90% 90%,#FF4F94,transparent 62%),#FFD3E4","radial-gradient(110% 80% at 85% 10%,#5AC8FA,transparent 60%),radial-gradient(100% 100% at 10% 90%,#D4FF3F,transparent 62%),#EAF7FF","radial-gradient(110% 80% at 80% 15%,#FF7A2E,transparent 60%),radial-gradient(100% 100% at 15% 90%,#FF4F94,transparent 62%),#FFE4D2","radial-gradient(110% 80% at 20% 15%,#D4FF3F,transparent 60%),radial-gradient(100% 100% at 85% 90%,#FFE14D,transparent 62%),#F6FFD9","radial-gradient(110% 80% at 80% 10%,#FF4F94,transparent 60%),radial-gradient(100% 100% at 15% 90%,#5AC8FA,transparent 62%),#FFE9F2"];
  CR = {"ithought":1.768,"stacey":0.838,"nicolas":1.952,"krystal":0.709,"justme":0.747,"bloodvampp":1.982,"ame-chan":0.754,"ivan":0.913};
  FMT = [["Vertical",.72,0],["Cuadrada",1,1],["Horizontal",1.6,0],["Celular",.5625,0],["Tarjeta",1.25,1]];
  constructor(props) {
    super(props);
    const q = new URLSearchParams(location.search);
    const h = (q.get("handle") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
    this.state = { mode: q.get("mode") === "login" ? "login" : "register", handle: h, hStatus: h.length >= 3 ? (this.TAKEN.has(h) ? "taken" : "checking") : "idle", email: "", pass: "", show: false, loading: false, gLoading: false, error: "", errorKind: "", sent: false, success: false, emailTouched: false, passTouched: false, theme: (() => { const t = q.get("theme"); if (t === "dark" || t === "light") return t; try { return localStorage.getItem("myland-theme") || "dark"; } catch (e) { return "dark"; } })(), mobile: innerWidth < 900, intro: q.get("from") === "claim" && h.length >= 3, resendIn: 0 };
    // The OAuth callback sends ?error=auth when Google sign-in failed.
    if (props.initialError) Object.assign(this.state, { mode: "login", error: props.initialError, errorKind: "" });
  }
  componentDidMount() {
    this._ps = Object.assign({}, this.state); this._pp = Object.assign({}, this.props);
    this.onResize = () => { const m = innerWidth < 900; if (m !== this.state.mobile) this.setState({ mobile: m }, () => this.three && this.three.resize()); else this.three && this.three.resize(); this.fitHandle(); };
    addEventListener("resize", this.onResize);
    this.onStore = e => { if (e.key === "myland-theme" && e.newValue && e.newValue !== this.state.theme) this.setState({ theme: e.newValue }); }; addEventListener("storage", this.onStore);
    this.applyFont(); this.applyTheme(); requestAnimationFrame(() => this.fitHandle()); if (document.fonts) document.fonts.ready.then(() => this.fitHandle());
    if (this.state.hStatus === "checking") this.checkHandle(this.state.handle);
    if (this.state.intro) this.playIntro();
    this.applyPreview();
    this.mx = this.my = this.tx = this.ty = 0;
    this.onMove = e => { this.mx = e.clientX / innerWidth - .5; this.my = e.clientY / innerHeight - .5; };
    addEventListener("pointermove", this.onMove, { passive: true });
    this.reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.initThree();
    const loop = t => { this.raf = requestAnimationFrame(loop); this.tx += (this.mx - this.tx) * .06; this.ty += (this.my - this.ty) * .06; if (this.three) this.three.render(t, 0, this.tx, this.ty); const tl = this.rootRef.current && this.rootRef.current.querySelector("[data-tilt]"); if (tl && !this.reduce) tl.style.transform = "perspective(900px) rotateY(" + (this.tx * 10).toFixed(2) + "deg) rotateX(" + (-this.ty * 8).toFixed(2) + "deg) translate3d(" + (this.tx * 18).toFixed(1) + "px," + (this.ty * 12).toFixed(1) + "px,0)"; };
    this.raf = requestAnimationFrame(loop);
  }
  componentWillUnmount() { cancelAnimationFrame(this.raf); removeEventListener("pointermove", this.onMove); this.three && this.three.dispose(); removeEventListener("resize", this.onResize); removeEventListener("storage", this.onStore); clearTimeout(this.t); clearTimeout(this.ht); clearTimeout(this.goT); clearInterval(this.ri); }
  componentDidUpdate() {
    const ps = this._ps || {}, pp = this._pp || {}; this._ps = Object.assign({}, this.state); this._pp = Object.assign({}, this.props);
    if (pp.previewState !== this.props.previewState) this.applyPreview();
    if (pp.displayFont !== this.props.displayFont) this.applyFont();
    if (ps.theme !== this.state.theme) this.applyTheme();
    if (ps.handle !== this.state.handle || ps.mobile !== this.state.mobile || ps.mode !== this.state.mode) requestAnimationFrame(() => this.fitHandle());
    if (ps.mode !== this.state.mode) { const ord = { register: 0, login: 1, reset: 2 }; const dir = ord[this.state.mode] > ord[ps.mode] ? 1 : -1; const f = this.rootRef.current && this.rootRef.current.querySelector("[data-form]"); f && f.animate && f.animate([{ opacity: 0, transform: "translateX(" + (dir * 40) + "px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 480, easing: "cubic-bezier(.16,1,.3,1)" }); }
    if (!ps.success && this.state.success) { const ov = this.okRef.current; if (ov) { const b = this.btnPos || { x: innerWidth / 2, y: innerHeight / 2 }; const at = "at " + b.x + "px " + b.y + "px"; ov.animate([{ clipPath: "circle(0px " + at + ")" }, { clipPath: "circle(150vmax " + at + ")" }], { duration: 800, easing: "cubic-bezier(.7,0,.2,1)", fill: "both" }); ov.querySelectorAll("[data-burst]").forEach((el, i) => { const a = i / 12 * Math.PI * 2 + Math.random() * .4, d = 160 + Math.random() * 220; el.animate([{ transform: "translate(0,0) scale(0)", opacity: 1 }, { transform: "translate(" + Math.cos(a) * d + "px," + Math.sin(a) * d + "px) scale(1)", opacity: 1, offset: .7 }, { transform: "translate(" + Math.cos(a) * d * 1.15 + "px," + (Math.sin(a) * d * 1.15 + 60) + "px) scale(.8)", opacity: 0 }], { duration: 1500, delay: 350, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" }); }); } }
    if (!ps.success && this.state.success) { const b = this.outBarRef.current; b && b.animate([{ width: "0%" }, { width: "100%" }], { duration: 1400, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }); }
  }
  applyTheme() {
    const r = this.rootRef.current; if (!r) return; const d = this.state.theme !== "light";
    const P = d ? { bg: "#0E0C12", ink: "#F6F3F8", i2: "rgba(238,232,244,.72)", i3: "rgba(238,232,244,.5)", field: "rgba(255,255,255,.07)", well: "rgba(255,255,255,.11)", line: "rgba(255,255,255,.10)", accent: "#FF4F94", link: "#FF4F94", ok: "#5BE49B", bad: "#FF5F57", errBg: "rgba(255,95,87,.16)", errInk: "#FFB4AF",
        stage: "radial-gradient(90% 70% at 100% 100%,rgba(255,79,148,.5),transparent 62%),#17151C", orb: "radial-gradient(circle,rgba(255,79,148,.55) 0 18%,rgba(255,122,46,.28) 38%,rgba(255,79,148,0) 66%)", orbOp: ".8", stageInk: "#F6F3F8", glow: "rgba(255,225,77,.16)", pill: "#FF4F94", pillInk: "#141118", chip: "rgba(23,21,28,.72)", chipOn: "rgba(40,36,48,.9)", check: "#FF4F94", checkOff: "rgba(255,255,255,.16)", checkInk: "#141118" }
      : { bg: "#F3EFF4", ink: "#141118", i2: "rgba(20,17,24,.68)", i3: "rgba(20,17,24,.5)", field: "#FFFFFF", well: "rgba(40,10,40,.05)", line: "rgba(40,10,40,.10)", accent: "#FF4F94", link: "#D42A70", ok: "#1F9D5B", bad: "#D93A31", errBg: "#FFE3E1", errInk: "#7A1712",
        stage: "#FF4F94", orb: "radial-gradient(circle,#fff 0 12%,#5AC8FA 22%,#D4FF3F 33%,#FFE14D 44%,#FF7A2E 55%,rgba(255,79,148,0) 70%)", orbOp: "1", stageInk: "#141118", glow: "rgba(255,255,255,.35)", pill: "#141118", pillInk: "#FFFFFF", chip: "rgba(255,255,255,.5)", chipOn: "#FFFFFF", check: "#141118", checkOff: "rgba(20,17,24,.15)", checkInk: "#FFFFFF" };
    const v = { "--ml-bg": P.bg, "--ml-ink": P.ink, "--ml-ink-2": P.i2, "--ml-ink-3": P.i3, "--ml-field": P.field, "--ml-well": P.well, "--ml-line": P.line, "--ml-accent": P.accent, "--ml-link": P.link, "--ml-ok": P.ok, "--ml-bad": P.bad, "--ml-err-bg": P.errBg, "--ml-err-ink": P.errInk, "--ml-stage": P.stage, "--ml-stage-orb": P.orb, "--ml-orb-op": P.orbOp, "--ml-stage-ink": P.stageInk, "--ml-stage-glow": P.glow, "--ml-pill": P.pill, "--ml-pill-ink": P.pillInk, "--ml-chip": P.chip, "--ml-chip-on": P.chipOn, "--ml-check": P.check, "--ml-check-off": P.checkOff, "--ml-check-ink": P.checkInk };
    Object.keys(v).forEach(k => r.style.setProperty(k, v[k]));
    r.setAttribute("data-editor-theme", d ? "dark" : "light"); document.body.style.background = P.bg;
    try { localStorage.setItem("myland-theme", d ? "dark" : "light"); } catch (e) {}
  }
  fitHandle() {
    const r = this.rootRef.current; if (!r) return;
    r.querySelectorAll("[data-handle-target]").forEach(el => { const max = this.state.mobile ? 72 : 150; el.style.fontSize = max + "px"; const avail = el.parentElement.clientWidth; if (avail > 0 && el.scrollWidth > avail) el.style.fontSize = Math.max(28, Math.floor(max * avail / el.scrollWidth * .97)) + "px"; });
  }
  applyFont() { const r = this.rootRef.current; r && r.style.setProperty("--ml-display", this.DISPLAY[this.props.displayFont] || this.DISPLAY.Unbounded); }
  applyPreview() {
    const p = this.props.previewState; if (!p || p === "Normal") return;
    const base = { email: "vos@email.com", pass: "myland2026!", handle: this.state.handle || "tu-nombre", hStatus: "ok", loading: false, error: "", sent: false, success: false, intro: false };
    if (p === "Cargando") this.setState({ ...base, loading: true });
    if (p === "Error") this.setState({ ...base, error: this.state.mode === "login" ? "Email o contraseña incorrectos." : "Ese email ya tiene una cuenta.", errorKind: this.state.mode === "login" ? "creds" : "exists" });
    if (p === "Email enviado") this.setState({ ...base, sent: true, resendIn: 30 });
    if (p === "Sin conexión") this.setState({ ...base, error: "No pudimos conectarnos. Revisá tu internet y probá de nuevo.", errorKind: "network" });
  }
  playIntro() {
    const run = () => {
      const ov = this.introRef.current; if (!ov) return;
      const tg = this.rootRef.current.querySelector("[data-handle-target]");
      const r = tg ? tg.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      const at = `at ${r.left + Math.min(r.width, 220) / 2}px ${r.top + r.height / 2}px`;
      const a = ov.animate([{ clipPath: `circle(150vmax ${at})` }, { clipPath: `circle(0px ${at})` }], { duration: 900, delay: 350, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" });
      a.onfinish = () => this.setState({ intro: false });
      tg && tg.animate([{ opacity: 0, transform: "translateY(30px) scale(1.1)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: 700, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }
  setMode = m => this.setState({ mode: m, error: "", sent: false, passTouched: false });
  onHandle = e => {
    const h = e.target.value.replace(/\s+/g, "").toLowerCase().slice(0, 20);
    clearTimeout(this.ht);
    if (!h) return this.setState({ handle: h, hStatus: "idle" });
    if (!/^[a-z0-9_-]*$/.test(h)) return this.setState({ handle: h, hStatus: "invalid" });
    if (h.length < 3) return this.setState({ handle: h, hStatus: "short" });
    this.setState({ handle: h, hStatus: "checking" });
    this.ht = setTimeout(() => this.checkHandle(h), 500);
  };
  emailOk() { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.state.email); }
  strength() { const p = this.state.pass; let s = 0; if (p.length >= 8) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++; return p ? Math.max(1, s) : 0; }
  shake() { const r = this.rootRef.current; const f = r && r.querySelector("form"); f && f.animate && f.animate([{ transform: "translateX(0)" }, { transform: "translateX(-10px)" }, { transform: "translateX(8px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }], { duration: 420 }); }
  submit = e => {
    e.preventDefault();
    const s = this.state;
    const sb = this.rootRef.current && this.rootRef.current.querySelector("button[type=submit]"); if (sb) { const r = sb.getBoundingClientRect(); this.btnPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    this.setState({ emailTouched: true, passTouched: true, error: "" });
    const bad = !this.emailOk() || (s.mode !== "reset" && (s.mode === "register" ? s.pass.length < 8 : !s.pass)) || (s.mode === "register" && s.hStatus !== "ok");
    if (bad) { this.shake(); return; }
    this.setState({ loading: true });
    this.doAuth(s.mode);
    if (false) this.t = setTimeout(() => {
      const em = this.state.email.toLowerCase();
      if (!navigator.onLine) return this.fail("No pudimos conectarnos. Revisá tu internet y probá de nuevo.", "network");
      if (s.mode === "register") { if (em.startsWith("usado")) return this.fail("Ese email ya tiene una cuenta.", "exists"); return this.setState({ loading: false, sent: true, resendIn: 30 }, () => this.tick()); }
      if (s.mode === "reset") return this.setState({ loading: false, sent: true, resendIn: 30 }, () => this.tick());
      if (em.includes("error") || this.state.pass === "error") return this.fail("Email o contraseña incorrectos.", "creds");
      this.setState({ loading: false, success: true });
    }, 1500);
  };
  async initThree() {
    if (this.three || this.threeLoading) return; this.threeLoading = true;
    try {
      const T = await import("three");
      const host = this.rootRef.current && this.rootRef.current.querySelector("[data-three]");
      if (!host || !(this.props.decor ?? true)) { this.threeLoading = false; return; }
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
      host.appendChild(renderer.domElement);
      const scene = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, 0.1, 100); cam.position.set(0, 0, 13);
      const env = new T.Scene(); env.background = new T.Color("#d9d2de");
      const panel = (c, w, h, x, y, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry || 0; m.lookAt(0, 0, 0); env.add(m); };
      panel(new T.Color(9, 9, 9), 8, 4, 0, 7, 3); panel(new T.Color(4, 1.2, 2.4), 6, 6, -8, 0, 2); panel(new T.Color(1.4, 3.4, 4.5), 6, 6, 8, 1, -2); panel(new T.Color(3.4, 3, .6), 10, 3, 0, -7, 4); panel(new T.Color(6, 6, 6), 4, 8, 3, 2, 9);
      const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.035).texture;
      const dl = new T.DirectionalLight(0xffffff, 1.4); dl.position.set(4, 6, 8); scene.add(dl); scene.add(new T.AmbientLight(0xffffff, 0.25));
      const mat = (c, o) => new T.MeshPhysicalMaterial(Object.assign({ color: c, roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .06 }, o || {}));
      const objs = [];
      const add = (mesh, d, m, spin) => { const g = new T.Group(); g.add(mesh); scene.add(g); objs.push({ g, mesh, d, m, spin, base: mesh.rotation.clone() }); return g; };
      const cross = new T.Group(); const cm = mat("#2F7BFF", { iridescence: .6, iridescenceIOR: 1.6, roughness: .05 });
      const c1 = new T.Mesh(new T.CapsuleGeometry(.42, 1.7, 16, 48), cm); c1.rotation.z = Math.PI / 4; const c2 = c1.clone(); c2.rotation.z = -Math.PI / 4; cross.add(c1, c2);
      add(cross, [-.78, .02, .78], [.62, .3, .6], [.004, .007, .002]);
      const sh = new T.Shape(); const N = 4, R = 1, r = .38; for (let i = 0; i < N * 2; i++) { const a = i / (N * 2) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r : R; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } sh.closePath();
      const sg = new T.ExtrudeGeometry(sh, { depth: .35, bevelEnabled: true, bevelThickness: .22, bevelSize: .18, bevelSegments: 10, curveSegments: 24 }); sg.center();
      add(new T.Mesh(sg, mat("#FF6A1A", { roughness: .22 })), [-.9, -.35, .8], [-.75, .3, .55], [.006, .004, .009]);
      add(new T.Mesh(new T.SphereGeometry(.62, 64, 64), mat("#FFD21F", { roughness: .08 })), [.92, -.45, .9], [.86, -.2, .62], [0, .004, 0]);
      add(new T.Mesh(new T.SphereGeometry(.3, 48, 48), mat("#FFD21F", { roughness: .08 })), [.3, -.55, .8], [-.5, .45, .62], [0, .004, 0]);
      add(new T.Mesh(new T.SphereGeometry(.2, 48, 48), mat("#FFD21F", { roughness: .08 })), [-.25, -.85, 1], null, [0, .004, 0]);
      add(new T.Mesh(new T.TorusGeometry(.62, .26, 48, 120), mat("#FF4F94", { iridescence: .5, roughness: .1 })), [.97, .95, .8], [.88, -.72, .6], [.008, .005, .003]);
      add(new T.Mesh(new T.SphereGeometry(.5, 64, 64), mat("#e8e8ee", { metalness: 1, roughness: .04 })), [-.97, .92, .6], null, [0, .003, 0]);
      const bg = new T.IcosahedronGeometry(.55, 6); const p = bg.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + .16 * Math.sin(v.x * 5) * Math.sin(v.y * 4) * Math.sin(v.z * 6); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); } bg.computeVertexNormals();
      add(new T.Mesh(bg, mat("#C8F53A", { roughness: .2 })), [-.2, -.15, .6], null, [.003, .006, .004]);
      let W = 1, H = 1, halfW = 1, halfH = 1;
      const resize = () => { W = host.clientWidth || 1; H = host.clientHeight || 1; renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); halfH = Math.tan(cam.fov * Math.PI / 360) * cam.position.z; halfW = halfH * cam.aspect; };
      resize();
      const t0 = performance.now();
      const render = (t, s, tx, ty) => {
        if (s > 1.3) return;
        const mob = W < 820, k = (t - t0) / 1000;
        objs.forEach((o, i) => {
          const pos = mob ? o.m : o.d; o.g.visible = !!pos; if (!pos) return;
          const intro = Math.min(1, Math.max(0, (k - .5 - i * .12) / .9)); const e = intro === 1 ? 1 : 1 - Math.pow(2, -10 * intro) * Math.cos(intro * 10.5);
          const sc = pos[2] * (mob ? .8 : 1) * Math.max(0, e);
          o.g.scale.setScalar(sc);
          const depth = .6 + i * .15;
          o.g.position.set(pos[0] * halfW - tx * depth * .9, pos[1] * halfH + Math.sin(k * .8 + i) * .14 + ty * depth * .6 + s * halfH * (1.2 + i * .25), 0);
          o.mesh.rotation.x = o.base.x + k * o.spin[0] * 60 + s * 2 + ty * .6; o.mesh.rotation.y = o.base.y + k * o.spin[1] * 60 + tx * .8; o.mesh.rotation.z = o.base.z + k * o.spin[2] * 60;
        });
        renderer.render(scene, cam);
      };
      this.three = { render, resize, dispose: () => { renderer.dispose(); renderer.domElement.remove(); } };
    } catch (err) { console.warn("3D off", err && err.message); }
    this.threeLoading = false;
  }
  fail(msg, kind) { this.setState({ loading: false, error: msg, errorKind: kind }, () => this.shake()); }
  tick() { clearInterval(this.ri); this.ri = setInterval(() => this.setState(s => { if (s.resendIn <= 1) clearInterval(this.ri); return { resendIn: Math.max(0, s.resendIn - 1) }; }), 1000); }
  renderVals() {
    const s = this.state, reg = s.mode === "register", login = s.mode === "login", reset = s.mode === "reset", m = s.mobile;
    const H = { idle: ["Elegí tu nombre. Va a ser tu link.", "var(--ml-ink-2)", "var(--ml-line)"], short: ["Mínimo 3 caracteres.", "var(--ml-ink-2)", "var(--ml-line)"], invalid: ["Solo letras, números, - y _", "var(--ml-bad)", "#FF5F57"], checking: ["Buscando…", "var(--ml-ink-2)", "#5AC8FA"], ok: ["Disponible. Reservado para vos.", "var(--ml-ok)", "#2FC46F"], taken: ["Ya está en uso. Probá con otro.", "var(--ml-bad)", "#FF5F57"] }[s.hStatus];
    const emailErr = s.emailTouched && !this.emailOk() ? (s.email ? "Revisá el email: falta algo." : "Escribí tu email.") : "";
    const passErr = s.passTouched && !reset ? (reg && s.pass.length < 8 ? (s.pass ? "Mínimo 8 caracteres." : "Elegí una contraseña.") : login && !s.pass ? "Escribí tu contraseña." : "") : "";
    const st = this.strength(); const sc = ["var(--ml-line)", "#FF5F57", "#FF7A2E", "#FFE14D", "#2FC46F"][st];
    const base = "0 0 0 1px var(--ml-line)", bad = "0 0 0 1.5px #FF5F57";
    const len = (s.handle || "tu-nombre").length;
    return {
      rootRef: this.rootRef, introRef: this.introRef, outBarRef: this.outBarRef,
      mobile: m, stageFlex: m ? "1 1 100%" : "1 1 0", stagePos: m ? "relative" : "sticky", stageH: m ? "auto" : "100vh",
      stageMinH: m ? "0" : "calc(100vh - 24px)", stagePad: m ? "14px 14px 22px 18px" : "28px clamp(28px,3.4vw,52px) 40px",
      stageGap: m ? "28px" : "0", showChecks: reg && !m, showLoginNote: !reg && !m,
      handleSize: m ? "min(72px,calc((100vw - 60px) / " + Math.max(4, len * .84).toFixed(2) + "))" : "min(" + (len > 12 ? "104px" : "150px") + ",calc((100vw - min(560px,44vw) - 90px) / " + Math.max(4, len * .84).toFixed(2) + "))",
      loginSize: m ? "clamp(36px,10vw,52px)" : "clamp(56px,6.8vw,124px)",
      panelFlex: m ? "1 1 100%" : "0 0 min(560px,44vw)", panelPad: m ? "20px 20px 40px" : "40px clamp(28px,3vw,56px)", panelMinH: m ? "0" : "100vh",
      mode: s.mode, isRegister: reg, isLogin: login, isReset: reset, isLoginish: !reg,
      tabs: [{ id: "register", label: "Crear cuenta" }, { id: "login", label: "Entrar" }], setMode: this.setMode, showTabs: !reset,
      stageKicker: reg ? "TU NOMBRE, RESERVADO" : reset ? "RECUPERAR CUENTA" : "HOLA DE NUEVO",
      stageHandle: s.handle || "tu-nombre",
      checks: [{ label: "Nombre", done: s.hStatus === "ok" }, { label: "Cuenta", done: this.emailOk() && s.pass.length >= 8 }, { label: "Tu sala", done: s.sent }].map(c => ({ ...c, bg: c.done ? "var(--ml-check)" : "var(--ml-check-off)", chip: c.done ? "var(--ml-chip-on)" : "var(--ml-chip)" })),
      showForm: !s.sent, sent: s.sent,
      title: reg ? "Creá tu myLand" : reset ? "Recuperá tu cuenta" : "Hola de nuevo",
      subtitle: reg ? "Un paso más y tu sala está lista para armar." : reset ? "Te mandamos un link para elegir una contraseña nueva." : "Entrá para seguir armando tu sala.",
      handle: s.handle, onHandle: this.onHandle, hText: H[0], hColor: H[1], hDot: H[2],
      handleRing: s.hStatus === "taken" || s.hStatus === "invalid" ? bad : s.hStatus === "ok" ? "0 0 0 1.5px #2FC46F" : base,
      email: s.email, onEmail: e => this.setState({ email: e.target.value.trim(), error: "" }), blurEmail: () => s.email && this.setState({ emailTouched: true }), emailErr, emailRing: emailErr ? bad : base,
      needsPass: !reset, pass: s.pass, onPass: e => this.setState({ pass: e.target.value, error: "" }), blurPass: () => s.pass && this.setState({ passTouched: true }), passErr, passRing: passErr ? bad : base,
      passType: s.show ? "text" : "password", togglePass: () => this.setState({ show: !s.show }), eyeIcon: s.show ? "eye-off" : "eye", eyeLabel: s.show ? "Ocultar contraseña" : "Mostrar contraseña",
      passPh: reg ? "Mínimo 8 caracteres" : "Tu contraseña", passAuto: reg ? "new-password" : "current-password",
      showStrength: reg && !!s.pass, bars: [1, 2, 3, 4].map(i => ({ c: i <= st ? sc : "var(--ml-line)" })), strengthLabel: ["", "Débil", "Ok", "Buena", "Fuerte"][st],
      goReset: () => this.setState({ mode: "reset", error: "" }), goLogin: () => this.setMode("login"), goRegister: () => this.setMode("register"),
      error: s.error, errorAction: { exists: "Entrar", creds: "Recuperar contraseña", network: "Reintentar" }[s.errorKind] || "",
      errorFix: () => { if (s.errorKind === "exists") this.setMode("login"); else if (s.errorKind === "creds") this.setState({ mode: "reset", error: "" }); else this.submit({ preventDefault() {} }); },
      loading: s.loading || s.gLoading, btnOpacity: s.loading ? 0.85 : 1,
      cta: s.loading ? (reg ? "Creando tu sala…" : reset ? "Enviando…" : "Entrando…") : reg ? "Crear mi myLand" : reset ? "Mandarme el link" : "Entrar",
      submit: this.submit, showGoogle: !reset,
      google: e => { if (e && e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); this.btnPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } this.setState({ gLoading: true, error: "" }); this.props.auth.google().then(err => { if (err) this.fail(err, "network"); }); },
      googleLabel: s.gLoading ? "Conectando con Google…" : "Continuar con Google",
      sentText: reset ? "Te mandamos un link para cambiar tu contraseña a" : "Te mandamos un link para confirmar tu cuenta a",
      sentEmail: s.email || "vos@email.com",
      resend: () => { if (this.state.resendIn > 0) return; this.props.auth.resend(this.state.mode, this.state.email).then(err => err ? this.setState({ sent: false, error: err, errorKind: "network" }) : this.setState({ resendIn: 30 }, () => this.tick())); }, resendDisabled: s.resendIn > 0,
      resendLabel: s.resendIn > 0 ? "Reenviar en " + s.resendIn + " s" : "Reenviar", resendColor: s.resendIn > 0 ? "var(--ml-ink-3)" : "var(--ml-ink)",
      backToForm: () => this.setState({ sent: false }),
      intro: s.intro, success: s.success, okRef: this.okRef, cols: !m,
      cardCls: m ? "" : "lg-glass", cardPad: m ? "0" : "36px 34px",
      themeIcon: s.theme === "light" ? "moon" : "sun", themeLabel: s.theme === "light" ? "Tema oscuro" : "Tema claro", toggleTheme: () => this.setState({ theme: s.theme === "light" ? "dark" : "light" }),
      letters: (s.handle || "tu-nombre").split("").map((ch, i) => ({ ch, d: (s.intro ? 900 + i * 45 : 0) + "ms" })),
      colA: ["ithought", "stacey", "nicolas", "krystal", "ithought", "stacey", "nicolas", "krystal"].map(k => ({ img: "url(/landing/hero/" + k + ".png)", r: String(this.CR[k]) })),
      colB: ["justme", "bloodvampp", "ame-chan", "krystal", "justme", "bloodvampp", "ame-chan", "stacey"].map(k => ({ img: "url(/landing/hero/" + k + ".png)", r: String(this.CR[k]) })),
      burst: Array.from({ length: 12 }, (_, i) => { const sz = 26 + (i * 37 % 40); return { s: sz + "px", m: (-sz / 2) + "px 0 0 " + (-sz / 2) + "px", bg: ["radial-gradient(circle at 32% 28%,#fff 0,#FFD0E3 10%,#FF4F94 42%,#B8125A 100%)", "radial-gradient(circle at 32% 28%,#fff 0,#D8F2FF 10%,#5AC8FA 42%,#1A6FB0 100%)", "radial-gradient(circle at 32% 28%,#fff 0,#F0FFC2 10%,#C8F53A 42%,#5E8C00 100%)", "radial-gradient(circle at 32% 28%,#fff 0,#FFD9C2 10%,#FF7A2E 42%,#C2410C 100%)"][i % 4] }; }),
    };
  }

  checkHandle(h) {
    if (this.TAKEN.has(h)) return this.setState({ hStatus: "taken" });
    this.setState({ hStatus: "checking" });
    this.props.checkHandle(h).then(st => { if (this.state.handle === h) this.setState({ hStatus: st }); });
  }
  // Supabase (props.auth): register / login / reset. Errors come back in the
  // design's own words and kinds ("exists" -> Entrar, "creds" -> Recuperar).
  async doAuth(mode) {
    const s = this.state;
    if (typeof navigator !== "undefined" && !navigator.onLine) return this.fail("No pudimos conectarnos. Revisá tu internet y probá de nuevo.", "network");
    const r = await this.props.auth[mode]({ email: s.email.toLowerCase(), pass: s.pass, handle: s.handle });
    if (r.error) return this.fail(r.error, r.kind || "network");
    if (r.sent) return this.setState({ loading: false, sent: true, resendIn: 30 }, () => this.tick());
    this.setState({ loading: false, success: true });
    clearTimeout(this.goT);
    this.goT = setTimeout(() => this.props.navigate(r.next || "/dashboard"), 1500);
  }

  render() {
    const __v: any = { ...{"displayFont": "Unbounded", "decor": true}, ...this.props, ...this.renderVals() };
    const { backToForm, bars, blurEmail, blurPass, btnOpacity, burst, cardCls, cardPad, checks, colA, colB, cols, cta, email, emailErr, emailRing, error, errorAction, errorFix, eyeIcon, eyeLabel, goLogin, goRegister, goReset, google, googleLabel, hColor, hDot, hText, handle, handleRing, handleSize, intro, introRef, isLogin, isLoginish, isRegister, isReset, letters, loading, loginSize, mobile, mode, needsPass, okRef, onEmail, onHandle, onPass, outBarRef, panelFlex, panelMinH, panelPad, pass, passAuto, passErr, passPh, passRing, passType, resend, resendColor, resendDisabled, resendLabel, rootRef, sent, sentEmail, sentText, setMode, showChecks, showForm, showGoogle, showLoginNote, showStrength, showTabs, stageFlex, stageGap, stageH, stageHandle, stageKicker, stageMinH, stagePad, stagePos, strengthLabel, submit, subtitle, success, tabs, themeIcon, themeLabel, title, togglePass, toggleTheme } = __v;
    return (
<div className="ml-site">
{" "}<div ref={(rootRef)} className="lg" data-editor-theme="dark" style={{position: "relative", minHeight: "100vh", display: "flex", flexWrap: "wrap", background: "var(--ml-bg)", color: "var(--ml-ink)", transition: "background-color .5s,color .5s", fontFamily: "var(--font-sans)"}}>{" "}<aside data-stage="1" style={{position: "relative", flex: (stageFlex), minWidth: "0", boxSizing: "border-box", padding: "12px", position: (stagePos), top: "0", height: (stageH)}}>{" "}<div style={{position: "relative", height: "100%", minHeight: (stageMinH), borderRadius: "clamp(28px,3vw,40px)", overflow: "hidden", background: "var(--ml-stage)", color: "var(--ml-stage-ink)", transition: "background .5s,color .5s", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box", padding: (stagePad)}}>{" "}<div aria-hidden="true" style={{position: "absolute", right: "-14%", bottom: "-18%", width: "min(70vw,640px)", aspectRatio: "1", borderRadius: "50%", background: "var(--ml-stage-orb)", opacity: "var(--ml-orb-op)", pointerEvents: "none"}}></div>{" "}<div aria-hidden="true" style={{position: "absolute", left: "-20%", top: "-25%", width: "80%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle,var(--ml-stage-glow),transparent 64%)", animation: "ml-glowpan 12s ease-in-out infinite", pointerEvents: "none"}}></div>{" "}{(cols) ? (<>{" "}<div aria-hidden="true" style={{position: "absolute", right: "3%", top: "-12%", bottom: "-12%", width: "44%", display: "flex", gap: "14px", transform: "rotate(-8deg)", pointerEvents: "none"}}>{" "}<div style={{flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px", animation: "ml-colA 34s linear infinite"}}>{" "}{(((colA)) || []).map((c: any, $index: number) => (<React.Fragment key={$index}><div style={{flex: "none", width: "100%", aspectRatio: (c.r), background: `${c.img} center/contain no-repeat`, filter: "drop-shadow(0 22px 30px rgba(0,0,0,.35))"}}></div></React.Fragment>))}{" "}</div>{" "}<div style={{flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px", animation: "ml-colAr 40s linear infinite"}}>{" "}{(((colB)) || []).map((c: any, $index: number) => (<React.Fragment key={$index}><div style={{flex: "none", width: "100%", aspectRatio: (c.r), background: `${c.img} center/contain no-repeat`, filter: "drop-shadow(0 22px 30px rgba(0,0,0,.35))"}}></div></React.Fragment>))}{" "}</div>{" "}</div>{" "}</>) : null}{" "}<div data-three="1" aria-hidden="true" style={{position: "absolute", inset: "0", pointerEvents: "none"}}></div>{" "}<div aria-hidden="true" style={{position: "absolute", right: "12%", top: "14%", animation: "ml-bob 5s ease-in-out infinite"}}><div style={{width: "clamp(34px,4.4vw,72px)", height: "clamp(34px,4.4vw,72px)", borderRadius: "50%", background: "radial-gradient(circle at 32% 28%,#fff 0,#FFF6B8 10%,#FFE14D 42%,#D9A400 100%)", boxShadow: "0 24px 40px -16px rgba(120,60,0,.45)"}}></div></div>{" "}<div aria-hidden="true" style={{position: "absolute", left: "46%", bottom: "22%", animation: "ml-bob 6s 1s ease-in-out infinite"}}><div style={{width: "clamp(22px,2.6vw,42px)", height: "clamp(22px,2.6vw,42px)", borderRadius: "50%", background: "radial-gradient(circle at 32% 28%,#fff 0,#F0FFC2 10%,#C8F53A 42%,#5E8C00 100%)"}}></div></div>{" "}<div style={{position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px"}}>{" "}<a href="/" className="lg-glass" style={{display: "flex", alignItems: "center", gap: "8px", height: "46px", padding: "0 16px 0 10px", borderRadius: "999px", color: "var(--glass-ink)"}}><img src="/landing/logo.png" alt="" style={{width: "28px", height: "auto"}} /><span style={{font: "800 19px/1 var(--font-display)", letterSpacing: "-0.055em"}}>myLand</span></a>{" "}<div style={{display: "flex", gap: "8px"}}><button type="button" onClick={(toggleTheme)} aria-label={(themeLabel)} title={(themeLabel)} className="lg-glass mla0" style={{width: "46px", height: "46px", border: "none", borderRadius: "999px", display: "grid", placeItems: "center", color: "var(--glass-ink)", cursor: "pointer", transition: "transform .35s var(--glass-spring)"}}><DsIcon name={(themeIcon)} size={18}></DsIcon></button>{(mobile) ? (<><a href="Landing v9.dc.html" aria-label="Cerrar" title="Cerrar" className="lg-glass" style={{width: "46px", height: "46px", borderRadius: "999px", display: "grid", placeItems: "center", color: "var(--glass-ink)"}}><DsIcon name="close" size={17}></DsIcon></a></>) : null}</div>{" "}</div>{" "}<div data-tilt="1" style={{position: "relative", marginTop: (stageGap), willChange: "transform"}}>{" "}<span style={{display: "inline-flex", height: "30px", padding: "0 12px", alignItems: "center", borderRadius: "999px", background: "var(--ml-pill)", color: "var(--ml-pill-ink)", font: "600 12px var(--font-mono)", letterSpacing: ".08em"}}>{stageKicker}</span>{" "}{(isRegister) ? (<>{" "}<div style={{marginTop: "16px", font: "700 clamp(20px,2.4vw,36px)/1 var(--font-sans)", letterSpacing: "-0.03em", opacity: ".6"}}>myland.lol/</div>{" "}<div data-handle-target="1" style={{marginTop: "6px", fontFamily: "var(--ml-display)", fontWeight: "800", fontSize: (handleSize), lineHeight: ".92", letterSpacing: "-0.045em", whiteSpace: "nowrap", maxWidth: "100%"}}>{(((letters)) || []).map((l: any, $index: number) => (<React.Fragment key={$index}><span style={{display: "inline-block", animation: `ml-letter .55s ${l.d} cubic-bezier(.34,1.56,.64,1) both`}}>{l.ch}</span></React.Fragment>))}</div>{" "}</>) : null}{" "}{(isLoginish) ? (<>{" "}<div style={{marginTop: "16px", fontFamily: "var(--ml-display)", fontWeight: "800", fontSize: (loginSize), lineHeight: ".9", letterSpacing: "-0.045em", textTransform: "uppercase"}}>Tu sala te espera</div>{" "}</>) : null}{" "}</div>{" "}{(showChecks) ? (<>{" "}<div style={{position: "relative", display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "28px"}}>{" "}{(((checks)) || []).map((c: any, $index: number) => (<React.Fragment key={$index}>{" "}<div style={{display: "flex", alignItems: "center", gap: "10px", height: "44px", padding: "0 16px 0 8px", borderRadius: "999px", background: (c.chip), font: "650 14px var(--font-sans)", color: "var(--ml-stage-ink)", transition: "background .3s"}}>{" "}<span style={{width: "28px", height: "28px", borderRadius: "999px", display: "grid", placeItems: "center", background: (c.bg), color: "var(--ml-check-ink)", transition: "background .4s var(--glass-spring)"}}>{(c.done) ? (<><span style={{display: "grid", animation: "ml-pop .4s var(--glass-spring)"}}><DsIcon name="check" size={15}></DsIcon></span></>) : null}</span>{c.label}{" "}</div>{" "}</React.Fragment>))}{" "}</div>{" "}</>) : null}{" "}{(showLoginNote) ? (<>{" "}<div style={{position: "relative", marginTop: "28px", font: "600 16px/1.45 var(--font-sans)", maxWidth: "380px"}}>Tu tarjeta, tus links y tu sala siguen exactamente donde los dejaste.</div>{" "}</>) : null}{" "}</div>{" "}</aside>{" "}<main style={{position: "relative", flex: (panelFlex), minWidth: "0", display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box", padding: (panelPad), minHeight: (panelMinH)}}>{" "}<div style={{position: "relative", width: "100%", maxWidth: "440px", margin: "0 auto"}}>{(cols) ? (<><div aria-hidden="true" style={{position: "absolute", inset: "-1px", borderRadius: "33px", overflow: "hidden", pointerEvents: "none", opacity: ".55", filter: "blur(18px)"}}><div style={{position: "absolute", left: "50%", top: "50%", width: "160%", aspectRatio: "1", margin: "-80% 0 0 -80%", background: "conic-gradient(from 0deg,var(--ml-accent),#FFE14D,#5AC8FA,#D4FF3F,var(--ml-accent))", animation: "ml-orbit 9s linear infinite"}}></div></div></>) : null}<div className={(cardCls)} style={{position: "relative", width: "100%", boxSizing: "border-box", padding: (cardPad), borderRadius: "32px", animation: "ml-panel .7s .15s cubic-bezier(.16,1,.3,1) both"}}>{" "}{(showForm) ? (<>{" "}{(showTabs) ? (<>{" "}<DsIconTabs tabs={(tabs)} value={(mode)} onChange={(setMode)}></DsIconTabs>{" "}</>) : null}{" "}<div data-form="1">{" "}<h1 style={{margin: "28px 0 0", fontFamily: "var(--ml-display)", fontWeight: "800", fontSize: "clamp(30px,3.2vw,40px)", lineHeight: ".95", letterSpacing: "-0.045em", textTransform: "uppercase"}}>{title}</h1>{" "}<p style={{margin: "12px 0 0", font: "500 15px/1.45 var(--font-sans)", color: "var(--ml-ink-2)"}}>{subtitle}</p>{" "}<form onSubmit={(submit)} noValidate="true" style={{marginTop: "24px", display: "flex", flexDirection: "column", gap: "16px"}}>{" "}{(isRegister) ? (<>{" "}<div style={{display: "flex", flexDirection: "column", gap: "8px"}}>{" "}<label htmlFor="f-handle" style={{font: "600 13px var(--font-sans)", color: "var(--ml-ink-2)"}}>Tu nombre en myLand</label>{" "}<div style={{display: "flex", alignItems: "center", height: "54px", borderRadius: "16px", background: "var(--ml-field)", padding: "0 16px", boxShadow: (handleRing), transition: "box-shadow .25s"}}>{" "}<span style={{font: "500 16px var(--font-sans)", color: "var(--ml-ink-3)"}}>myland.lol/</span>{" "}<input id="f-handle" value={(handle)} onChange={(onHandle)} disabled={(loading)} placeholder="tu-nombre" spellCheck="false" autoComplete="username" style={{flex: "1", minWidth: "0", height: "100%", border: "none", outline: "none", background: "transparent", font: "650 16px var(--font-sans)", color: "var(--ml-ink)", padding: "0 4px"}} />{" "}<span style={{width: "9px", height: "9px", borderRadius: "99px", flex: "none", background: (hDot), transition: "background .3s"}}></span>{" "}</div>{" "}<div style={{font: "550 12px var(--font-sans)", color: (hColor), minHeight: "16px"}}>{hText}</div>{" "}</div>{" "}</>) : null}{" "}<div style={{display: "flex", flexDirection: "column", gap: "8px"}}>{" "}<label htmlFor="f-email" style={{font: "600 13px var(--font-sans)", color: "var(--ml-ink-2)"}}>Email</label>{" "}<input id="f-email" type="email" value={(email)} onChange={(onEmail)} onBlur={(blurEmail)} disabled={(loading)} placeholder="vos@email.com" autoComplete="email" inputMode="email" style={{height: "54px", border: "none", outline: "none", borderRadius: "16px", background: "var(--ml-field)", padding: "0 16px", font: "550 16px var(--font-sans)", color: "var(--ml-ink)", boxShadow: (emailRing), transition: "box-shadow .25s,transform .35s var(--glass-spring)"}} className="mla1" />{" "}{(emailErr) ? (<><div style={{font: "550 12px var(--font-sans)", color: "var(--ml-bad)"}}>{emailErr}</div></>) : null}{" "}</div>{" "}{(needsPass) ? (<>{" "}<div style={{display: "flex", flexDirection: "column", gap: "8px"}}>{" "}<div style={{display: "flex", alignItems: "baseline", justifyContent: "space-between"}}>{" "}<label htmlFor="f-pass" style={{font: "600 13px var(--font-sans)", color: "var(--ml-ink-2)"}}>Contraseña</label>{" "}{(isLogin) ? (<><button type="button" onClick={(goReset)} style={{border: "none", background: "none", padding: "0", cursor: "pointer", font: "600 13px var(--font-sans)", color: "var(--ml-ink)", textDecoration: "underline", textUnderlineOffset: "3px"}} className="mla2">¿Te la olvidaste?</button></>) : null}{" "}</div>{" "}<div style={{position: "relative"}}>{" "}<input id="f-pass" type={(passType)} value={(pass)} onChange={(onPass)} onBlur={(blurPass)} disabled={(loading)} placeholder={(passPh)} autoComplete={(passAuto)} style={{width: "100%", boxSizing: "border-box", height: "54px", border: "none", outline: "none", borderRadius: "16px", background: "var(--ml-field)", padding: "0 54px 0 16px", font: "550 16px var(--font-sans)", color: "var(--ml-ink)", boxShadow: (passRing), transition: "box-shadow .25s,transform .35s var(--glass-spring)"}} className="mla3" />{" "}<button type="button" onClick={(togglePass)} aria-label={(eyeLabel)} title={(eyeLabel)} style={{position: "absolute", right: "5px", top: "5px", width: "44px", height: "44px", border: "none", borderRadius: "12px", background: "transparent", color: "var(--ml-ink-2)", display: "grid", placeItems: "center", cursor: "pointer"}} className="mla4"><DsIcon name={(eyeIcon)} size={17}></DsIcon></button>{" "}</div>{" "}{(showStrength) ? (<>{" "}<div style={{display: "flex", alignItems: "center", gap: "10px"}}>{" "}<div style={{flex: "1", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px"}}>{(((bars)) || []).map((b: any, $index: number) => (<React.Fragment key={$index}><span style={{height: "5px", borderRadius: "9px", background: (b.c), transition: "background .3s"}}></span></React.Fragment>))}</div>{" "}<span style={{font: "600 12px var(--font-sans)", color: "var(--ml-ink)", minWidth: "48px", textAlign: "right"}}>{strengthLabel}</span>{" "}</div>{" "}</>) : null}{" "}{(passErr) ? (<><div style={{font: "550 12px var(--font-sans)", color: "var(--ml-bad)"}}>{passErr}</div></>) : null}{" "}</div>{" "}</>) : null}{" "}{(error) ? (<>{" "}<div role="alert" style={{display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", borderRadius: "18px", background: "var(--ml-err-bg)", color: "var(--ml-err-ink)", font: "550 14px/1.4 var(--font-sans)", animation: "ml-fade .35s both"}}>{" "}<span style={{flex: "none", width: "22px", height: "22px", borderRadius: "99px", background: "#FF5F57", color: "#fff", display: "grid", placeItems: "center", font: "700 13px var(--font-sans)"}}>!</span>{" "}<div style={{flex: "1"}}>{error}{(errorAction) ? (<> <button type="button" onClick={(errorFix)} style={{border: "none", background: "none", padding: "0", cursor: "pointer", font: "700 14px var(--font-sans)", color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px"}}>{errorAction}</button></>) : null}</div>{" "}</div>{" "}</>) : null}{" "}<button type="submit" disabled={(loading)} style={{position: "relative", overflow: "hidden", marginTop: "4px", height: "58px", border: "none", borderRadius: "999px", background: "var(--ml-accent)", color: "#141118", font: "750 16px var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", opacity: (btnOpacity), boxShadow: "inset 0 1px 0 rgba(255,255,255,.45),0 18px 40px -16px var(--ml-accent)", transition: "transform .3s var(--glass-spring),box-shadow .3s,filter .2s"}} className="mla5">{" "}{(loading) ? (<><span style={{width: "18px", height: "18px", borderRadius: "99px", border: "2px solid rgba(20,17,24,.22)", borderTopColor: "#141118", animation: "ml-spin .7s linear infinite"}}></span></>) : null}{cta}{" "}</button>{" "}</form>{" "}{(showGoogle) ? (<>{" "}<div style={{display: "flex", alignItems: "center", gap: "14px", margin: "20px 0", font: "550 12px var(--font-sans)", color: "var(--ml-ink-3)"}}><span style={{flex: "1", height: "1px", background: "var(--ml-line)"}}></span>o<span style={{flex: "1", height: "1px", background: "var(--ml-line)"}}></span></div>{" "}<button type="button" onClick={(google)} disabled={(loading)} style={{width: "100%", height: "54px", border: "none", borderRadius: "999px", background: "var(--ml-field)", color: "var(--ml-ink)", font: "600 15px var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", boxShadow: "0 0 0 1px var(--ml-line)", transition: "transform .3s var(--glass-spring),box-shadow .2s"}} className="mla6">{" "}<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>{" "}{googleLabel}{" "}</button>{" "}</>) : null}{" "}<div style={{marginTop: "22px", textAlign: "center", font: "500 13px/1.5 var(--font-sans)", color: "var(--ml-ink-2)"}}>{" "}{" "}{(isLogin) ? (<>¿Todavía no tenés tu myLand? <button type="button" onClick={(goRegister)} style={{border: "none", background: "none", padding: "0", cursor: "pointer", font: "700 13px var(--font-sans)", color: "var(--ml-link)"}}>Reclamalo</button></>) : null}{" "}{(isReset) ? (<><button type="button" onClick={(goLogin)} style={{border: "none", background: "none", padding: "0", cursor: "pointer", font: "700 13px var(--font-sans)", color: "var(--ml-ink)"}}>Volver a entrar</button></>) : null}{" "}</div>{" "}</div>{" "}</>) : null}{" "}{(sent) ? (<>{" "}<div style={{display: "flex", flexDirection: "column", alignItems: "flex-start", animation: "ml-fade .5s both"}}>{" "}<div style={{width: "72px", height: "72px", borderRadius: "24px", display: "grid", placeItems: "center", background: "#FFE14D", color: "#141118", transform: "rotate(-6deg)", animation: "ml-pop .6s var(--glass-spring) both"}}><DsIcon name="mail" size={28}></DsIcon></div>{" "}<h1 style={{margin: "26px 0 0", fontFamily: "var(--ml-display)", fontWeight: "800", fontSize: "clamp(30px,3.2vw,40px)", lineHeight: ".95", letterSpacing: "-0.045em", textTransform: "uppercase"}}>Revisá tu email</h1>{" "}<p style={{margin: "12px 0 0", font: "500 15px/1.5 var(--font-sans)", color: "var(--ml-ink-2)"}}>{sentText} <span style={{color: "var(--ml-ink)", fontWeight: "700", overflowWrap: "anywhere"}}>{sentEmail}</span>.</p>{" "}<a href="https://mail.google.com" target="_blank" style={{marginTop: "28px", width: "100%", height: "58px", borderRadius: "999px", background: "var(--ml-accent)", color: "#141118", font: "750 16px var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>Abrir mi email<DsIcon name="arrow-up-right" size={17}></DsIcon></a>{" "}<div style={{marginTop: "10px", width: "100%", display: "flex", gap: "8px"}}>{" "}<button type="button" onClick={(resend)} disabled={(resendDisabled)} style={{flex: "1", height: "50px", border: "none", borderRadius: "999px", background: "var(--ml-field)", boxShadow: "0 0 0 1px var(--ml-line)", color: (resendColor), font: "600 14px var(--font-sans)", cursor: "pointer"}}>{resendLabel}</button>{" "}<button type="button" onClick={(backToForm)} style={{flex: "1", height: "50px", border: "none", borderRadius: "999px", background: "var(--ml-field)", boxShadow: "0 0 0 1px var(--ml-line)", color: "var(--ml-ink)", font: "600 14px var(--font-sans)", cursor: "pointer"}}>Usar otro email</button>{" "}</div>{" "}<p style={{margin: "20px 0 0", font: "500 13px/1.5 var(--font-sans)", color: "var(--ml-ink-2)"}}>¿No llega? Fijate en spam o promociones.</p>{" "}</div>{" "}</>) : null}{" "}</div></div>{" "}</main>{" "}{(intro) ? (<>{" "}<div ref={(introRef)} style={{position: "fixed", inset: "0", zIndex: "100", background: "#FF4F94", color: "#141118", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center"}}>{" "}<div style={{height: "30px", padding: "0 12px", display: "flex", alignItems: "center", borderRadius: "999px", background: "#141118", color: "#fff", font: "600 12px var(--font-mono)", letterSpacing: ".1em"}}>RESERVADO</div>{" "}<div style={{marginTop: "22px", font: "700 clamp(22px,3vw,40px)/1 var(--font-sans)", letterSpacing: "-0.03em", opacity: ".6"}}>myland.lol/</div>{" "}<div style={{fontFamily: "var(--ml-display)", fontWeight: "800", fontSize: "clamp(48px,11vw,190px)", lineHeight: ".95", letterSpacing: "-0.045em", maxWidth: "100%", overflowWrap: "anywhere"}}>{stageHandle}</div>{" "}<div style={{marginTop: "36px", width: "min(280px,60vw)", height: "4px", borderRadius: "9px", background: "#141118"}}></div>{" "}</div>{" "}</>) : null}{" "}{(success) ? (<>{" "}<div ref={(okRef)} style={{position: "fixed", inset: "0", zIndex: "100", background: "#FFE14D", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "22px", padding: "24px", textAlign: "center", overflow: "hidden"}}>{" "}{(((burst)) || []).map((b: any, $index: number) => (<React.Fragment key={$index}><span data-burst="1" aria-hidden="true" style={{position: "absolute", left: "50%", top: "50%", width: (b.s), height: (b.s), margin: (b.m), borderRadius: "50%", background: (b.bg), pointerEvents: "none"}}></span></React.Fragment>))}{" "}<img src="/landing/logo.png" alt="" style={{width: "92px", height: "auto", animation: "ml-pop .7s var(--glass-spring) both"}} />{" "}<div style={{fontFamily: "var(--ml-display)", fontWeight: "800", fontSize: "clamp(36px,6vw,88px)", lineHeight: ".92", letterSpacing: "-0.045em", textTransform: "uppercase", animation: "ml-fade .6s .2s both"}}>Entrando a tu sala</div>{" "}<div style={{width: "min(240px,60vw)", height: "4px", borderRadius: "9px", background: "rgba(20,17,24,.15)", overflow: "hidden"}}><div ref={(outBarRef)} style={{height: "100%", width: "0", background: "#141118"}}></div></div>{" "}</div>{" "}</>) : null}{" "}</div>{" "}
</div>
    );
  }
}
