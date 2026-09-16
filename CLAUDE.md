# MNEMO — Contexto de proyecto para Claude Code

Este archivo documenta decisiones de producto y arquitectura ya tomadas. Toda
sesión nueva debe leerlo y verificar el estado real del repo (git log, código)
antes de escribir código — no asumir que lo implementado coincide con lo
planeado acá hasta confirmarlo.

## Arquitectura

- ProfileCard es el **núcleo funcional** de MNEMO — el único componente
  funcional del canvas.
- No existen (ni son objetivo del producto) standalone functional modules:
  Social, Music, Links, Stats, Guestbook, etc. son **capacidades/bloques
  internos de ProfileCard**, no elementos independientes del canvas.
- El canvas = ProfileCard (fija, centrada, no draggable) + elementos
  decorativos libres (imágenes, GIFs, stickers, marcos, overlays).
- Los elementos decorativos **sin link asociado** son "ghost" en
  vista pública (`pointer-events: none` — no deben poder seleccionarse ni
  interceptar clicks); los que sí tienen link siguen siendo interactivos. Ver
  `hitStack.ts` / `canvasSelectionGuards.ts` (Etapa 3B.4, cerrada).
- Los elementos decorativos **nunca deben bloquear** a los elementos
  funcionales de ProfileCard (Contact Links, Music player, etc.) — confirmado:
  `CardLayers.tsx`'s content layer nunca aplica `pointer-events: none` a los
  bloques internos.
- No tocar `space_mobile` ni la arquitectura mobile legacy
  (`MobilePublicCanvas.tsx`, `mobileMerge.ts`) salvo requerimiento explícito
  de una etapa futura.
- La Etapa 3 de composición/constraints está **cerrada, no reabrir**:
  - `computeComposition()` (`cardComposition.ts`) — las 5 topologías,
    `resolveAxis`, `resolveCentered`, `resolveContentBlock`, scoring. No es el
    lugar para agregar features nuevas.
  - `blockConstraints.ts` — anchor↔rect, snapping/hysteresis, anti-overlap.
    Reutilizar, no duplicar.
  - `computeBlockLayout()` es el punto de extensión real para bloques nuevos:
    cadena de prioridad fija PFP → Identity → Location → Views → Links →
    Music (cada bloque nuevo se agrega como parámetro opcional adicional,
    mismo patrón que `links`/`music`; con el parámetro ausente, el output es
    byte-idéntico al estado anterior — ver los tests de regresión en
    `cardComposition.test.ts`).
  - `computeRequiredCardHeight()` (`cardGeometry.ts`) — el growth vertical de
    ProfileCard. Generalizado en 4.2-C.1 de `extraBlock` (un solo bloque) a
    `extraBlocks[]` (array, suma en una sola llamada — dos llamadas separadas
    por bloque subestiman el alto real cuando hay más de un bloque presente,
    ver el doc comment del archivo). Reutilizar este shape para cualquier
    bloque nuevo que necesite crecer la card.
  - La arquitectura de imágenes decorativas / hit-testing de 3B.4 tampoco debe
    reabrirse salvo que exista un bug real.

## Decisiones de producto

- No presets visuales.
- No estilos genéricos/generados por IA.
- No inline editing (todo pasa por el menú de configuración).
- No emojis en ningún lado de la UI (iconos son SVG propios o los ya
  existentes en `SocialIcons.tsx`).
- No Guestbook.
- No Favorites (sacado del roadmap).
- No agregar más Stats — **Views es el único stat que mostramos**.
- Music con plataformas externas (Spotify/YouTube/SoundCloud embeds/SDKs)
  queda **diferido indefinidamente**, no es parte del roadmap actual.
  `musicEmbed.ts` sigue siendo código muerto (no usado) — no limpiar/tocar
  salvo que se retome esa decisión explícitamente.
- Music implementado = solamente audio propio (upload) o URL directa a un
  archivo reproducible por `<audio>` nativo (`MusicBlockData.sourceType:
  "upload" | "url"`).
- Gallery será la **última feature grande** que se agrega dentro de
  ProfileCard.
- Después de Gallery: Effects + Personalization (sistema compartido de
  efectos visuales).
- Después de eso: Global Design System.
- A partir de ahí, no agregar features nuevas salvo bugs reales o necesidad
  concreta — foco en polish/QA.

## Estado del roadmap

```text
4.1 Cleanup              DONE
4.2-A Infrastructure     DONE
4.2-B Contact Links      DONE
4.2-C Music
  C.1 Composition        DONE
  C.2 Player             DONE
  C.3 Music Menu         NEXT
4.2-D Gallery            NEXT AFTER MUSIC
5. Effects + Personalization
6. Global Design System
7. Polish / QA
```

**C.3 (Music Menu) todavía NO está implementado.** Hoy no existe ninguna UI
para setear `card.music` (audioUrl/title/artist/artwork/volume) — el player
(`ProfileMusicPlayer.tsx`) está completo y funcional, pero solo es alcanzable
sembrando datos manualmente hasta que exista el menú. C.3 debe agregar:

- enable/disable del bloque Music,
- URL directa o upload de audio,
- title, artist,
- upload de artwork,
- initial volume,
- persistencia (mismo mecanismo genérico `updateProfile`, sin infraestructura
  nueva),
- preview,
- delete/disable.

Seguir el patrón de `ProfileContactLinksMenu.tsx` (4.2-B) — mismo lugar
(`ProfileConfigMenu.tsx` → vista "datos"), mismos componentes de `@/ui`.

## Modelo de datos — bloques internos ya implementados

- **Contact Links** (`ContactLink[]` en `card.contactLinks`): `{id, url}` —
  la plataforma se deriva de `url` vía `detectPlatform()`
  (`SocialIcons.tsx`) en cada render, nunca se persiste. Posición vía
  `linksAnchorX/Y`.
- **Music** (`MusicBlockData` en `card.music`): `{sourceType, audioUrl,
  title?, artist?, artwork?, volume?}`. `volume` es el volumen inicial
  configurado por el owner — **nunca** el volumen en vivo. `playing`,
  `currentTime`, `duration`, volumen en vivo y `muted` son estado LOCAL del
  visitante (`useState` dentro de `ProfileMusicPlayer.tsx`), nunca se
  persisten ni se agregan a `ProfileCardData`. Posición vía
  `musicAnchorX/Y`.

## La próxima sesión

Debe empezar revisando este archivo y el estado real del repo (`git log`,
código) antes de escribir código. El siguiente trabajo es **4.2-C.3 — Music
Menu** (no implementado todavía en este checkpoint).
