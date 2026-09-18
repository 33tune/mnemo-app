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
  Etapa 4.2-C.2.1-P4A (cerrada) sacó del menú `+` los entry points de
  creación que todavía contradecían esto ("New Card", "Links", "Media",
  "Guestbook") — `addLinksCard`/`addMedia`/`addGuestbook`, el flujo
  `creatingCard`, los reducer cases y los render paths (`visCards`,
  `visGuestbooks`, `visSocialCards`, `visMusicCards`, `visLinksCards`,
  `visStatsCards` en `CanvasBoard.tsx`/`PublicCanvas.tsx`) siguen intactos
  deliberadamente — no crean nada nuevo, pero siguen mostrando/editando datos
  ya existentes. Ver **P4B pendiente** más abajo antes de tocarlos.
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
- `src/lib/dragClickGuard.ts` (Etapa 4.2-C.2.1) — helper puro
  `resolveClickAfterDrag()` compartido por `useDragDrop.ts`/`CanvasBoard.tsx`
  (drag de elementos top-level) y `ProfileCard.tsx`'s `startBlockDrag`
  (drag de bloques internos, hoy solo Contact Links lo consume). Distingue
  un click real del click final que el navegador dispara al terminar un
  drag ("consumir y limpiar" — leer el flag siempre lo resetea). Reutilizar
  este patrón para cualquier bloque interno futuro que combine drag +
  elemento clickeable (ej. un link real, un botón de play).
- **Regla: cualquier `<a>`/elemento nativamente draggable dentro de un bloque
  con drag propio DEBE llevar `draggable={false}`** (Etapa 4.2-C.2.1 round 2).
  Sin esto, mousedown+move sobre ese elemento dispara EN PARALELO nuestro
  drag por JS y el drag-and-drop nativo HTML5 del navegador — el nativo
  hijackea el gesto (deja de emitir `mousemove`/`mouseup` normales) y burbujea
  como `dragenter`/`dragover` hasta el wrapper del canvas, disparando el
  overlay "DROP IMAGES" de `CanvasBoard.tsx` y dejando el drag propio en un
  estado a medio terminar (el click de cierre no ve el drag como completado y
  termina navegando). Ya aplicado a Contact Links (`ContactLinkIcon` en
  `ProfileCard.tsx`) y a las imágenes del canvas (`<img draggable={false}>`
  en `CanvasBoard.tsx`, precedente ya existente). Aplicar el mismo patrón a
  cualquier `<a>`/`<img>` interno futuro dentro de un bloque con drag propio.
  Complementario: los handlers `onDragEnter`/`onDragOver` que muestran "DROP
  IMAGES" ahora filtran por `e.dataTransfer.types.includes("Files")` — sin
  ese filtro, CUALQUIER drag nativo que entre al canvas (no solo archivos)
  disparaba el overlay.
- **Music Block simplificado a MP3-only, sin artwork** (Etapa 4.2-C.2.3,
  filosofía "guns.lol mejorado" — building blocks simples, no un
  reproductor configurable). `ProfileMusicMenu.tsx` ya NO tiene tab
  URL/selector de source type (solo "subir MP3") ni ninguna UI de artwork
  (upload/reemplazar/quitar). `ProfileMusicPlayer.tsx` ya no renderiza
  artwork en absoluto. `sourceType`/`artwork` **siguen existiendo** en
  `MusicBlockData` por compatibilidad con datos ya persistidos (el player
  nunca leyó `artwork` para renderizar tras este cambio, y nunca leyó
  `sourceType` para nada) — no reintroducir esa UI sin pedido explícito.
  Ancho del bloque = `card.musicWidth` (slider en el menú, **único eje
  resizeable** — la altura es siempre `MUSIC_BLOCK_HEIGHT` fijo, nunca
  depende del ancho), clampeado entre `MUSIC_BLOCK_WIDTH_MIN=120` y el
  ancho disponible de la card. Music chico puede convivir horizontalmente
  al lado de otro bloque (Links) si hay espacio — eso ya lo resuelve
  `resolveOverlap()`/`escapeRect()` (`blockConstraints.ts`, sin tocar)
  eligiendo la dirección de escape más barata entre 4 candidatos, no hace
  falta lógica nueva de composición.
