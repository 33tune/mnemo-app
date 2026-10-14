# MYLAND Design System

**MYLAND** (myLand; codebase *mnemo*) is a customizable profile canvas: each user builds a **sala** (room) — a free canvas with a **ProfileCard** (photo, name, @handle, phrase, location, bio, views, links, logo) plus free texts, images and music players. The **editor** is where they build it.

This system defines **one** visual language for the editor: **Liquid glass** — icon-first, direct-manipulation menus on a tinted glass layer, with one accent (Rosa). It replaces the previous flat/monochrome inspector. Nothing in the repository has been changed yet; this is the target to apply.

## Sources
- GitHub: **https://github.com/33tune/mnemo-app** (`main`). Explore it to see the current implementation this system evolves: `src/ui/` (tokens.ts, editor.css, primitives), `src/components/canvas/` (inspectors, CanvasBoard, ProfileCard) and `docs/ux/menu-redesign/`.

## Index
- `styles.css` — entry (@imports only).
- `tokens/` — `fonts.css`, `colors.css` (brand + graphite), `glass.css` (material + themes: `data-editor-theme="dark" | "light"`), `typography.css`, `spacing.css`, `motion.css`.
- `components/glass.css` — all component states and animations.
- `components/core/Icon.jsx` — icon set.
- `components/glass/` — `GlassPanel.jsx` (GlassPanel, GlassButton, LiquidSlider, IconTabs, PartPicker, ColorRibbon, LiquidSwitch, ControlTiles, GlassToolbar, GlassRail, GlassToast), `FontSelect.jsx` (+ GOOGLE_CATALOG, loadGoogleFont), `ColorPopover.jsx` (+ useDismiss), `ContextMenu.jsx`.
- `guidelines/` — foundation cards (colors, type, spacing, motion, brand).
- `ui_kits/editor/index.html` — the interactive editor.
- `assets/` — `logo.png`, `favicon.png`, `ld-card-user.png` (sample profile photo).
- `SKILL.md`, `github.md`, `thumbnail.html`.

## Principles
1. **See it, don't read it.** Icons, previews and the user's real text replace labels and explanations. A control explains itself or it has a tooltip — never a paragraph.
2. **Direct manipulation.** The whole slider capsule is the control; tiles toggle on tap; parts are picked by touching them on the card or in the picker.
3. **One thing selected, one panel.** Pick a part → its controls. Tabs only when a part has two genuinely different jobs (Estilo / Efectos).
4. **Every action answers.** Indicators glide, tiles light up, values tick, toasts confirm — and destructive actions can be undone from the toast.
5. **Progressive disclosure.** Each tile hides its parameters behind a chevron; nothing advanced is removed, it just waits.
6. **Glass only on the floating layer.** Panels, rail, toolbar, menus, toasts. Never glass on glass; inner controls are flat wells.

## Content fundamentals
- **Spanish, rioplatense voseo**: "Tocá algo para editarlo", "Subí tu logo", "Soltá para agregar a tu sala", "Contá algo de vos".
- Second person singular; possessives "tu sala", "tu perfil". Never "usted", never "nosotros".
- **Sentence case**, one or two words per control: Tamaño, Peso, Espaciado, Brillo, Sombra, Flotar. No "Activar …" — the tile is the activation.
- Object names, not property names: Nombre, @usuario, Frase, Ubicación, Bio, Visitas, Foto, Links, Logo, Fondo, Efectos.
- States are short and past-tense in toasts: "Duplicado", "Bloqueado", "Imagen eliminada · Deshacer", "Publicado en tu perfil".
- Shortcuts live in tooltips ("Deshacer   ⌘Z"), never in labels.
- **No emoji, no unicode-as-icon.** Wordmark is `myLand`.

## Visual foundations
- **Material**: graphite glass (dark, default) `rgba(24,21,29,.60)` + `blur(28px) saturate(190%)`, 0.5px light edge, long soft plum-black shadow. Light theme: pearl glass `rgba(253,251,253,.66)`.
- **Colour**: chrome is plum-tinted graphite — warmer than grey, never blue. **One accent, Rosa** `#FF4F94` (light `#D42A70`): on tiles, switches, slider knob/fill, Publicar, the modified dot, canvas selection. Selected-but-not-active (tabs, part picker, rail) uses the neutral `--glass-on` (near-white / near-black). Focus is lilac `#B9A2FF` (light `#7C5CFF`). Danger red appears only on hover/in menus. Saved = green dot.
- **The user's colours** appear only in swatches, previews, the card itself and part thumbnails.
- **Type**: Geist for all UI (title 19/650 −0.02em, body 15, control 14/550, label 13/600, caption 12). Geist Mono for numbers. Bricolage Grotesque 800 only for the `myLand` wordmark. Canvas fonts never enter chrome.
- **Shape**: continuous, generous radii — 10 menu item, 16 control/field, 20 tile, 22 popover, 30 panel, capsules everywhere else.
- **Layout**: floating, 16px from every edge: brand capsule top-left, actions capsule top-right (slides left when the dock opens), vertical rail centre-left, 344px dock right. The canvas offsets so the dock never covers the card.
- **Hit targets** ≥ 44px. Secondary buttons 36.
- **Motion**: springs `(.34,1.56,.64,1)` for anything touched (press 0.86–0.95), soft spring for panels, ease-out for content. Shared gliding indicators; directional content swaps; tile light sweep; slider rubber-band + value tick; cascading menu items; toast in/out. Reduced motion → instant; reduced transparency → solid fills.
- **Hover**: well steps up one level. **Press**: spring shrink. **Focus**: 2px gap + 2px lilac ring.
- **Imagery**: the editor ships none. Users upload their own (file picker or drop anywhere on the sala).

## Iconography
- Editor's own SVG set (`src/ui/icons/index.tsx`) copied path-for-path into `components/core/Icon.jsx`: 16px grid, 1.5 stroke, round caps, currentColor.
- **Substitution (flagged)**: glyphs the repo lacks (text, image, music, copy, sparkles, star, platform icons…) come from **Lucide** (lucide-static 0.460, unpkg), inlined at matching stroke.
- 17px in controls, 19px in the rail, 15px in menus/toasts. Icon-only controls always carry a tooltip that is also the accessible name.

## Fonts
Google Fonts only (Geist, Geist Mono, Bricolage Grotesque; canvas fonts DM Sans, Space Mono, Newsreader, Playfair, Bebas Neue, Syne, Archivo, Pacifico, Great Vibes). FontSelect can install any other Google family or a user-uploaded TTF/OTF/WOFF at runtime.
