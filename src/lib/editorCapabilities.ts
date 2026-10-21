/**
 * Menu redesign, Phase 1 (Cimientos) — the CAPABILITY → UI ROUTE matrix.
 *
 * Every persisted field of every editable object (ProfileCard, its effects,
 * per-role text effects, block styles, Music and Music's effects) is listed
 * here with ONE of:
 * - route:       where the user edits it today (`ui`) + evidence in the
 *                source that a control writes it (`evidence`: [file, text]);
 * - superseded:  a legacy field whose capability now lives at `by` (which
 *                must itself be a route — read-effective/write-raw);
 * - system:      written by the app, not a user setting (ids, stacking,
 *                the always-centered ProfileCard position…);
 * - retired:     deliberately not editable (product decision or legacy
 *                data kept only for compat), with the reason;
 * - unsupported: this OWNER does not offer it (caps): e.g. Music has no
 *                PFP. Parity gaps the effect tiles (Phase 4) can close.
 *
 * Exhaustive BY TYPE: the maps are `Record<every leaf path of the data
 * type, Capability>`, so adding a field to src/types without deciding its
 * place here fails `tsc`. editorCapabilities.test.ts then proves every
 * route against the real source, so moving or deleting a control without
 * updating its route fails `npm test` — "un campo editable sin lugar en la
 * interfaz" can't ship silently through the redesign phases.
 *
 * This is a COVERAGE CONTRACT, not a UI generator: per CLAUDE.md there are
 * no schema-generated menus and no object registry — nothing renders from
 * this file. When a phase moves a control (facets → object list → tiles),
 * it updates the route's `ui` and `evidence` here.
 */
import type { BlockStyleKey, BlockStyleOverride, CanvasImage, CanvasText, CardEffects, MusicCardData, ProfileCardData, RoleTextEffect, TextRole } from "@/types";

// ── Types ───────────────────────────────────────────────────────────────────

export type Evidence = readonly [file: string, text: string];

export type Capability =
  | { kind: "route"; ui: string; evidence: readonly Evidence[] }
  | { kind: "superseded"; by: string; why: string }
  | { kind: "system"; why: string }
  | { kind: "retired"; why: string }
  | { kind: "unsupported"; why: string };

type Leaf = string | number | boolean | readonly unknown[];
/** Every leaf path of T ("bg.color", "retro.flicker.speed", …). */
export type LeafPaths<T, P extends string = ""> = {
  [K in keyof T & string]-?: NonNullable<T[K]> extends Leaf ? `${P}${K}` : LeafPaths<NonNullable<T[K]>, `${P}${K}.`>;
}[keyof T & string];

/** effects.paused is the editor's stash (not a capability); textRoles is
 * per role (ROLE_EFFECT_CAPS). */
export type EffectLeaf = LeafPaths<Omit<CardEffects, "paused" | "textRoles">>;
export type RoleEffectLeaf = LeafPaths<RoleTextEffect>;
/** effects/blockStyle have their own maps; `music` is one deprecated blob. */
export type ProfileFieldPath = LeafPaths<Omit<ProfileCardData, "effects" | "blockStyle" | "blockStylePaused" | "music">> | "music";
export type MusicFieldPath = LeafPaths<Omit<MusicCardData, "effects">>;
/** Editor v3 Phase G: free texts and images (their inspectors in the dock). */
export type TextFieldPath = LeafPaths<CanvasText>;
export type ImageFieldPath = LeafPaths<CanvasImage>;

// ── Builders ────────────────────────────────────────────────────────────────

const C = "src/components/canvas/";
const at = (file: string) => (ui: string, ...texts: string[]): Capability =>
  ({ kind: "route", ui, evidence: texts.map(t => [`${C}${file}`, t] as const) });
const route = (ui: string, ...evidence: Evidence[]): Capability => ({ kind: "route", ui, evidence });
const ev = (file: string, text: string): Evidence => [`${C}${file}`, text];
const by = (path: string, why: string): Capability => ({ kind: "superseded", by: path, why });
const system = (why: string): Capability => ({ kind: "system", why });
const retired = (why: string): Capability => ({ kind: "retired", why });
const unsupported = (why: string): Capability => ({ kind: "unsupported", why });

const content  = at("ProfileIdentityMenu.tsx");
const meta     = at("ProfileMetadataMenu.tsx");
const links    = at("ProfileContactLinksMenu.tsx");
const logo     = at("ProfileLogoMenu.tsx");
const btns     = at("ProfileLinkButtonsMenu.tsx");
const config   = at("ProfileConfigMenu.tsx");
const type     = at("ProfileTypographyMenu.tsx");
const bgMenu   = at("ProfileBackgroundMenu.tsx");
const fxMenu   = at("ProfileEffectsMenu.tsx");
const card     = at("ProfileCard.tsx");
// Editor v3 Phase G (D8): Music is edited in the dock (MusicInspector), its
// floating MenuPanel is gone; Medidas / Capa / Bloquear of every element
// inspector share ElementInspectorParts.
const music    = at("MusicInspector.tsx");
const parts    = at("ElementInspectorParts.tsx");
const textInsp = at("TextInspector.tsx");
const imgInsp  = at("ImageInspector.tsx");

// Menu redesign Phase 2: routes are OBJECT paths — "Card de presentación ›
// <object caption> › <section> › <control>" (the object captions of
// inspectorObjects.ts; the matrix test checks that each route's evidence
// lives in a file that object mounts — OBJECT_FILES).
export const P = "Card de presentación";
const obj = (caption: string) => `${P} › ${caption}`;
const NOMBRE = obj("Nombre"), USUARIO = obj("@usuario"), FRASE = obj("Frase"), UBICACION = obj("Ubicación");
const BIO = obj("Bio"), SOBRE_MI = obj("Sobre mí"), VISITAS = obj("Visitas"), FOTO_OBJ = obj("Foto"), LINKS = obj("Links"), LOGO = obj("Logo");
const FONDO = obj("Fondo de la card");
const BOTONES = obj("Botones");
const EFECTOS = obj("Efectos de la card");
const TODOS = obj("Todos los textos");
const TIPO = "Tipografía";
const COLOR = "Color";
const FX_TEXTO = "Efectos del texto";
export const LIENZO = "Lienzo (arrastrar)";
/** Editor v3 Phase E: the Layers panel (room level, like the canvas). */
export const CAPAS = "Capas";

const LEGACY_POS = "pre-composition position/scale (Stage 3 replaced it with block anchors); kept for old data";
// Free layout engine (2026-10-15): one drag for every block (startPartDrag);
// the drop saves every block's position in one patch (positionsPatch).
const BLOCK_DRAG = (block: string) => card(`${LIENZO} › bloque ${block}`, "onMouseDown={down(\"" + block + "\")}", "positionsPatch(card, done, card.w, h)");
const TEXT_PER_ROLE = "per-text effects (2026-10-14): legacy card-wide value, rendered by every role without its own and split into the roles on the first edit — edited in each text's Efectos del texto";
const ROLE_COLOR = "text color is owned by each role (its object › Color › Color — Block 1: una propiedad, un dueño)";

// ── ProfileCard fields ──────────────────────────────────────────────────────

