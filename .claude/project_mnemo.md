# MNEMO — PROJECT CONTEXT / CORE ARCHITECTURE

## PRODUCT IDENTITY

MNEMO is not a traditional social network.

It is:

* a living digital room
* a spatial identity system
* a personal universe
* an emotional canvas
* a social memory space

Users are not “posting content”.
They are building and evolving a digital place that feels emotionally theirs.

The canvas should feel:

* personal
* inhabited
* expressive
* immersive
* human
* emotionally persistent

The feeling should be:
“I exist here.”

---

# CORE RETENTION PHILOSOPHY

Retention must come from:

* identity
* emotional ownership
* attachment
* creativity
* social traces
* evolving spaces
* parasocial interaction

NOT from:

* algorithmic feeds
* infinite scrolling
* engagement bait
* dopamine spam
* corporate-style social mechanics

Leaving the app should feel like:
abandoning your digital room.

---

# PRODUCT STRUCTURE

## The Canvas

The canvas is the core product.

It is:

* spatial
* immersive
* aesthetic-first
* identity-first
* intentionally placed
* desktop/room-like

The canvas is NOT:

* a feed
* a timeline
* a scrolling social profile

Every element should feel intentionally placed by the user.

Visiting a profile should feel like:
entering someone’s room,
not consuming content.

---

## Social Systems

ALL social systems live primarily inside the SOCIAL tab/panel.

The SOCIAL layer exists to support:

* discovery
* interaction
* connection
* atmosphere
* presence

The SOCIAL tab may contain:

* notifications
* follows
* favorites
* realtime presence
* guestbook systems
* messaging
* visitor activity

The app should NEVER become:
a generic social feed platform.

The canvas remains the emotional center.

---

# EMOTIONAL GOALS

Users should feel:

* seen
* visited
* remembered
* perceived
* socially present

Following someone should feel like:
subscribing to their world,
not their content output.

The internet feeling should be:
old-web,
personal,
creative,
human,
anti-corporate.

---

# HIGH PRIORITY SYSTEMS

## Guestbook / Interaction Wall

One of the most important future systems.

Visitors should be able to leave:

* text
* images
* gifs
* stickers
* drawings
* visual marks

This should feel:
messy,
human,
nostalgic,
emotional.

Not like a comments section.

The space itself becomes:
a collaborative artifact.

---

## Presence / Atmosphere

MNEMO should feel alive.

Important systems:

* realtime messaging
* live presence
* live viewing indicators
* instant social updates
* ambient activity

Silence kills retention.

Users should feel:
“people are here.”

---

## Identity Systems

Users should feel rewarded for:

* self expression
* vulnerability
* aesthetics
* creativity
* customization

Future systems may include:

* collectibles
* visual unlocks
* rare decorations
* room evolution
* mood/status systems
* music presence
* archived memories

The profile should feel like:
an extension of the user’s mind.

---

# TECHNICAL ARCHITECTURE

## Stack

* Next.js App Router
* TypeScript strict
* Supabase

  * Postgres
  * Realtime
  * Storage
  * RLS
* Vercel deploy
* No ORM

---

# CANVAS ARCHITECTURE

## Unified State

All canvas state lives in:

```ts
elements: CanvasElement[]
```

CanvasElement is a discriminated union using:

```ts
elementType
```

Current element families:

* card
* image
* text
* gallery
* profile
* media
* postit

---

## Operation System

Two operation layers exist:

### applyOp(op)

Realtime state mutation with side effects.

### reduceOp(elements, op)

Pure deterministic reducer without side effects.

Used for:

* replay
* hydration
* switchCanvas
* deterministic rebuilds

---

## State Rules

Always use:

```ts
setElements(prev => ...)
```

Never mutate state directly.

Ops must remain:

* idempotent
* replay-safe
* deterministic

---

# STORAGE ARCHITECTURE

Storage lifecycle correctness is important.

Images uploaded to Supabase Storage must NOT become orphaned.

CanvasImage includes:

```ts
storage_path?: string
```

This is the canonical storage ownership reference.

The system must:

* persist storage_path on upload
* delete storage objects when canvas image is deleted
* avoid duplicate cleanup paths
* centralize deletion logic

Single source of truth:
`applyOp -> delete_image`

No duplicated cleanup logic in:

* UI handlers
* drag handlers
* trash handlers
* feed systems

Storage cleanup must be:

* fire-and-forget
* non-blocking
* deterministic

Future orphan cleanup may use:

* scheduled jobs
* storage reconciliation scripts
* DB/storage consistency checks

---

# REALTIME PRINCIPLES

Realtime systems should:

* feel instant
* remain optimistic
* degrade gracefully

Use:

* optimistic UI
* rollback safety
* cleanup guards
* effect cleanup refs

Avoid:

* duplicate subscriptions
* race-condition-heavy architectures
* state divergence

---

# UI / VISUAL DIRECTION

MNEMO visual language:

* dark
* brutalist minimal
* editorial
* sharp geometry
* restrained glassmorphism
* emotionally atmospheric

Avoid:

* corporate SaaS feeling
* generic social media aesthetics
* overly colorful UI
* addictive feed design patterns

The interface should feel:
intentional,
quiet,
personal,
slightly haunting.

---

# ENGINEERING PRINCIPLES

Priorities:

1. Stability
2. Architectural consistency
3. Emotional UX
4. Realtime atmosphere
5. Social depth
6. Performance optimization

Avoid:

* unnecessary rewrites
* overengineering
* fragmented state ownership
* duplicated systems
* hidden side effects

Architecture should remain:

* understandable
* deterministic
* scalable
* replay-safe
* emotionally coherent with product vision
