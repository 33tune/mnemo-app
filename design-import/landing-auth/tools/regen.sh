#!/usr/bin/env bash
# Regenerates src/components/site/{LandingPage,AuthPage}.tsx, ds.tsx and
# site.css from the Claude Design files in this folder. After a new export
# from Claude Design: replace "Landing v9.dc.html" / "Auth v4.dc.html" (and
# _ds/), run this, then check the diff and the pages in a browser.
# Needs: python3, and lucide-static@0.460.0 (npm pack) for the inlined icons.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../../.."
W="$(mktemp -d)"; cp "$HERE"/*.py "$W/"; cd "$W"
ln -s "$HERE/.." "Myland landing y auth"
python3 split.py "Myland landing y auth/Landing v9.dc.html" v9
python3 split.py "Myland landing y auth/Auth v4.dc.html" a4
mkdir -p lucide out && (cd lucide && npm pack lucide-static@0.460.0 --silent >/dev/null && tar -xzf lucide-static-0.460.0.tgz)
python3 dc2tsx.py v9.tpl.html v9.jsx v9.hover.css mlh >/dev/null
python3 dc2tsx.py a4.tpl.html a4.jsx a4.hover.css mla >/dev/null
python3 make_ds.py
python3 build.py >/dev/null
DS="Myland landing y auth/_ds/$(ls "Myland landing y auth/_ds" | head -1)"
sed -E "s/--font-display:[^;]*;//; s/--font-sans:[^;]*;//; s/--font-mono:[^;]*;//" "$DS/tokens/typography.css" > typo.css
python3 scope_css.py .ml-site "$DS/tokens/colors.css" "$DS/tokens/glass.css" typo.css "$DS/tokens/spacing.css" "$DS/tokens/motion.css" "$DS/components/glass.css" out/ds.css
python3 scope_css.py .ml-site v9.helmet.css v9.hover.css out/landing.css
python3 scope_css.py .ml-site a4.helmet.css a4.hover.css out/auth.css
S="$ROOT/src/components/site"
cp out/ds.tsx out/LandingPage.tsx out/AuthPage.tsx "$S/"
{ echo "/* MYLAND site (landing + auth) — Claude Design \"Landing v9\" / \"Auth v4\" and the"; echo "   MYLAND design system CSS, scoped under .ml-site so nothing reaches the editor"; echo "   (generated: :root/html/body -> .ml-site; style-<pseudo> -> classes). */"; cat out/ds.css out/landing.css out/auth.css; } > "$S/site.css"
echo "regenerated $S"