export const PROFILE_CARD_CAPS: Record<ProfileFieldPath, Capability> = {
  id: system("record identity, assigned on creation"), userId: system("owner account, assigned on creation"),
  x: system("centerCardPosition(): ProfileCard is always centered; the inspector never writes x/y"),
  y: system("centerCardPosition(): ProfileCard is always centered; the inspector never writes x/y"),
  w: config(`${FONDO} › Medidas › Ancho · handles de resize`, "onChange({ w: c.w, h: c.h"),
  h: config(`${FONDO} › Medidas › Alto · handles de resize`, "onChange({ w: c.w, h: c.h"),
  // Editor v3 Phase E: the card's stacking against free elements, in Capas.
  zIndex: route(`${CAPAS} › Orden`, ev("CanvasBoard.tsx", "onMove: (id: string, to: number) => applyLayerChange(id, moveWithinLayer(layerItemsNow(), id, to))")),
  layer: route(`${CAPAS} › Capa`, ev("CanvasBoard.tsx", "onSetLayer: (id: string, layer: 0 | 1 | 2) => applyLayerChange(id, setElementLayer(layerItemsNow(), id, layer))")),
  depth: system("parallax depth of the element"),
  rotation: unsupported("ProfileCard is fixed and centered (no rotation)"),
  format: retired("only a soft FORMAT_BIAS tie-break since C.2.2; no longer chosen in the UI"),
  sizeScale: retired("legacy scale, replaced by free width/height"),
  pfpAnchorX: BLOCK_DRAG("pfp"), pfpAnchorY: BLOCK_DRAG("pfp"),
  blockLayout: system("set with the positions when a drag ends (profileCardLayout.ts positionsPatch)"),
  "blockWidths.identity": system("width the engine gave a block to fit (positionsPatch)"),
  "blockWidths.location": system("width the engine gave a block to fit (positionsPatch)"),
  "blockWidths.views": system("width the engine gave a block to fit (positionsPatch)"),
  "blockWidths.links": system("width the engine gave a block to fit (positionsPatch)"),
  "blockWidths.buttons": system("width the engine gave a block to fit (positionsPatch)"),
  "blockWidths.about": system("width the engine gave a block to fit (positionsPatch)"),
  pfpSizePx: content(`${FOTO_OBJ} › Forma › Tamaño`, "id.setPfpSize(v)"),
  pfpRadius: content(`${FOTO_OBJ} › Forma › Forma`, "id.setPfpRadius(v)"),
  textAlign: type(`${TODOS} › Alineación y espaciado › Alineación`, "onChange({ textAlign: v"),
  identityAnchorX: BLOCK_DRAG("identity"), identityAnchorY: BLOCK_DRAG("identity"),
  locationAnchorX: BLOCK_DRAG("location"), locationAnchorY: BLOCK_DRAG("location"),
  viewsAnchorX: BLOCK_DRAG("views"), viewsAnchorY: BLOCK_DRAG("views"),
  linksAnchorX: BLOCK_DRAG("links"), linksAnchorY: BLOCK_DRAG("links"),
  contactLinks: links(`${LINKS}`, "linksCtl.add(url)", "linksCtl.remove(id)"),
  linksIconSize: links(`${LINKS} › Íconos › Tamaño`, "linksCtl.setIconSize(v)"),
  linksIconOpacity: links(`${LINKS} › Íconos › Opacidad`, "linksCtl.setIconOpacity(v)"),
  // Link buttons (Linktree-style, 2026-10-14).
  linkButtons: btns(`${BOTONES}`, "ctl.add(label.trim() || u.replace", "ctl.remove(id)", "ctl.move(from, to)", "ctl.update(editingId, { label: draft.label.trim()"),
  "linkButtonStyle.shape": btns(`${BOTONES} › Estilo › Forma`, 'ctl.setStyle({ shape: v as LinkButtonStyle["shape"] })'),
  "linkButtonStyle.fill": btns(`${BOTONES} › Estilo › Relleno`, 'ctl.setStyle({ fill: v as LinkButtonStyle["fill"] })'),
  "linkButtonStyle.color": btns(`${BOTONES} › Estilo › Color del botón`, "ctl.setStyle({ color: v })"),
  "linkButtonStyle.textColor": btns(`${BOTONES} › Estilo › Color del texto`, "ctl.setStyle({ textColor: v })"),
  "linkButtonStyle.font": btns(`${BOTONES} › Estilo › Fuente`, "ctl.setStyle({ font: v })"),
  "linkButtonStyle.fontSize": btns(`${BOTONES} › Estilo › Tamaño`, "ctl.setStyle({ fontSize: v })"),
  "linkButtonStyle.fontWeight": btns(`${BOTONES} › Estilo › Peso`, "ctl.setStyle({ fontWeight: v })"),
  "linkButtonStyle.showIcon": btns(`${BOTONES} › Estilo › Ícono de la red`, "ctl.setStyle({ showIcon: v ? undefined : false })"),
  "linkButtonStyle.width": btns(`${BOTONES} › Distribución › Ancho`, 'ctl.setStyle({ width: v as LinkButtonStyle["width"] })'),
  "linkButtonStyle.gap": btns(`${BOTONES} › Distribución › Separación`, "ctl.setStyle({ gap: v })"),
  "linkButtonStyle.hover.lift": btns(`${BOTONES} › Al pasar el cursor › Elevar`, "ctl.setHover({ lift: v ? undefined : false })"),
  "linkButtonStyle.hover.glow": btns(`${BOTONES} › Al pasar el cursor › Brillo`, "ctl.setHover({ glow: v || undefined })"),
  "linkButtonStyle.hover.invert": btns(`${BOTONES} › Al pasar el cursor › Invertir`, "ctl.setHover({ invert: v || undefined })"),
  buttonsAnchorX: BLOCK_DRAG("buttons"), buttonsAnchorY: BLOCK_DRAG("buttons"),
  musicAnchorX: retired("Music left ProfileCard (Product closeout) — deprecated, nothing reads it"),
  musicAnchorY: retired("Music left ProfileCard (Product closeout) — deprecated, nothing reads it"),
  music: retired("Music is an independent canvas element now (MusicCardData)"),
  musicWidth: retired("Music left ProfileCard (Product closeout) — deprecated, nothing reads it"),
  "logo.url": logo(`${LOGO} › Subir`, "logoCtl.setImage(publicUrl)"),
  "logo.anchorX": card(`${LIENZO} › logo`, "anchorX: latest.x"),
  "logo.anchorY": card(`${LIENZO} › logo`, "anchorY: latest.y"),
  "logo.w": logo(`${LOGO} › Ancho`, "logoCtl.patch({ w: v })"),
  "logo.h": logo(`${LOGO} › Alto`, "logoCtl.patch({ h: v })"),
  "logo.opacity": logo(`${LOGO} › Opacidad`, "logoCtl.patch({ opacity: v })"),
  "logo.rotation": logo(`${LOGO} › Rotación`, "logoCtl.patch({ rotation: v })"),
  "logo.zIndex": logo(`${LOGO} › Profundidad`, "logoCtl.patch({ zIndex: v })"),
  photo: content(`${FOTO_OBJ} › Imagen › Subir`, "id.setPhoto(publicUrl)"),
  name: content(`${NOMBRE} › Contenido`, "onChange={v => id.setName(v)}"),
  handle: system("the account @handle — read-only in the editor"),
  status: meta(`${FRASE} › Contenido`, 'meta.setText("status", v)'),
  location: meta(`${UBICACION} › Contenido`, 'meta.setText("location", v)'),
  bio: meta(`${BIO} › Contenido`, 'meta.setText("bio", v)'),
  aboutText: meta(`${SOBRE_MI} › Contenido`, 'meta.setText("aboutText", v)'),
  aboutAnchorX: BLOCK_DRAG("about"), aboutAnchorY: BLOCK_DRAG("about"),
  aboutFont: type(`${SOBRE_MI} › ${TIPO} › Fuente`, "onChange({ aboutFont: v })"),
  aboutFontSize: type(`${SOBRE_MI} › ${TIPO} › Tamaño`, "onChange({ aboutFontSize: v })"),
  aboutFontWeight: type(`${SOBRE_MI} › ${TIPO} › Peso`, "onChange({ aboutFontWeight: v })"),
  aboutLineHeight: type(`${SOBRE_MI} › ${TIPO} › Espaciado › Interlineado`, "onChange({ aboutLineHeight: v })"),
  aboutColor: type(`${SOBRE_MI} › ${COLOR} › Color`, "onChange({ aboutColor: v })"),
  photoX: retired(LEGACY_POS), photoY: retired(LEGACY_POS), photoScale: retired(LEGACY_POS),
  photoSize: by("pfpSizePx", "legacy size preset, read as the fallback of the PFP size slider"),
  textX: retired(LEGACY_POS), textY: retired(LEGACY_POS), textScale: retired(LEGACY_POS),
  nameX: retired(LEGACY_POS), nameY: retired(LEGACY_POS), nameScale: retired(LEGACY_POS),
  handleX: retired(LEGACY_POS), handleY: retired(LEGACY_POS), handleScale: retired(LEGACY_POS),
  statusX: retired(LEGACY_POS), statusY: retired(LEGACY_POS), statusScale: retired(LEGACY_POS),
  locationX: retired(LEGACY_POS), locationY: retired(LEGACY_POS), locationScale: retired(LEGACY_POS),
  bioX: retired(LEGACY_POS), bioY: retired(LEGACY_POS), bioScale: retired(LEGACY_POS),
  showViews: meta(`${VISITAS} › Contador › Mostrar cantidad`, "meta.setShowViews(v)"),
  viewsX: retired(LEGACY_POS), viewsY: retired(LEGACY_POS), viewsScale: retired(LEGACY_POS),
  font: by("nameFont", "card.font only ever reached the Name — Block 1 removed \"Fuente general\"; shown as the Name font fallback"),
  nameFont: type(`${NOMBRE} › ${TIPO} › Fuente`, "onChange({ nameFont: v })"),
  nameFontSize: type(`${NOMBRE} › ${TIPO} › Tamaño`, "onChange({ nameFontSize: v })"),
  bioFontSize: type(`${BIO} › ${TIPO} › Tamaño`, "onChange({ bioFontSize: v })"),
  statusFont: type(`${FRASE} › ${TIPO} › Fuente`, "onChange({ statusFont: v })"),
  statusFontSize: type(`${FRASE} › ${TIPO} › Tamaño`, "onChange({ statusFontSize: v })"),
  locationFontSize: type(`${UBICACION} › ${TIPO} › Tamaño`, "onChange({ locationFontSize: v })"),
  // Phase 2: back as "Color de todos los textos" (lost in FASE 2, 41f7ea3).
  // Side effects (documented in the UI hint): it is the base every role color
  // without an override derives from, AND the default of the Links icon
  // color, the PFP border/shadow and the drag outlines.
  textColor: type(`${TODOS} › Color › Color de todos los textos (también: íconos de Links, borde/sombra de la foto y contornos de arrastre sin color propio)`, "onChange({ textColor: v })"),
  nameLetterSpacing: type(`${NOMBRE} › ${TIPO} › Espaciado › Interletrado`, "onChange({ nameLetterSpacing: v })"),
  nameLineHeight: type(`${NOMBRE} › ${TIPO} › Espaciado › Interlineado`, "onChange({ nameLineHeight: v })"),
  nameFontWeight: type(`${NOMBRE} › ${TIPO} › Peso`, "onChange({ nameFontWeight: v })"),
  handleFontSize: type(`${USUARIO} › ${TIPO} › Tamaño`, "onChange({ handleFontSize: v })"),
  handleLetterSpacing: type(`${USUARIO} › ${TIPO} › Espaciado › Interletrado`, "onChange({ handleLetterSpacing: v })"),
  descriptorLetterSpacing: type(`${FRASE} › ${TIPO} › Espaciado › Interletrado`, "onChange({ descriptorLetterSpacing: v })"),
  locationLetterSpacing: type(`${UBICACION} › ${TIPO} › Espaciado › Interletrado`, "onChange({ locationLetterSpacing: v })"),
  bioLineHeight: type(`${BIO} › ${TIPO} › Espaciado › Interlineado`, "onChange({ bioLineHeight: v })"),
  viewsFontSize: type(`${VISITAS} › ${TIPO} › Tamaño`, "onChange({ viewsFontSize: v })"),
  viewsLetterSpacing: type(`${VISITAS} › ${TIPO} › Espaciado › Interletrado`, "onChange({ viewsLetterSpacing: v })"),
  monoLineHeight: type(`${TODOS} › Alineación y espaciado › Interlineado de @usuario, Frase, Ubicación y Visitas`, "onChange({ monoLineHeight: v })"),
  handleFont: type(`${USUARIO} › ${TIPO} › Fuente`, "onChange({ handleFont: v })"),
  locationFont: type(`${UBICACION} › ${TIPO} › Fuente`, "onChange({ locationFont: v })"),
  bioFont: type(`${BIO} › ${TIPO} › Fuente`, "onChange({ bioFont: v })"),
  viewsFont: type(`${VISITAS} › ${TIPO} › Fuente`, "onChange({ viewsFont: v })"),
  handleFontWeight: type(`${USUARIO} › ${TIPO} › Peso`, "onChange({ handleFontWeight: v })"),
  descriptorFontWeight: type(`${FRASE} › ${TIPO} › Peso`, "onChange({ descriptorFontWeight: v })"),
  locationFontWeight: type(`${UBICACION} › ${TIPO} › Peso`, "onChange({ locationFontWeight: v })"),
  bioFontWeight: type(`${BIO} › ${TIPO} › Peso`, "onChange({ bioFontWeight: v })"),
  viewsFontWeight: type(`${VISITAS} › ${TIPO} › Peso`, "onChange({ viewsFontWeight: v })"),
  nameColor: type(`${NOMBRE} › ${COLOR} › Color`, "onChange({ nameColor: v })"),
  handleColor: type(`${USUARIO} › ${COLOR} › Color`, "onChange({ handleColor: v })"),
  descriptorColor: type(`${FRASE} › ${COLOR} › Color`, "onChange({ descriptorColor: v })"),
  locationColor: type(`${UBICACION} › ${COLOR} › Color`, "onChange({ locationColor: v"),
  bioColor: type(`${BIO} › ${COLOR} › Color`, "onChange({ bioColor: v })"),
  viewsColor: type(`${VISITAS} › ${COLOR} › Color`, "onChange({ viewsColor: v"),
  linksIconColor: links(`${LINKS} › Íconos › Color`, "linksCtl.setIconColor(v, card.blockStyle)"),
  bgColor: by("effects.bg.color", "legacy field merged by getProfileCardEffects (read effective, write raw)"),
  bgImage: by("effects.bg.image", "legacy field merged by getProfileCardEffects"),
  bgMode: by("effects.bg.imageMode", "legacy field merged by getProfileCardEffects"),
  borderRadius: by("effects.border.radius", "legacy field merged by getProfileCardEffects"),
  opacity: by("effects.bg.opacity", "legacy field merged by getProfileCardEffects"),
  variant: retired("legacy look selector — re-exposing it would be a visual preset (product rule: no presets)"),
  accentColor: retired("legacy, nothing renders it on ProfileCard"),
  glowIntensity: by("effects.glow.intensity", "legacy field merged by getProfileCardEffects"),
  glowColor: by("effects.glow.color", "legacy field merged by getProfileCardEffects"),
  borderColor: by("effects.border.color", "legacy field merged by getProfileCardEffects"),
  borderWidth: by("effects.border.width", "legacy field merged by getProfileCardEffects"),
  bgOverlayOpacity: retired("legacy, nothing renders it on ProfileCard"),
  layout: retired("the composition engine chooses the topology (Stage 3, closed)"),
  locked: unsupported("ProfileCard is fixed and centered; lock is for free elements"),
  isPublic: system("visibility per space, set on creation"),
  stackId: system("stack membership (canvas grouping)"), isStackAnchor: system("stack membership (canvas grouping)"),
};