- **`CardFormat` ya no gatea el tamaño de ProfileCard** (Etapa 4.2-C.2.2,
  actualizado en 4.2-C.2.4). Sigue existiendo en el modelo de datos y sigue
  alimentando `FORMAT_BIAS` en `cardComposition.ts` (desempate suave de
  topología, nunca un gate estructural — `computeComposition()` nunca tocó
  w/h). El tamaño real es libre: `getFreeformCardBounds()` (`cardGeometry.ts`)
  usa `MIN_PROFILE_CARD_WIDTH=240` / `MIN_PROFILE_CARD_HEIGHT=220` — **constantes
  de producto explícitas, deliberadamente NO derivadas de `CARD_FORMATS`**
  (dos intentos previos de derivarlas — `Math.min` sobre los 5 formatos,
  después `Math.max` sobre los `ratioKind:"range"` — resultaron ser números
  indirectos con forma de formato, no una decisión real de producto; ver el
  doc comment de la función). `maxW`/`maxH` sí siguen derivándose de
  `CARD_FORMATS` (sin problema reportado ahí). `clampFreeformCardSize()`
  clampea ancho/alto de forma independiente, sin ratio lock. **No hay
  sliders de Width/Height en el menú** — `GeometryControls` se eliminó por
  completo de `ProfileConfigMenu.tsx`; el tamaño se cambia únicamente
  arrastrando los resize handles del canvas.
- **Una sola fuente de verdad para la posición de ProfileCard: `centerCardPosition(canvasW, canvasH, w, h, topOffset)`**
  (`cardGeometry.ts`, Etapa 4.2-C.2.4) — centra la card en ambos ejes,
  usado de forma idéntica por el resize-drag (`useDragDrop.ts`, síncrono, en
  el mismo `setElements` que escribe w/h), por el efecto de growth
  (`ProfileCard.tsx`, persiste `x`/`y` en el mismo `updateProfile` que `h`),
  y por `addProfile()` (`CanvasBoard.tsx`) al crear la card. Antes de esto
  existían DOS escritores de posición compitiendo (un efecto de recentrado
  vertical separado + el resize preservando "el centro que ya tenía") — eso
  causaba el salto/drift real. `card.x`/`card.y` siguen siendo la única
  fuente de verdad persistida — nunca un `top`/`left` de render calculado
  aparte. `viewportW`/`viewportH` viajan como props desde `CanvasBoard.tsx`,
  explícitamente `undefined` para `canvasMode==="space_mobile"`.
- **El growth automático de ProfileCard se pausa mientras hay un resize
  manual activo** (`shouldApplyGrowth(isResizing)` en `cardGeometry.ts`,
  Etapa 4.2-C.2.5) — `computeRequiredCardHeight()` solo puede crecer
  (`Math.max(currentH, ...)`); si el efecto de growth corre en paralelo a
  un resize-drag que está achicando la card, cada tick el growth
  "re-agranda" por encima de lo que el usuario acaba de arrastrar,
  produciendo oscilación/salto — root cause real de un bug de resize
  vertical que **dos intentos previos (minH derivado, luego
  `centerCardPosition`) no habían resuelto porque el problema nunca fue el
  cálculo de tamaño/posición en sí, sino que dos escritores competían por
  `card.h` durante el mismo gesto.** `isResizing` se deriva en
  `CanvasBoard.tsx` de `resizing?.type==="profile" && resizing.id===prof.id`
  (el mismo `resizing` state que ya expone `useDragDrop` — no es un segundo
  sistema de resize-state). Mientras `isResizing`, el efecto de growth sale
  temprano sin tocar `h`/`x`/`y`; al soltar, corre de nuevo normalmente y
  corrige la altura si el contenido lo requiere. **Cualquier problema nuevo
  de resize/growth debe revisarse primero por acá antes de tocar
  `computeRequiredCardHeight()`/`centerCardPosition()`/`clampFreeformCardSize()`,
  que ya están confirmados correctos en aislamiento.**

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
- Music implementado = **solamente subir un MP3** (Etapa 4.2-C.2.3 — ya no
  se expone la opción de URL directa en la UI, aunque `MusicSourceType`
  sigue existiendo en el tipo por compat con datos viejos). Sin artwork
  configurable por el usuario. Filosofía: "guns.lol pero mejorado" — simple
  building blocks + libertad de personalización de tamaño/posición, no un
  reproductor con muchas opciones.
- Gallery será la **última feature grande** que se agrega dentro de
  ProfileCard.
- Después de Gallery: Effects + Personalization (sistema compartido de
  efectos visuales).
- Después de eso: Global Design System.
- A partir de ahí, no agregar features nuevas salvo bugs reales o necesidad
  concreta — foco en polish/QA.

