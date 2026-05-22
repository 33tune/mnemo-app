# MNEMO — CORE PRODUCT VISION & PROJECT CONTEXT

## What MNEMO is

MNEMO is a **living digital room** — a spatial, personal canvas that functions as an emotional identity space and parasocial ecosystem. It's not a feed, not a portfolio, not a social network in the traditional sense. It's a place where people *live* online.

The canvas is the home. It's personal, spatial, and expressive — a digital bedroom wall crossed with a social OS. Users build their space over time: images, cards, music, text, galleries, signal boards. Every element is a piece of identity.

## Retention architecture

Retention in MNEMO is built on three pillars — **not algorithms**:

1. **Identity** — the canvas is self-expression. Every edit is an act of identity construction. People return because their space is theirs.
2. **Attachment** — other people visit, follow, react. The space becomes social capital. Visibility creates emotional investment.
3. **Creativity** — the canvas is never "done". There's always something to add, rearrange, upgrade. The creative loop is the engagement loop.

**MNEMO does NOT retain users through notification spam, algorithmic feeds, or dopamine loops.** Retention is earned through emotional ownership, not manufactured urgency.

## Canvas philosophy

- The canvas is **personal and spatial** — it is NOT a feed, NOT a timeline
- Every element should feel like the user placed it there intentionally
- The canvas experience should feel like decorating a room, not posting content
- Public view = visiting someone's space. It should feel like entering a room, not scrolling a profile
- The canvas remains **the core product** — everything social orbits around it, never replaces it

## Social systems — architecture principles

- **ALL social systems live in the SOCIAL TAB** (topbar right side)
- The canvas itself is NOT a social feed — it is a personal creative space
- Social interactions (follow, favorite, messages, notifications, guestbook) are accessed from the social dock/tab
- Visiting someone's canvas = read-only, spatial experience. No feed mechanics on the public view
- Social depth comes from **presence, connection, and expression** — not content volume

## Emotional goals

- A user's MNEMO space should feel like *their* place on the internet
- Visitors should feel like they're *entering* something, not *scrolling* something
- Following someone should feel meaningful — you're subscribing to their world, not their content
- The overall aesthetic is dark, minimal, intentional — anti-mainstream, anti-algorithmic

---

# SOCIAL RETENTION SYSTEMS — ROADMAP

## HIGH PRIORITY — Guestbook / Interaction Wall

Visitors can leave marks in someone's space: text messages, GIFs, small images, drawings. The space owner sees and moderates them. This is the core parasocial loop: you visit someone's world, you leave a trace.

- Lives in the public canvas view (read-only but interactive for guestbook)
- Owner has full moderation (delete, pin)
- Design language: intimate, not social-media-y. Like leaving a note in someone's journal.

## Social Feed (inside SOCIAL TAB only)

A feed of activity from people you follow:
- Canvas updates (new elements added, wallpaper changed)
- Signal card posts
- Status changes / mood updates
- Space goes live (owner is actively editing)

This feed lives **inside the SOCIAL tab only** — never bleeds into the main canvas.

## Profile Presence System

- "3 people exploring your space right now"
- Recent visitors list
- Live viewing indicators on your own canvas
- Presence dots next to follower/following entries

## Realtime atmosphere

- Live presence indicators when someone is viewing your space
- Instant social updates (new guestbook entry, new follower)
- Owner gets a subtle ambient signal that someone is in their space

## Identity & expression systems

