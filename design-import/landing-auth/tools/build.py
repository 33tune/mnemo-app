import json, re, subprocess, sys

OUT = "out"


def must(s, a, b, count=1):
    assert a in s, a[:120]
    return s.replace(a, b, count)


def used_names(tpl):
    r = subprocess.run(["python3", "dc2tsx.py", tpl, "/dev/null", "/dev/null", "x"], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)["used"]


RESERVED = '"login","dashboard","auth","api","admin","settings","myland","browse","setup","space","reset-password","landing"'


def component(js, jsx, used, name, header, defaults, extra_methods=""):
    js = must(js, "class Component extends DCLogic {", f"class {name} extends React.Component<any, any> {{")
    js = js.replace('await import("https://esm.sh/three@0.160.0")', 'await import("three")')
    js = js.replace('"assets/', '"/landing/').replace("url(assets/", "url(/landing/").replace("'assets/", "'/landing/")
    if extra_methods:
        js = js.rstrip().rstrip("}") + extra_methods + "\n}\n"
    jsx = jsx.replace('src="assets/', 'src="/landing/').replace('"url(assets/', '"url(/landing/')
    decl = ", ".join(used)
    render = (
        "\n  render() {\n"
        f"    const __v: any = {{ ...{json.dumps(defaults)}, ...this.props, ...this.renderVals() }};\n"
        f"    const {{ {decl} }} = __v;\n"
        "    return (\n<div className=\"ml-site\">\n" + jsx + "\n</div>\n    );\n  }\n"
    )
    js = js.rstrip()
    assert js.endswith("}")
    js = js[:-1] + render + "}\n"
    return header + js


# ── Landing ─────────────────────────────────────────────────────────────────
js = open("v9.js").read()
jsx = open("v9.jsx").read()
used = used_names("v9.tpl.html")
js = must(js, 'TAKEN = new Set(["login","dashboard","auth","api","admin","settings","myland","nico","ana","sofi","juan"]);',
          f"TAKEN = new Set([{RESERVED}]);")
# The name check is real: reserved routes here, the profiles table through props.checkHandle.
js = must(js, 'this.ht = setTimeout(() => this.setState({ status: this.TAKEN.has(h) ? "taken" : "ok" }), 520);',
          'this.ht = setTimeout(async () => { const st = this.TAKEN.has(h) ? "taken" : await this.props.checkHandle(h); if (this.state.handle === h) this.setState({ status: st }); }, 520);')
js = must(js, 'location.href = "Auth v4.dc.html?mode=register&from=claim&handle=" + encodeURIComponent(this.state.handle);',
          'this.props.navigate("/login?mode=register&from=claim&handle=" + encodeURIComponent(this.state.handle));')
jsx = must(jsx, 'href="Auth v4.dc.html?mode=login"', 'href="/login?mode=login"')
jsx = must(jsx, '<a href="#" style={{color: "rgba(255,255,255,.85)"}} data-en="Privacy">Privacidad</a><a href="#" style={{color: "rgba(255,255,255,.85)"}} data-en="Terms">Términos</a>', "")
hdr = '''// @ts-nocheck — generated from the Claude Design file "Landing v9"
// (design-import/landing-auth/Landing v9.dc.html; project
// https://claude.ai/design/p/d3083c63-8eb8-4522-8b29-097c7c97649b). The logic
// class and the template are the design's own, converted 1:1 (template ->
// JSX); app wiring: the name check (props.checkHandle), "Reclamar" and
// "Entrar" go to /login, assets under /landing, three.js from npm.
"use client";
import React from "react";
import { Icon as DsIcon, LiquidSlider as DsLiquidSlider, IconTabs as DsIconTabs, ColorRibbon as DsColorRibbon, ControlTiles as DsControlTiles, GlassToast as DsGlassToast } from "./ds";

export default '''
open(f"{OUT}/LandingPage.tsx", "w").write(component(js, jsx, used, "LandingPage", hdr,
    {"displayFont": "Archivo", "decor": True, "howVideo": "", "mobileDock": True}))