// ── ProfileCard effects ─────────────────────────────────────────────────────

const pfp = at("ProfileIdentityMenu.tsx");
const FOTO = `${FOTO_OBJ} › Efectos de la foto`;
const RETRO = `${EFECTOS} › Retro`;

export const PROFILE_EFFECT_CAPS: Record<EffectLeaf, Capability> = {
  "bg.color": bgMenu(`${FONDO} › Color › Color`, "patchBg({ color: v })"),
  "bg.image": bgMenu(`${FONDO} › Imagen`, "bgCtl.setImage(src, bgMode)"),
  "bg.imageMode": bgMenu(`${FONDO} › Imagen (detectado al subir)`, "bgCtl.setImage(src, bgMode)"),
  "bg.opacity": bgMenu(`${FONDO} › Color › Opacidad`, "patchBg({ opacity: v })"),
  "bg.blur": bgMenu(`${FONDO} › Superficie › Desenfoque`, "patchBg({ blur: v"),
  "bg.glass": bgMenu(`${FONDO} › Superficie › Vidrio`, "patchBg({ glass: v })"),
  "border.color": fxMenu(`${EFECTOS} › Borde › Color`, "patchBorder({ color: v })"),
  "border.width": fxMenu(`${EFECTOS} › Borde › Grosor`, "patchBorder({ width: v })"),
  "border.radius": fxMenu(`${FONDO} › Esquinas › Radio de las esquinas`, "patchBorder({ radius: v })"),
  "border.opacity": fxMenu(`${EFECTOS} › Borde › Opacidad`, "patchBorder({ opacity: v })"),
  "glow.color": fxMenu(`${EFECTOS} › Brillo › Color`, "patchGlow({ color: v })"),
  "glow.intensity": fxMenu(`${EFECTOS} › Brillo › Intensidad`, "patchGlow({ intensity: v })"),
  "glow.inner": fxMenu(`${EFECTOS} › Brillo › Interior`, 'inner: id !== "outer"'),
  "glow.outer": fxMenu(`${EFECTOS} › Brillo › Exterior`, 'setGlowFlag("outer", true)'),
  "glow.radius": fxMenu(`${EFECTOS} › Brillo › Avanzado › Radio`, "patchGlow({ radius: v })"),
  "glow.animation.enabled": fxMenu(`${EFECTOS} › Brillo › Pulso`, "patchGlowAnimation({ enabled: v })"),
  "glow.animation.speed": fxMenu(`${EFECTOS} › Brillo › Pulso › Velocidad del pulso`, "patchGlowAnimation({ speed: v })"),
  "shadow.color": fxMenu(`${EFECTOS} › Sombra › Color`, "patchShadow({ color: v })"),
  "shadow.intensity": fxMenu(`${EFECTOS} › Sombra › Activar · Intensidad`, 'fx.setEnabled("shadow", on)', "patchShadow({ intensity: v })"),
  "shadow.blur": fxMenu(`${EFECTOS} › Sombra › Avanzado › Blur`, "patchShadow({ blur: v })"),
  "shadow.offsetX": fxMenu(`${EFECTOS} › Sombra › Avanzado › Desplazamiento`, "patchShadow({ offsetX: nx, offsetY: ny })"),
  "shadow.offsetY": fxMenu(`${EFECTOS} › Sombra › Avanzado › Desplazamiento`, "patchShadow({ offsetX: nx, offsetY: ny })"),
  "shadow.opacity": fxMenu(`${EFECTOS} › Sombra › Avanzado › Opacidad`, "patchShadow({ opacity: v })"),
  // 2026-10-14 (user decision): text effects are per text. The card-wide
  // effects.text is LEGACY data — each role renders it unless it has its own
  // (mergeRoleTextEffects) and the editor splits it into the roles on the
  // first per-role edit (splitCardTextEffects). Edited through each role.
  "text.shadow.color": by("effects.textRoles.name.shadow.color", TEXT_PER_ROLE),
  "text.shadow.opacity": by("effects.textRoles.name.shadow.opacity", TEXT_PER_ROLE),
  "text.shadow.blur": by("effects.textRoles.name.shadow.blur", TEXT_PER_ROLE),
  "text.shadow.offsetX": by("effects.textRoles.name.shadow.offsetX", TEXT_PER_ROLE),
  "text.shadow.offsetY": by("effects.textRoles.name.shadow.offsetY", TEXT_PER_ROLE),
  "text.glow.color": by("effects.textRoles.name.glow.color", TEXT_PER_ROLE),
  "text.glow.intensity": by("effects.textRoles.name.glow.intensity", TEXT_PER_ROLE),
  "text.glow.radius": by("effects.textRoles.name.glow.radius", TEXT_PER_ROLE),
  "text.glow.animation.enabled": by("effects.textRoles.name.glow.animation.enabled", TEXT_PER_ROLE),
  "text.glow.animation.speed": by("effects.textRoles.name.glow.animation.speed", TEXT_PER_ROLE),
  "text.stroke.color": by("effects.textRoles.name.stroke.color", TEXT_PER_ROLE),
  "text.stroke.width": by("effects.textRoles.name.stroke.width", TEXT_PER_ROLE),
  "text.blur": by("effects.textRoles.name.blur", TEXT_PER_ROLE),
  "pfp.border.color": pfp(`${FOTO} › Borde › Color`, "patchPfpBorder({ color: v })"),
  "pfp.border.width": pfp(`${FOTO} › Borde › Grosor`, "patchPfpBorder({ width: v })"),
  "pfp.border.opacity": pfp(`${FOTO} › Borde › Opacidad`, "patchPfpBorder({ opacity: v })"),
  "pfp.shadow.color": pfp(`${FOTO} › Sombra › Color`, "patchPfpShadow({ color: v })"),
  "pfp.shadow.intensity": pfp(`${FOTO} › Sombra › Activar · Intensidad`, 'id.setPfpEffect("pfp.shadow", on)', "patchPfpShadow({ intensity: v })"),
  "pfp.glow.color": pfp(`${FOTO} › Brillo › Color`, "patchPfpGlow({ color: v })"),
  "pfp.glow.intensity": pfp(`${FOTO} › Brillo › Activar · Intensidad`, 'id.setPfpEffect("pfp.glow", v)', "patchPfpGlow({ intensity: v })"),
  "pfp.glow.radius": pfp(`${FOTO} › Brillo › Radio`, "patchPfpGlow({ radius: v })"),
  "pfp.glow.animation.enabled": pfp(`${FOTO} › Brillo › Pulso`, "patchPfpGlow({ animation: { enabled: v"),
  "pfp.glow.animation.speed": pfp(`${FOTO} › Brillo › Velocidad del pulso`, "patchPfpGlow({ animation: { enabled: true, speed: v } })"),
  "gradient.from": bgMenu(`${FONDO} › Superficie › Gradiente › Color A`, "bgCtl.setGradient(v)", "patchGradient({ from: v })"),
  "gradient.to": bgMenu(`${FONDO} › Superficie › Gradiente › Color B`, "patchGradient({ to: v })"),
  "gradient.angle": bgMenu(`${FONDO} › Superficie › Gradiente › Ángulo`, "patchGradient({ angle: v })"),
  "gradient.opacity": bgMenu(`${FONDO} › Superficie › Gradiente › Opacidad`, "patchGradient({ opacity: v })"),
  "interactions.tilt3d": fxMenu(`${EFECTOS} › Inclinación 3D`, "patchInteractions({ tilt3d: v })"),
  "interactions.tiltIntensity": fxMenu(`${EFECTOS} › Inclinación 3D › Intensidad`, "patchInteractions({ tiltIntensity: v })"),
  "interactions.spotlight": fxMenu(`${EFECTOS} › Spotlight › Activar`, "patchInteractions({ spotlight: v })"),
  "interactions.spotlightColor": fxMenu(`${EFECTOS} › Spotlight › Color`, "patchInteractions({ spotlightColor: v })"),
  "interactions.spotlightSize": fxMenu(`${EFECTOS} › Spotlight › Radio`, "patchInteractions({ spotlightSize: v })"),
  "interactions.hoverGlow": fxMenu(`${EFECTOS} › Al pasar el cursor › Glow al pasar`, "fx.setHoverGlow(on)", "onToggle={setHoverGlow}"),
  "interactions.hoverScale": fxMenu(`${EFECTOS} › Al pasar el cursor › Escala al pasar`, 'fx.setEnabled("interactions.hoverScale", v)', "patchInteractions({ hoverScale: v })"),
  "animations.floating": fxMenu(`${EFECTOS} › Flotación`, "patchAnimations({ floating: v })"),
  "animations.floatHeight": fxMenu(`${EFECTOS} › Flotación › Amplitud`, "patchAnimations({ floatHeight: v })"),
  "animations.floatSpeed": fxMenu(`${EFECTOS} › Flotación › Duración del ciclo`, "patchAnimations({ floatSpeed: v })"),
  "retro.scanlines.enabled": fxMenu(`${RETRO} › Scanlines`, "patchRetro({ scanlines: { enabled: v"),
  "retro.scanlines.intensity": fxMenu(`${RETRO} › Scanlines › Intensidad`, "patchRetro({ scanlines: { enabled: true, intensity: v } })"),
  "retro.noise.enabled": fxMenu(`${RETRO} › Ruido VHS`, "patchRetro({ noise: { enabled: v"),
  "retro.noise.intensity": fxMenu(`${RETRO} › Ruido VHS › Intensidad`, "patchRetro({ noise: { enabled: true, intensity: v } })"),
  "retro.flicker.enabled": fxMenu(`${RETRO} › Flicker`, "patchRetro({ flicker: { enabled: v"),
  "retro.flicker.intensity": fxMenu(`${RETRO} › Flicker › Intensidad`, "patchRetro({ flicker: { ...retro.flicker!, enabled: true, intensity: v } })"),
  "retro.flicker.speed": fxMenu(`${RETRO} › Flicker › Velocidad`, "patchRetro({ flicker: { ...retro.flicker!, enabled: true, speed: v } })"),
  "retro.chromaticAberration.enabled": fxMenu(`${RETRO} › Aberración cromática`, "patchRetro({ chromaticAberration: { enabled: v"),
  "retro.chromaticAberration.intensity": fxMenu(`${RETRO} › Aberración cromática › Intensidad`, "patchRetro({ chromaticAberration: { enabled: true, intensity: v } })"),
  opacity: retired("legacy whole-card opacity: CardLayers never reads effects.opacity (only bg.opacity — product rule: opacity affects only the background)"),
  padding: retired("never exposed: it would change the box computeBlockLayout measures"),
};