- Deeper profile customization (collectibles, badges, aesthetic unlocks)
- Status/mood system (visible to followers)
- Music wiring (what you're listening to, ambient to the space)

---

# TECHNICAL ARCHITECTURE

## Stack
Next.js 15 App Router, TypeScript strict, Supabase (postgres + RLS + realtime + storage), sin ORM, Vercel deploy.

## Canvas — estado unificado

Todo el canvas vive en un solo array `elements: CanvasElement[]` (discriminated union con campo `elementType: "card"|"image"|"text"|"gallery"|"profile"|"postit"|"media"`).

**Dos versiones de `applyOp`**:
- `applyOp(op)` — con side-effects, llama `setElements`. Usada en tiempo real.
- `reduceOp(els, op): CanvasElement[]` — pura, sin side-effects. Usada en `switchCanvas` para replay de ops sin re-renders intermedios.

**`buildSaveState(snapshot)`** — requiere snapshot explícito (fix de stale closure).

**Ops idempotentes**: todos los `add_*` ops hacen `p.some(e => e.id === op.X.id) ? p : [...p, newEl]`.

**publishSpace()**: filtra `elements` por `isPublic === true` y src que empiece con "http", luego `buildSaveState(snapshot)` + `.update({ data: state })` (overwrite completo).

**`enqueueOp`**: en modo space, setea `publishState` a "pending" (salvo que ya esté "publishing").

## Archivos clave

| Archivo | Rol |
|---|---|
| `src/types/index.ts` | Todos los tipos. `CanvasElement` union, `ProfileCardData`, `PublishState`, `PresenceState` |
| `src/components/canvas/CanvasBoard.tsx` | Canvas editable. `reduceOp`, `buildSaveState`, `switchCanvas`, `publishSpace`, `enqueueOp` |
| `src/components/canvas/PublicCanvas.tsx` | Canvas read-only. Sin edit UI. Wallpaper tiled (`backgroundSize:"auto"`, `repeat`) |
| `src/components/canvas/ProfileCard.tsx` | Tarjeta de perfil con sub-elementos draggables en coordenadas %. Social hooks |
| `src/components/canvas/GalleryWidget.tsx` | Galería. `canInteract?` gatea UI de edición. `React.memo` con `arePropsEqual` custom |
| `src/components/canvas/PostItBoardWidget.tsx` | Signal Card Studio. Feed vertical, newest-first. Temas, estilos, image display modes |
| `src/components/canvas/MediaCardWidget.tsx` | Spotify/YouTube/SoundCloud embeds. `React.memo` |
| `src/components/canvas/Topbar.tsx` | Barra superior. `publishState`, `onPublish`. SOCIAL tab en right side |
| `src/hooks/useDragDrop.ts` | Drag/resize/rotate. NaN guards en resize. Unified `elements: CanvasElement[]` |
| `src/hooks/useFollow.ts` | Follow/unfollow optimistic UI + rollback. `followInFlight` ref guard |
| `src/hooks/useFavorite.ts` | Favorite/unfavorite optimistic UI + rollback |
| `src/hooks/useMessages.ts` | Chat messages. Realtime con UUID channel name. `sendInFlight` ref. Optimistic insert |
| `src/hooks/useChatWindows.ts` | Chat windows state. Fully optimistic open, background DB persist |
| `src/hooks/usePresence.ts` | Presencia. Single fetch. Thresholds: EDITING <15m, ACTIVE <5m, AWAY <30m |
| `src/lib/analytics.ts` | Event emitters: signup, profileVisit, follow, messageSent, canvasEdit |
| `src/lib/withRetry.ts` | Exponential backoff (300ms→600ms→1200ms, max 3 attempts) |
| `src/lib/storage.ts` | Upload con dedup por module-level Map (`fileKey = name|size|lastModified`) |
| `src/app/[handle]/page.tsx` | Página pública. `.ilike("handle", h)`. `onboarding_completed` guard |
| `src/app/setup/page.tsx` | Onboarding OAuth — 3 pasos: handle, display name, confirmar |
| `src/app/auth/callback/route.ts` | OAuth callback. Nuevos usuarios → temp handle → `/setup` |

## ProfileCard — sistema de sub-elementos

- Posición en `%` del card: `photoX/Y`, `textX/Y`, `statsX/Y`, `actionsX/Y`
- Escala individual: `photoScale`, `textScale`, `statsScale`, `actionsScale` (default 1)
- Transform: `translate(-50%, -50%) scale(${scale})`
- Drag: `startElDrag(which, e)` — mueve en % del bounding rect
- `menuOpen` se abre con el gear handle (top-left), cierra al deseleccionar

`canInteract` prop gatea todo el edit UI en ProfileCard, GalleryWidget y CanvasBoard. En `PublicCanvas` siempre `false`.

## Presence system

**`PresenceState`**: `"ACTIVE NOW" | "EDITING SPACE" | "AWAY" | "OFFLINE"`

**Thresholds**: EDITING SPACE < 15min; ACTIVE NOW < 5min; AWAY < 30min; OFFLINE rest.

**Activity tracking**: `CanvasBoard.markActive(isProfileUpdate)` — throttled 30s, escribe `last_active_at` y opcionalmente `last_profile_update_at`.

## Signal Card (PostItBoard)

Rewrite completo de `PostItBoardWidget.tsx`. Feed vertical scrollable, newest-first.

Estilos: `postStyle` (compact/minimal/tumblr/terminal/diary/media-heavy), `cardStyle` (solid/glass/gradient/noise/transparent/image), `imageDisplayMode` (natural/cover/contain).

Expiry opacity: posts faden 1.0 → 0.07 over 24h.

## Social panels

**SocialPanelWindow**: floating panel, drag header, shows followers OR following. Spawned desde ProfileCard stats click. Estado local en CanvasBoard (`socialPanels[]`, `socialZRef` starts at 5000).

## Onboarding OAuth

Nuevos usuarios Google → temp handle (`temp_<15hexchars>`) → `/setup` (elegir handle, display name, confirmar) → `onboarding_completed = true` → dashboard.

Email users eligen handle en registro directo → `onboarding_completed: true` inmediato.

Guard en `[handle]/page.tsx`: `notFound()` para perfiles con `onboarding_completed = false` o handle `temp_*`.

## Error boundaries

- `AppErrorBoundary` — app-level, client wrapper en layout
- `WidgetBoundary` — per-widget, renders null on error
- `CrashScreen` — full-page dark fallback "SYSTEM INTERRUPTION"

## Patrones de estado

- Siempre `setElements(prev => ...)` (functional update)
- `structuredClone(elements)` antes de mutar para snapshot de publish
- `isLocal?: boolean` en `CanvasImage` — blobs locales excluidos del publish
- `cancelledRef = useRef(false)` en hooks con cleanup — guard en todos los setState
- `zCounter.current` se sincroniza al max zIndex cargado después de cada `switchCanvas`

## Bugs resueltos notables

- **zCounter empezando en 10**: sync a max zIndex cargado post-switchCanvas
- **NaN dimensions en DB**: ratio fallback chain + `isFinite()` guard antes de `enqueueOp`
- **mountedRef bloqueando realtime**: eliminado, UUID channel por effect run
- **env.ts boot crash**: eliminado, direct `process.env!` access
- **Chat windows no abrían**: fully optimistic state update, background DB persist
- **Wallpaper zoomeado en público**: `backgroundSize:"cover"` → `"auto"` + `repeat`
- **Duplicados en elements[]**: ops idempotentes
- **Handle case-sensitive 404**: `.eq()` → `.ilike()`