# ── Auth ────────────────────────────────────────────────────────────────────
js = open("a4.js").read()
jsx = open("a4.tpl.html") and open("a4.jsx").read()
used = used_names("a4.tpl.html")
js = must(js, 'TAKEN = new Set(["login","dashboard","auth","api","admin","settings","myland","nico","ana","sofi","juan"]);',
          f"TAKEN = new Set([{RESERVED}]);")
# The handle in the URL (from the landing's claim) is checked for real too.
js = must(js, 'hStatus: h.length >= 3 ? (this.TAKEN.has(h) ? "taken" : "ok") : "idle"',
          'hStatus: h.length >= 3 ? (this.TAKEN.has(h) ? "taken" : "checking") : "idle"')
js = must(js, "    if (this.state.intro) this.playIntro();",
          '    if (this.state.hStatus === "checking") this.checkHandle(this.state.handle);\n    if (this.state.intro) this.playIntro();')
js = must(js, 'this.ht = setTimeout(() => this.setState({ hStatus: this.TAKEN.has(h) ? "taken" : "ok" }), 500);',
          'this.ht = setTimeout(() => this.checkHandle(h), 500);')
# Real auth instead of the design's timers.
js = must(js, '''    this.setState({ loading: true });
    this.t = setTimeout(() => {''', '''    this.setState({ loading: true });
    this.doAuth(s.mode);
    if (false) this.t = setTimeout(() => {''')
js = must(js, 'google: e => { if (e && e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); this.btnPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } this.setState({ gLoading: true }); this.t = setTimeout(() => this.setState({ gLoading: false, success: true }), 1400); },',
          'google: e => { if (e && e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); this.btnPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } this.setState({ gLoading: true, error: "" }); this.props.auth.google().then(err => { if (err) this.fail(err, "network"); }); },')
js = must(js, "resend: () => this.setState({ resendIn: 30 }, () => this.tick()),",
          'resend: () => { if (this.state.resendIn > 0) return; this.props.auth.resend(this.state.mode, this.state.email).then(err => err ? this.setState({ sent: false, error: err, errorKind: "network" }) : this.setState({ resendIn: 30 }, () => this.tick())); },')
js = must(js, 'intro: q.get("from") === "claim" && h.length >= 3, resendIn: 0 };',
          'intro: q.get("from") === "claim" && h.length >= 3, resendIn: 0 };\n    // The OAuth callback sends ?error=auth when Google sign-in failed.\n    if (props.initialError) Object.assign(this.state, { mode: "login", error: props.initialError, errorKind: "" });')
methods = '''
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
  }'''
js = js.replace("clearTimeout(this.t); clearTimeout(this.ht);", "clearTimeout(this.t); clearTimeout(this.ht); clearTimeout(this.goT);")
jsx = must(jsx, 'href="Landing v9.dc.html"', 'href="/"')
jsx = re.sub(r'\{\(isRegister\) \? \(<>Al crear tu cuenta aceptás los .*?</>\) : null\}', "", jsx, count=1, flags=re.S)
assert "Términos" not in jsx
hdr = '''// @ts-nocheck — generated from the Claude Design file "Auth v4"
// (design-import/landing-auth/Auth v4.dc.html). The logic class and the
// template are the design's own, converted 1:1; app wiring: Supabase auth
// through props.auth (email + password, Google, reset, resend), the real
// name check (props.checkHandle) and navigation (props.navigate).
"use client";
import React from "react";
import { Icon as DsIcon, IconTabs as DsIconTabs } from "./ds";

export default '''
open(f"{OUT}/AuthPage.tsx", "w").write(component(js, jsx, used, "AuthPage", hdr, {"displayFont": "Unbounded", "decor": True}, methods))
print("ok")