// ── Per-role text effects (card.effects.textRoles.<role>) ──────────────────

const ROLE_LABEL: Record<TextRole, string> = {
  name: "Nombre", handle: "@usuario", descriptor: "Frase", location: "Ubicación", bio: "Bio", views: "Visitas", about: "Sobre mí",
};
const ROLE_FIELDS = "RoleTypographyFields.tsx";
const TYPE_MENU = "ProfileTypographyMenu.tsx";
function roleCaps(role: TextRole): Record<RoleEffectLeaf, Capability> {
  const ui = `${obj(ROLE_LABEL[role])} › ${FX_TEXTO}`;
  const host = ev(TYPE_MENU, `{...makeGradientHandlers("${role}")}`);
  const own = host;
  const letter = role === "name"
    ? (field: string) => route(`${ui} › Animación por letra › ${field}`, ev("ProfileTypographyMenu.tsx", 'setRoleTextEffect("name", "letterAnimation", v)'), ev(ROLE_FIELDS, `onLetterAnimationChange({ ...letterAnimation, ${field}: v })`))
    : () => unsupported("letter animation is Name-only (Product closeout)");
  return {
    "gradient.colors": route(`${ui} › Gradiente`, host, ev(ROLE_FIELDS, "onGradientChange({ ...gradient, colors })")),
    "gradient.angle": route(`${ui} › Gradiente › Ángulo`, host, ev(ROLE_FIELDS, "onGradientChange({ ...gradient, angle: v })")),
    "gradient.from": retired("pre-multicolor shape: read as a fallback, never written"),
    "gradient.to": retired("pre-multicolor shape: read as a fallback, never written"),
    "shimmer.intensity": route(`${ui} › Shimmer › Intensidad`, host, ev(ROLE_FIELDS, "onShimmerChange({ ...shimmer, intensity: v })")),
    "shimmer.speed": route(`${ui} › Shimmer › Velocidad`, host, ev(ROLE_FIELDS, "onShimmerChange({ ...shimmer, speed: v })")),
    "letterAnimation.amplitude": letter("amplitude"),
    "letterAnimation.speed": letter("speed"),
    "letterAnimation.stagger": letter("stagger"),
    // 2026-10-14: the role's own Sombra / Brillo / Pulso / Contorno /
    // Desenfoque (ProfileTypographyMenu.tsx's roleFxTiles, mounted for
    // every role through RoleTextSection).
    "shadow.color": route(`${ui} › Sombra › Color`, own, ev(TYPE_MENU, 'fx.toggle("shadow", v)'), ev(TYPE_MENU, "fx.patchShadow({ color: v })")),
    "shadow.opacity": route(`${ui} › Sombra › Opacidad`, own, ev(TYPE_MENU, "fx.patchShadow({ opacity: v })")),
    "shadow.blur": route(`${ui} › Sombra › Blur`, own, ev(TYPE_MENU, "fx.patchShadow({ blur: v })")),
    "shadow.offsetX": route(`${ui} › Sombra › Desplazamiento`, own, ev(TYPE_MENU, "fx.patchShadow({ offsetX: nx, offsetY: ny })")),
    "shadow.offsetY": route(`${ui} › Sombra › Desplazamiento`, own, ev(TYPE_MENU, "fx.patchShadow({ offsetX: nx, offsetY: ny })")),
    "glow.color": route(`${ui} › Brillo › Color`, own, ev(TYPE_MENU, "fx.patchGlow({ color: v })")),
    "glow.intensity": route(`${ui} › Brillo › Intensidad`, own, ev(TYPE_MENU, 'fx.toggle("glow", v)'), ev(TYPE_MENU, "fx.patchGlow({ intensity: v })")),
    "glow.radius": route(`${ui} › Brillo › Radio`, own, ev(TYPE_MENU, "fx.patchGlow({ radius: v })")),
    "glow.animation.enabled": route(`${ui} › Pulso`, own, ev(TYPE_MENU, "fx.patchPulse({ enabled: v })")),
    "glow.animation.speed": route(`${ui} › Pulso › Velocidad`, own, ev(TYPE_MENU, "fx.patchPulse({ speed: v })")),
    "stroke.color": route(`${ui} › Contorno › Color`, own, ev(TYPE_MENU, 'fx.toggle("stroke", v)'), ev(TYPE_MENU, "fx.patchStroke({ color: v })")),
    "stroke.width": route(`${ui} › Contorno › Grosor`, own, ev(TYPE_MENU, "fx.patchStroke({ width: v })")),
    blur: route(`${ui} › Desenfoque`, own, ev(TYPE_MENU, "fx.setBlur(v)")),
  };
}
export const ROLE_EFFECT_CAPS: Record<TextRole, Record<RoleEffectLeaf, Capability>> = {
  name: roleCaps("name"), handle: roleCaps("handle"), descriptor: roleCaps("descriptor"),
  location: roleCaps("location"), bio: roleCaps("bio"), views: roleCaps("views"), about: roleCaps("about"),
};