**Reprioridad 2026-09-18 — TERMINAR PROFILECARD primero.** Antes de tocar
Social/Browse o limpiar Analytics, ProfileCard tiene que llegar a un estado
prácticamente terminado: funcionalmente completa, personalizable, responsive,
estable, con arquitectura preparada para construir el resto del producto
alrededor suyo sin rehacerla. Orden vigente (ver roadmap abajo):
**Music → Gallery → Effects/Personalization → Responsive → ProfileCard
QA/freeze → recién ahí Social/Browse → eliminar Analytics → Global Design
System → QA final.** No agregar nada fuera de este alcance mientras
ProfileCard siga incompleta.

## Estado del roadmap

```text
4.1 Cleanup              DONE
4.2-A Infrastructure     DONE
4.2-B Contact Links      DONE
4.2-C Music
  C.1 Composition        DONE
  C.2 Player             DONE
  C.2.1 Editor Interaction + Canvas Cleanup
    P1 Selection bug post-drag        DONE (commit 23343f7)
    P2 Contact Links drag≠navigate    DONE (23343f7 + fix real en d06f241 —
                                       ver "Bugs resueltos" abajo)
    P3 Contact Links resize           DONE (commit 23343f7)
    P4A Cortar creación standalone    DONE (commit 23343f7)
    P4B Purga de datos legacy         PENDING — YA NO bloquea el roadmap de
                                       ProfileCard (deprioritizado 2026-09-18,
                                       ver nota abajo). Retomar cuando el
                                       usuario decida, no antes de Social/Browse.
  C.3 Music Menu         DONE (commit 8e698a0)
  C.2.2 Music redesign minimalista + ProfileCard freeform
        width/height + vertical centering estructural
                          DONE (commits 81b43a9, 0a13bb4, 0863b52 — 2026-09-19)
  C.2.3 Music simplificado (MP3-only, sin artwork, musicWidth)
                          DONE (commit d526770 — 2026-09-18)
  C.2.4 Fix resize/centering — minH explícito (240×220) +
        centerCardPosition() single source of truth
                          DONE (commit f41a88f — 2026-09-18)
  C.2.5 Fix growth-vs-resize race (shouldApplyGrowth/isResizing)
                          DONE (commit 9304607 — 2026-09-18)
GALLERY                  ELIMINADA DEL ROADMAP (2026-09-19) — no implementar,
                          no reintroducir sin pedido explícito del usuario.
                          Todo lo documentado en checkpoints previos sobre un
                          plan de Gallery queda obsoleto/no vigente.
5. Effects + Personalization   gaps puntuales, no una reconstrucción — ver
                                 audit 2026-09-18
6. Responsive ProfileCard      decisión pendiente (celulares reales sí/no,
                                 ver abajo) — ya no depende de Gallery
7. ProfileCard QA / freeze
8. Social → Browse
9. Eliminar Analytics
10. Global Design System
11. QA final / polish
```

**Reprioridad 2026-09-18:** el roadmap de arriba reemplaza cualquier mención
anterior de retomar Social/Browse o Analytics antes de cerrar ProfileCard —
ver la nota de "Reprioridad 2026-09-18" en Decisiones de producto. P4B
(purga de datos legacy) sigue documentado como pendiente pero explícitamente
**ya no bloquea** avanzar con Music/Gallery/Effects/Responsive — el usuario
decidió priorizar terminar ProfileCard por sobre cerrar esa purga.

**Checkpoint 2026-09-16 (commit `23343f7`) y 2026-09-17 (commit `d06f241`),
pusheados a `origin/main`:** cerraron 4.2-C.2.1 completo. `d06f241` fue la
corrección real de P2 — el fix de `23343f7` (consume-and-clear de `didDrag`)
era necesario pero no suficiente; la causa real era que el `<a>` de Contact
Links es nativamente draggable, lo que disparaba un drag-and-drop HTML5 del
navegador en paralelo al drag propio por JS y mostraba el overlay "DROP
IMAGES". Ver la regla arquitectónica de `draggable={false}` más arriba.

