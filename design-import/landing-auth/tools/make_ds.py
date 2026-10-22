"""Extract Icon + the Liquid glass primitives from the design system bundle
into src/components/site/ds.tsx (out/ds.tsx), inlining the Lucide glyphs
(lucide/package/icons, lucide-static 0.460.0) instead of fetching unpkg."""
import glob, json, re
B = glob.glob("Myland landing y auth/_ds/*/_ds_bundle.js")[0]
src = open(B, encoding="utf8").read()


def module(path):
    m = re.search(r"// " + re.escape(path) + r"\ntry \{ \(\(\) => \{\n([\s\S]*?)\n\}\)\(\); \} catch", src)
    return m.group(1)


icon = module("components/core/Icon.jsx")
glass = module("components/glass/GlassPanel.jsx")
icon = re.sub(r"Object\.assign\(__ds_scope,[^\n]*\n?", "", icon)
glass = re.sub(r"Object\.assign\(__ds_scope,[^\n]*\n?", "", glass).replace("__ds_scope.Icon", "Icon")
lucide_map = dict(re.findall(r'^\s+"?([a-z-]+)"?: "([a-z0-9-]+)",?$', icon[icon.index("const LUCIDE = {"):icon.index("};", icon.index("const LUCIDE = {"))], re.M))
needed = set(lucide_map.values()) | {"arrow-right", "arrow-up-right", "mail", "play", "pause", "sun", "moon", "check", "eye", "eye-off", "wand-sparkles", "x"}
svgs = {}
for f in sorted(needed):
    try:
        svgs[f] = re.sub(r"<!--[\s\S]*?-->", "", open(f"lucide/package/icons/{f}.svg").read()).strip()
    except FileNotFoundError:
        pass
start, end = icon.index("const LUCIDE_BASE"), icon.index("function LucideIcon(")
icon = (icon[:start] + "const LUCIDE_SVG: Record<string, string> = " + json.dumps(svgs, indent=0)
        + ";\nconst ICON_NAMES = [...Object.keys(PATHS), ...Object.keys(LUCIDE)];\nfunction loadLucide(file) {\n  return Promise.resolve(LUCIDE_SVG[file] || \"\");\n}\n" + icon[end:])
icon = icon.replace('const [svg, setSvg] = React.useState("");',
                    'const svg0 = (LUCIDE_SVG[file] || "").replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`).replace(/stroke-width="2"/, `stroke-width="${1.5 * 24 / size}"`).replace(/class="[^"]*"/, "");\n  const [svg, setSvg] = React.useState(svg0);')
hdr = '''// @ts-nocheck — ported verbatim from the MYLAND design system bundle
// (design-import/landing-auth/_ds/…/_ds_bundle.js: components/core/Icon.jsx and
// components/glass/GlassPanel.jsx). Only change: the Lucide glyphs are inlined
// (lucide-static 0.460.0, ISC) instead of fetched from unpkg at runtime.
"use client";
import React from "react";

'''
open("out/ds.tsx", "w").write(hdr + icon + "\n\n" + glass + "\n\nexport { Icon, LiquidSlider, IconTabs, ColorRibbon, ControlTiles, GlassToast };\n")