// ── Block styles (card.blockStyle.<block>) ─────────────────────────────────

const BLOCK_HOST: Record<BlockStyleKey, [file: string, ui: string]> = {
  // One "Bloque de identidad" section, mounted under Nombre, @usuario, Frase and Bio.
  identity: ["ProfileIdentityMenu.tsx", `${NOMBRE} › Estilo del bloque · afecta Nombre, @usuario, Frase y Bio (también bajo esos objetos)`],
  location: ["ProfileMetadataMenu.tsx", `${UBICACION} › Contenido › Estilo del bloque`],
  views:    ["ProfileMetadataMenu.tsx", `${VISITAS} › Contador › Estilo del bloque`],
  links:    ["ProfileContactLinksMenu.tsx", `${LINKS} › Estilo del bloque`],
  about:    ["ProfileMetadataMenu.tsx", `${SOBRE_MI} › Estilo del bloque`],
};
function blockCaps(block: BlockStyleKey): Record<keyof BlockStyleOverride, Capability> {
  const [file, ui] = BLOCK_HOST[block];
  const host = ev(file, `blockKey="${block}"`);
  const field = (label: string, text: string) => route(`${ui} › ${label}`, host, ev("BlockStyleFields.tsx", text));
  return {
    bg: field("Fondo", "patch({ bg: v })"),
    radius: field("Radio", "patch({ radius: v })"),
    textColor: block === "links"
      ? unsupported("Contact Links has no text")
      : block === "identity"
        ? retired("never wired in render (blockStyle.ts: Identity has its own per-role colors); each role's Color › Color owns it")
        : by(`${block}Color`, ROLE_COLOR),
    iconColor: block === "links"
      ? by("linksIconColor", "the icon color moved to Links › Íconos › Color (2026-10-21); a stored value still renders and the new control moves it")
      : unsupported("no icons in this block"),
  };
}
export const BLOCK_STYLE_CAPS: Record<BlockStyleKey, Record<keyof BlockStyleOverride, Capability>> = {
  identity: blockCaps("identity"), location: blockCaps("location"), views: blockCaps("views"), links: blockCaps("links"), about: blockCaps("about"),
};