**Checkpoint 2026-09-18 — Music Menu (4.2-C.3) implementado.** `card.music`
ahora es configurable desde `ProfileConfigMenu.tsx` → "datos" vía el nuevo
`src/components/canvas/ProfileMusicMenu.tsx`: activar/desactivar (presencia
de `card.music`, mismo criterio que Contact Links con `contactLinks`), URL
directa o upload de audio (`accept="audio/*"`, mismo `uploadToStorage()` que
PFP/artwork), title, artist, artwork (upload/reemplazar/quitar), volumen
inicial. Artist/Artwork/Volumen quedan detrás de un `Collapsible` ("Más") —
progressive disclosure, no presets. Cero cambios en `cardComposition.ts`,
`blockConstraints.ts`, `cardGeometry.ts` ni en `ProfileMusicPlayer.tsx` — el
menú solo escribe a `card.music`, el bloque existente (`extraBlocks`,
`computeBlockLayout`, drag) se encarga solo del resto, exactamente como
estaba cerrado. Sin tests unitarios nuevos — no hay lógica pura nueva que
valga la pena testear (el componente es UI pura sobre infraestructura ya
testeada).

**Checkpoint 2026-09-19 — Music redesign + freeform sizing + vertical
centering (C.2.2), pusheados a `origin/main`:**
- **Music redesign** (`81b43a9`) — Music dejó de reclamar todo el ancho
  disponible (`computeMusicNaturalSize()` ahora acotado: 130px sin
  title/artist, 220px con — nunca más `availableWidth`) y perdió su
  background/border por defecto (hereda del ProfileCard, igual que Contact
  Links). `ProfileMusicPlayer.tsx` pasó de 3 filas fijas (100px) a 2 filas
  compactas (56px), con el volumen detrás de un popover en vez de una fila
  siempre visible. `MusicBlockData`/`ProfileMusicMenu.tsx`/persistencia sin
  cambios — cambio 100% de presentación/sizing.
- **Freeform width/height** (`0a13bb4`) — `GeometryControls`
  (`ProfileConfigMenu.tsx`) ya no tiene selector de formato: dos sliders
  Ancho/Alto, bounds vía `getFreeformCardBounds()` (`cardGeometry.ts`, unión
  de los min/max de los 5 `CARD_FORMATS` existentes, sin hardcodear un
  segundo set de números). El resize-drag de ProfileCard
  (`useDragDrop.ts`) ya no bloquea proporción para ningún formato,
  incluidos los que antes eran `ratioKind:"fixed"` (square/phone). `card.format`
  **sigue existiendo** en el modelo de datos y sigue alimentando
  `FORMAT_BIAS` en `cardComposition.ts` como desempate suave de topología —
  simplemente ya nadie lo vuelve a elegir desde el menú.
- **Vertical centering** (`0863b52`) — nuevo efecto en `ProfileCard.tsx`,
  mismo patrón que el efecto de growth existente: recalcula
  `Math.max(44, viewportH/2 - card.h/2)` cada vez que cambia `card.h` o el
  viewport, persiste solo si difiere. `viewportH` viaja desde
  `CanvasBoard.tsx` como prop nueva, **explícitamente `undefined` para
  `canvasMode==="space_mobile"`** (el efecto no corre ahí — cero cambios en
  la arquitectura mobile legacy). `card.y` sigue siendo la única fuente de
  verdad de posición (no hay override de render separado).
- Ningún cambio en `computeComposition()`, `blockConstraints.ts`, ni en la
  arquitectura de hit-testing/selección. 213/213 tests, `tsc`/`build`
  limpios en los 3 commits.

**Gallery fue eliminada del roadmap el 2026-09-19** — el plan técnico
detallado que existía en un checkpoint anterior (data model, sizing,
reorder, menu) **ya no es vigente**. No implementar, no retomar salvo
pedido explícito y nuevo del usuario.

**Checkpoint 2026-09-18 — Music simplificado + 2 rondas de fix de resize/centering
vertical, pusheados a `origin/main`:**
- **Music simplificado** (`d526770`) — se sacó el tab URL/source-type y toda
  la UI de artwork de `ProfileMusicMenu.tsx`; `ProfileMusicPlayer.tsx` ya no
  renderiza artwork. Nuevo `card.musicWidth` (slider en el menú, único eje
  resizeable — altura siempre fija). Ver la regla de Arquitectura
  correspondiente más arriba. `sourceType`/`artwork` quedan en el tipo por
  compat, sin UI.