// ── Music ───────────────────────────────────────────────────────────────────

const M = "Music";
const MEDIDAS = `${M} › Objeto › Medidas`;

export const MUSIC_CARD_CAPS: Record<MusicFieldPath, Capability> = {
  id: system("record identity, assigned on creation"),
  x: parts(`${LIENZO} · ${MEDIDAS} › X`, "m.onGeometry({ x: v })"),
  y: parts(`${LIENZO} · ${MEDIDAS} › Y`, "m.onGeometry({ y: v })"),
  w: parts(`handles de resize · ${MEDIDAS} › Ancho`, "m.onGeometry({ w: v })"),
  h: parts(`handles de resize · ${MEDIDAS} › Alto`, "m.onGeometry({ h: v })"),
  rotation: route(`Rotar · ${MEDIDAS} › Rotación`, ev("ElementInspectorParts.tsx", "m.onGeometry({ rotation: v })"), ev("MusicCardWidget.tsx", "updateCard(card.id, { rotation:")),
  // Editor v3 Phase E: stacking is edited in Capas (rail › Capas), for every element.
  zIndex: route(`${CAPAS} › Orden (Al frente / Subir / Bajar / Al fondo, arrastrar)`, ev("CanvasBoard.tsx", "applyLayerChange(id, reorderLayers(layerItemsNow(), id, action))"), ev("LayersPanel.tsx", "p.onReorder(single.id, b.action)")),
  layer: route(`${CAPAS} › Capa (Fondo / Medio / Frente)`, ev("LayersPanel.tsx", "p.onSetLayer(single.id, Number(t.id) as LayerIndex)")),
  depth: system("parallax depth of the element"),
  locked: route(`candado del lienzo · ${M} › Objeto › Bloquear (y Capas › Seleccionado › Bloquear)`, ev("CanvasBoard.tsx", "updateMusicCard(mc.id, { locked: !mc.locked })"), ev("ElementInspectorParts.tsx", "pressed={locked} onClick={() => onToggleLock()}")),
  isPublic: system("visibility per space, set on creation"), stackId: system("stack membership (canvas grouping)"),
  musicUrl: retired("legacy link preview (Spotify/YouTube/SoundCloud) — MP3 only now"),
  mood: retired("legacy link preview caption"),
  audioUrl: music(`${M} › Contenido › Subir MP3`, "updateCard(card.id, { audioUrl: publicUrl })"),
  title: music(`${M} › Contenido › Título`, "updateCard(card.id, { title: v })"),
  artist: music(`${M} › Contenido › Artista`, "updateCard(card.id, { artist: v })"),
  volume: music(`${M} › Contenido › Volumen inicial`, "updateCard(card.id, { volume: v })"),
  bgColor: by("effects.bg.color", "legacy field merged by getMusicCardEffects"),
  bgImage: music(`${M} › Fondo › Imagen`, "bgImage: publicUrl, bgMode"),
  bgMode: music(`${M} › Fondo › Imagen (detectado al subir)`, "bgImage: publicUrl, bgMode"),
  borderRadius: by("effects.border.radius", "legacy field merged by getMusicCardEffects"),
  opacity: retired("legacy: getMusicCardEffects folds it into effects.opacity, which CardLayers never renders (only bg.opacity)"),
  variant: retired("legacy look selector — re-exposing it would be a visual preset"),
  borderColor: by("effects.border.color", "legacy field merged by getMusicCardEffects"),
  borderWidth: by("effects.border.width", "legacy field merged by getMusicCardEffects"),
  glowColor: by("effects.glow.color", "legacy field merged by getMusicCardEffects"),
  glowIntensity: by("effects.glow.intensity", "legacy field merged by getMusicCardEffects"),
  textColor: music(`${M} › Texto › Color`, "updateCard(card.id, { textColor: v })"),
  textSize: music(`${M} › Texto › Tamaño del texto`, "updateCard(card.id, { textSize: v })"),
  font: music(`${M} › Texto › Fuente`, "updateCard(card.id, { font: (v || undefined)"),
};

const PROFILE_ONLY = "ProfileCard-only (Music's text and layout are its own fields)";
const MUSIC_GAP = "not offered for Music yet — Phase 4 puts Music on the same effect tiles as ProfileCard";
const MF = `${M} › Fondo`;
const ME = `${M} › Efectos`;

export const MUSIC_EFFECT_CAPS: Record<EffectLeaf, Capability> = {
  "bg.color": music(`${MF} › Color`, "patchBg({ color: v })"),
  "bg.image": music(`${MF} › Imagen`, "image: publicUrl, imageMode: bgMode"),
  "bg.imageMode": music(`${MF} › Imagen (detectado al subir)`, "image: publicUrl, imageMode: bgMode"),
  "bg.opacity": music(`${MF} › Opacidad`, "patchBg({ opacity: v })"),
  "bg.blur": music(`${MF} › Desenfoque`, "patchBg({ blur: v"),
  "bg.glass": music(`${MF} › Glass`, "patchBg({ glass: v })"),
  "border.color": music(`${ME} › Borde › Color`, "patchBorder({ color: v })"),
  "border.width": music(`${ME} › Borde › Grosor`, "patchBorder({ width: v })"),
  "border.radius": music(`${ME} › Borde › Radio`, "patchBorder({ radius: v })"),
  "border.opacity": unsupported(MUSIC_GAP),
  "glow.color": music(`${ME} › Glow › Color`, "patchGlow({ color: v })"),
  "glow.intensity": music(`${ME} › Glow › Intensidad`, "patchGlow({ intensity: v })"),
  "glow.inner": music(`${ME} › Glow › Interior`, 'inner: id !== "outer"'),
  "glow.outer": music(`${ME} › Glow › Exterior`, 'setGlowFlag("outer", true)'),
  "glow.radius": unsupported(MUSIC_GAP),
  "glow.animation.enabled": unsupported(MUSIC_GAP),
  "glow.animation.speed": unsupported(MUSIC_GAP),
  "shadow.color": music(`${ME} › Sombra › Color`, "patchShadow({ color: v })"),
  "shadow.intensity": music(`${ME} › Sombra · Intensidad`, 'fx.setEnabled("shadow", on)', "patchShadow({ intensity: v })"),
  "shadow.blur": unsupported(MUSIC_GAP),
  "shadow.offsetX": unsupported(MUSIC_GAP),
  "shadow.offsetY": unsupported(MUSIC_GAP),
  "shadow.opacity": unsupported(MUSIC_GAP),
  "text.shadow.color": unsupported(PROFILE_ONLY), "text.shadow.opacity": unsupported(PROFILE_ONLY),
  "text.shadow.blur": unsupported(PROFILE_ONLY), "text.shadow.offsetX": unsupported(PROFILE_ONLY),
  "text.shadow.offsetY": unsupported(PROFILE_ONLY), "text.glow.color": unsupported(PROFILE_ONLY),
  "text.glow.intensity": unsupported(PROFILE_ONLY), "text.glow.radius": unsupported(PROFILE_ONLY),
  "text.glow.animation.enabled": unsupported(PROFILE_ONLY), "text.glow.animation.speed": unsupported(PROFILE_ONLY),
  "text.stroke.color": unsupported(PROFILE_ONLY), "text.stroke.width": unsupported(PROFILE_ONLY),
  "text.blur": unsupported(PROFILE_ONLY),
  "pfp.border.color": unsupported(PROFILE_ONLY), "pfp.border.width": unsupported(PROFILE_ONLY),
  "pfp.border.opacity": unsupported(PROFILE_ONLY), "pfp.shadow.color": unsupported(PROFILE_ONLY),
  "pfp.shadow.intensity": unsupported(PROFILE_ONLY), "pfp.glow.color": unsupported(PROFILE_ONLY),
  "pfp.glow.intensity": unsupported(PROFILE_ONLY), "pfp.glow.radius": unsupported(PROFILE_ONLY),
  "pfp.glow.animation.enabled": unsupported(PROFILE_ONLY), "pfp.glow.animation.speed": unsupported(PROFILE_ONLY),
  "gradient.from": music(`${MF} › Gradiente › Color A`, 'fx.setEnabled("gradient", v)', "patchGradient({ from: v })"),
  "gradient.to": music(`${MF} › Gradiente › Color B`, "patchGradient({ to: v })"),
  "gradient.angle": music(`${MF} › Gradiente › Ángulo`, "patchGradient({ angle: v })"),
  "gradient.opacity": music(`${MF} › Gradiente › Opacidad`, "patchGradient({ opacity: v })"),
  "interactions.tilt3d": music(`${ME} › Inclinación 3D`, "patchInteractions({ tilt3d: v })"),
  "interactions.tiltIntensity": music(`${ME} › Inclinación 3D › Intensidad`, "patchInteractions({ tiltIntensity: v })"),
  "interactions.spotlight": music(`${ME} › Spotlight`, "patchInteractions({ spotlight: v })"),
  "interactions.spotlightColor": music(`${ME} › Spotlight › Color`, "patchInteractions({ spotlightColor: v })"),
  "interactions.spotlightSize": music(`${ME} › Spotlight › Radio`, "patchInteractions({ spotlightSize: v })"),
  "interactions.hoverGlow": music(`${ME} › Glow al pasar`, "fx.setHoverGlow(on)", "onToggle={setHoverGlow}"),
  "interactions.hoverScale": unsupported(MUSIC_GAP),
  "animations.floating": music(`${ME} › Animar › Flotación`, "patchAnimations({ floating: v })"),
  "animations.floatHeight": music(`${ME} › Animar › Altura`, "patchAnimations({ floatHeight: v })"),
  "animations.floatSpeed": music(`${ME} › Animar › Duración del ciclo`, "patchAnimations({ floatSpeed: v })"),
  "retro.scanlines.enabled": unsupported(MUSIC_GAP), "retro.scanlines.intensity": unsupported(MUSIC_GAP),
  "retro.noise.enabled": unsupported(MUSIC_GAP), "retro.noise.intensity": unsupported(MUSIC_GAP),
  "retro.flicker.enabled": unsupported(MUSIC_GAP), "retro.flicker.intensity": unsupported(MUSIC_GAP),
  "retro.flicker.speed": unsupported(MUSIC_GAP),
  "retro.chromaticAberration.enabled": unsupported(MUSIC_GAP), "retro.chromaticAberration.intensity": unsupported(MUSIC_GAP),
  opacity: retired("legacy whole-card opacity: CardLayers never reads effects.opacity (only bg.opacity — product rule: opacity affects only the background)"),
  padding: retired("never exposed: it would change the box the layout measures"),
};

// ── Free text / Image (Editor v3 Phase G) ───────────────────────────────────