- **Fix resize/centering, ronda 1** (`f41a88f`) — QA manual detectó que el
  resize vertical podía saltar a ~120px y que la card se desplazaba al
  resizear. Causa real: dos escritores de posición compitiendo (efecto de
  recentrado vertical separado + el resize preservando "el centro que ya
  tenía", nunca el centro real del canvas) — no el `minH` derivado de
  `CARD_FORMATS` de la etapa anterior. Fix: `centerCardPosition()` como
  única fuente de verdad (ver Arquitectura), `MIN_PROFILE_CARD_WIDTH=240`/
  `MIN_PROFILE_CARD_HEIGHT=220` como constantes explícitas (ya no derivadas
  de `CARD_FORMATS`), sliders de Width/Height eliminados del menú.
- **Fix resize/centering, ronda 2** (`9304607`) — el fix anterior no
  alcanzó: QA siguió viendo saltos/oscilación específicamente en resize
  **vertical** (horizontal funcionaba bien). Causa real, esta vez
  confirmada con una traza completa del gesto: el efecto de growth
  (`computeRequiredCardHeight()`, que solo puede crecer) corría en paralelo
  a un resize-drag activo que achicaba la card — cuando había Contact
  Links/Music configurados y el usuario arrastraba por debajo de lo que
  esos bloques necesitaban, growth re-agrandaba la card por encima de lo
  que el drag acababa de setear, tick a tick, generando la oscilación.
  Fix: `shouldApplyGrowth(isResizing)` — el growth se pausa mientras hay un
  resize manual activo sobre esa card. Ver la regla de Arquitectura
  correspondiente — **es la explicación definitiva de por qué las dos
  rondas anteriores de fix de resize no alcanzaban solas.**
- 234/234 tests, `tsc`/`build` limpios en las 3 rondas. Ningún cambio en
  `computeComposition()`, `cardComposition.ts`, `blockConstraints.ts`,
  `ResizeHandles.tsx`.

**Incidente de deployment 2026-09-18 (Vercel, no relacionado al código):**
después de pushear `9304607`, Vercel dejó de generar deployments para
`origin/main` — investigado a fondo (GitHub API: push/branch/commit
confirmados correctos, webhook "Git Integrations: Operational"). Causa
real: incidente de plataforma en Vercel ("Elevated Errors Triggering
Deployments", Build & Deploy en Partial Outage) confirmado en
vercel-status.com, iniciado ~20:32 UTC — nada de nuestro lado estaba roto.
Se pushearon dos commits vacíos para reintentar una vez Vercel empezó a
recuperarse (`61f6aa1` a las 20:40 UTC, todavía dentro del incidente;
`f543d02` a las 21:16 UTC, ya con el incidente en "Monitoring") — **ninguno
de los dos cambia código**, son únicamente triggers. Al momento de este
checkpoint, Vercel ya volvió a aceptar builds (generó y el usuario canceló
manualmente un deployment de `9304607` desde el dashboard) pero **todavía
no se confirmó que `f543d02` (el HEAD actual) haya deployado
exitosamente.**

**MUY IMPORTANTE para la próxima sesión: lo primero que hay que hacer es
confirmar en el dashboard de Vercel (o reconsultando la Deployments API de
GitHub) que `f543d02` — o el commit que sea HEAD de `origin/main` en ese
momento — deployó bien, y recién ahí hacer QA manual real de los fixes de
resize vertical de `f41a88f`/`9304607`, que nunca se pudieron verificar en
producción por el incidente.** No asumir que el fix funciona en producción
solo porque los tests pasan — esta etapa específica quedó sin QA en vivo.

**Siguiente etapa: Effects/Personalization** (gaps puntuales — shadow blur
independiente de intensity, font weight/letter-spacing, y verificar en
browser si tilt+floating se pisan al estar ambos activos, ver detalle en
"La próxima sesión" abajo) — ya no bloqueada por Gallery.

## Modelo de datos — bloques internos ya implementados

- **Contact Links** (`ContactLink[]` en `card.contactLinks`): `{id, url}` —
  la plataforma se deriva de `url` vía `detectPlatform()`
  (`SocialIcons.tsx`) en cada render, nunca se persiste. Posición vía
  `linksAnchorX/Y`. Tamaño de ícono configurable vía `card.linksIconSize`
  (14–32px, slider en `ProfileContactLinksMenu.tsx`, Etapa 4.2-C.2.1-P3) —
  ausente = `CONTACT_LINK_ICON_SIZE` (`contactLinksBlock.ts`), igual que
  antes de esta etapa.
- **Music** (`MusicBlockData` en `card.music`): `{sourceType, audioUrl,
  title?, artist?, artwork?, volume?}`. `sourceType`/`artwork` existen en el
  tipo por compat pero **la UI ya no los expone** desde la simplificación
  de la Etapa 4.2-C.2.3 (solo upload de MP3, sin artwork) — no confundir el
  tipo completo con lo que el menú realmente permite hoy. `volume` es el
  volumen inicial configurado por el owner — **nunca** el volumen en vivo.
  `playing`, `currentTime`, `duration`, volumen en vivo y `muted` son
  estado LOCAL del visitante (`useState` dentro de `ProfileMusicPlayer.tsx`),
  nunca se persisten ni se agregan a `ProfileCardData`. Posición vía
  `musicAnchorX/Y`. Configurable desde `ProfileMusicMenu.tsx` — activar/
  desactivar es la presencia/ausencia de `card.music`
  (`onChange({ music: undefined })` para apagar), sin boolean separado.
  **Ancho vía `card.musicWidth`** (slider en el menú, `MUSIC_BLOCK_WIDTH_MIN=120`
  hasta el ancho disponible de la card, default `MUSIC_BLOCK_WIDTH_DEFAULT=180`
  cuando está ausente) — es el único eje resizeable, ya NO content-driven
  por `hasText` como en la Etapa 4.2-C.2.2. Altura siempre
  `MUSIC_BLOCK_HEIGHT` fijo, nunca depende del ancho. Ver `musicBlockSizing.ts`
  (Etapa 4.2-C.2.3).

## La próxima sesión

Debe empezar revisando este archivo y el estado real del repo (`git log`,
código) antes de escribir código.

**Prioridad vigente: terminar ProfileCard antes que cualquier otra parte del
producto** (ver "Reprioridad 2026-09-18"). **Gallery está eliminada del
roadmap (2026-09-19) — no implementar, no retomar sin pedido explícito.**

**PASO 0, antes de cualquier otra cosa:** confirmar que el deployment de
Vercel para el HEAD actual de `origin/main` salió bien (ver "Checkpoint
2026-09-18 — Incidente de deployment" más arriba — al cerrar esta sesión
todavía no estaba confirmado), y recién ahí hacer QA manual real en
producción del resize vertical de ProfileCard (`f41a88f`/`9304607`) — nunca
se pudo verificar en vivo por el incidente de Vercel. Si el QA encuentra
que el bug sigue apareciendo, **releer las dos rondas de fix documentadas
arriba antes de proponer una tercera** — ya se descartaron `minH`
derivado de formatos y luego un problema de centrado; la causa confirmada
fue growth compitiendo con resize.

Orden exacto de lo que queda después del Paso 0:

1. **Effects/Personalization** — mayormente ya implementado y wireado a
   ProfileCard vía `PersonalizePanel.tsx`/`ProfileTypographyMenu.tsx`. Gaps
   puntuales encontrados en el audit: shadow blur no es independiente de
   shadow intensity (`sBlur = intensity * 40` en `CardLayers.tsx`); no hay
   control de font weight ni letter-spacing; **riesgo real a verificar**:
   tilt y floating animan la misma propiedad `transform` del mismo elemento
   — podrían pisarse entre sí si ambos están activos, confirmar en browser
   antes de dar Motion por cerrado. El invariante "opacity nunca toca
   content" está confirmado sólido en `CardLayers.tsx` (capas separadas).
2. **Responsive** — el motor de composición ya es size-aware; el gap real es
   que `card.w`/`card.h` son valores fijos sin binding al viewport en vista
   pública (hoy se re-escala con `scale()` uniforme, no reflow real).
   **Decisión pendiente del usuario, todavía sin resolver:** hoy un
   User-Agent de celular real nunca llega a ProfileCard/CanvasBoard — se
   enruta 100% a `MobilePublicCanvas`/`space_mobile` desde `[handle]/page.tsx`.
   Si "responsive" tiene que cubrir celulares reales, en algún momento hay
   que dejar de enviarlos a esa ruta (sin editar `MobilePublicCanvas.tsx`,
   pero sí dejar de usarlo para ese tráfico) — confirmar con el usuario si
   eso cuenta como excepción válida a "no tocar mobile legacy" antes de
   planificar esta etapa en detalle.
3. **ProfileCard QA/freeze** — las combinaciones de bloques/tamaños/efectos
   ya especificadas por el usuario.
4. Recién después: Social/Browse, eliminar Analytics, Global Design System,
   QA final. P4B (purga de datos legacy) se retoma cuando el usuario lo pida
   — ya no bloquea nada de lo anterior.

No adelantar Effects/Responsive fuera de este orden, no reintroducir Gallery
sin pedido explícito, y no tocar Social/Browse/Analytics/Global Design
System hasta cerrar ProfileCard QA.