const TX = "Texto";
const IM = "Imagen";
const STACKING = (owner: string) => ({
  zIndex: route(`${CAPAS} › Orden${owner === IM ? " (y doble click en la imagen: al frente)" : ""}`, ev("CanvasBoard.tsx", "applyLayerChange(id, reorderLayers(layerItemsNow(), id, action))"), ev("LayersPanel.tsx", "p.onReorder(single.id, b.action)")),
  layer: route(`${CAPAS} › Capa (Fondo / Medio / Frente)`, ev("LayersPanel.tsx", "p.onSetLayer(single.id, Number(t.id) as LayerIndex)")),
});

export const TEXT_CAPS: Record<TextFieldPath, Capability> = {
  id: system("record identity, assigned on creation"),
  x: parts(`${LIENZO} · ${TX} › Objeto › Medidas › X`, "m.onGeometry({ x: v })"),
  y: parts(`${LIENZO} · ${TX} › Objeto › Medidas › Y`, "m.onGeometry({ y: v })"),
  rotation: route(`Rotar · ${TX} › Objeto › Medidas › Rotación`, ev("ElementInspectorParts.tsx", "m.onGeometry({ rotation: v })"), ev("CanvasBoard.tsx", "onKeyRotate={()=>updateText(txt.id,{rotation:")),
  ...STACKING(TX),
  depth: system("parallax depth of the element"),
  content: route(`${TX} › Contenido (y doble click en el lienzo)`, ev("TextInspector.tsx", "set({ content: v })"), ev("CanvasBoard.tsx", "onBlur={canInteract ? (e=>{updateText(txt.id,{content:e.currentTarget.innerText})")),
  font: textInsp(`${TX} › Tipografía › Fuente`, "onChange={v => set({ font: v as TextFont })}"),
  size: route(`${TX} › Tipografía › Tamaño (y Ctrl/⌘+flechas, esquina del lienzo)`, ev("TextInspector.tsx", "onChange={v => set({ size: v })}")),
  letterSpacing: textInsp(`${TX} › Tipografía › Interletrado`, "onChange={v => set({ letterSpacing: v })}"),
  uppercase: textInsp(`${TX} › Tipografía › Mayúsculas`, "onChange={v => set({ uppercase: v === \"AA\" })}"),
  color: textInsp(`${TX} › Color › Texto`, "onChange={v => set({ color: v })}"),
  opacity: textInsp(`${TX} › Color › Opacidad`, "onChange={v => set({ opacity: v })}"),
  locked: route(`candado del lienzo · ${TX} › Objeto › Bloquear (y Capas)`, ev("CanvasBoard.tsx", "updateText(txt.id,{locked:!txt.locked})"), ev("ElementInspectorParts.tsx", "pressed={locked} onClick={() => onToggleLock()}")),
  isPublic: system("visibility per space, set on creation"),
  pinCount: system("social counter, written by pins"),
};

export const IMAGE_CAPS: Record<ImageFieldPath, Capability> = {
  id: system("record identity, assigned on creation"),
  src: imgInsp(`${IM} › Reemplazar`, "onFile={f => p.onReplace(f)}"),
  x: parts(`${LIENZO} · ${IM} › Objeto › Medidas › X`, "m.onGeometry({ x: v })"),
  y: parts(`${LIENZO} · ${IM} › Objeto › Medidas › Y`, "m.onGeometry({ y: v })"),
  w: parts(`handles de resize · ${IM} › Objeto › Medidas › Ancho`, "m.onGeometry({ w: v })"),
  h: parts(`handles de resize · ${IM} › Objeto › Medidas › Alto`, "m.onGeometry({ h: v })"),
  naturalW: system("intrinsic size of the file, read on upload / replace (keeps the ratio)"),
  naturalH: system("intrinsic size of the file, read on upload / replace (keeps the ratio)"),
  isTransparent: system("derived from the file type on upload / replace"),
  ...STACKING(IM),
  depth: system("parallax depth of the element"),
  rotation: route(`Rotar · ${IM} › Objeto › Medidas › Rotación`, ev("ElementInspectorParts.tsx", "m.onGeometry({ rotation: v })"), ev("CanvasBoard.tsx", "onKeyRotate={()=>enqueueOp({type:\"update_image\",id:img.id,patch:{rotation:")),
  borderRadius: imgInsp(`${IM} › Forma › Esquinas`, "updateImage(img.id, { borderRadius: c.value })"),
  locked: route(`candado del lienzo · ${IM} › Objeto › Bloquear (y Capas)`, ev("CanvasBoard.tsx", "enqueueOp({type:\"update_image\",id:img.id,patch:{locked:!img.locked}})"), ev("ElementInspectorParts.tsx", "pressed={locked} onClick={() => onToggleLock()}")),
  isPublic: system("visibility per space, set on creation"),
  pinCount: system("social counter, written by pins"),
  storage_path: system("storage key of the uploaded file (upload / replace)"),
  linkUrl: imgInsp(`${IM} › Link`, "updateImage(img.id, { linkUrl: v || undefined })"),
  isLocal: system("temporary blob: URL while the upload runs"),
};

// ── Lookup ──────────────────────────────────────────────────────────────────

export type CapabilityOwner = "profile" | "music" | "text" | "image";

/** Resolves a full path ("effects.bg.color", "blockStyle.links.iconColor",
 * "effects.textRoles.bio.shimmer.speed", "nameColor") for an owner. */
export function capabilityAt(owner: CapabilityOwner, path: string): Capability | undefined {
  if (path.startsWith("effects.textRoles.")) {
    if (owner !== "profile") return undefined;
    const [, , role, ...rest] = path.split(".");
    return (ROLE_EFFECT_CAPS as Record<string, Record<string, Capability>>)[role]?.[rest.join(".")];
  }
  if (path.startsWith("effects.")) {
    if (owner === "text" || owner === "image") return undefined;
    const map = (owner === "profile" ? PROFILE_EFFECT_CAPS : MUSIC_EFFECT_CAPS) as Record<string, Capability>;
    return map[path.slice("effects.".length)];
  }
  if (path.startsWith("blockStyle.")) {
    if (owner !== "profile") return undefined;
    const [, block, key] = path.split(".");
    return (BLOCK_STYLE_CAPS as Record<string, Record<string, Capability>>)[block]?.[key];
  }
  const fields = owner === "profile" ? PROFILE_CARD_CAPS : owner === "music" ? MUSIC_CARD_CAPS : owner === "text" ? TEXT_CAPS : IMAGE_CAPS;
  return (fields as Record<string, Capability>)[path];
}

/** Every (owner, path, capability) row of the matrix. */
export function capabilityMatrix(): Array<{ owner: CapabilityOwner; path: string; cap: Capability }> {
  const rows: Array<{ owner: CapabilityOwner; path: string; cap: Capability }> = [];
  const push = (owner: CapabilityOwner, prefix: string, map: Record<string, Capability>) => {
    for (const [k, cap] of Object.entries(map)) rows.push({ owner, path: `${prefix}${k}`, cap });
  };
  push("profile", "", PROFILE_CARD_CAPS);
  push("profile", "effects.", PROFILE_EFFECT_CAPS);
  for (const [role, map] of Object.entries(ROLE_EFFECT_CAPS)) push("profile", `effects.textRoles.${role}.`, map);
  for (const [block, map] of Object.entries(BLOCK_STYLE_CAPS)) push("profile", `blockStyle.${block}.`, map);
  push("music", "", MUSIC_CARD_CAPS);
  push("music", "effects.", MUSIC_EFFECT_CAPS);
  push("text", "", TEXT_CAPS);
  push("image", "", IMAGE_CAPS);
  return rows;
}
