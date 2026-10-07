# MYLAND Editor v3: plan de implementación y checkpoint

> **Fuente de verdad** para implementar el diseño "MYLAND Editor v3" de Claude Design sobre el editor existente.
>
> **Relación con los documentos anteriores de esta carpeta:**
> - Este documento reemplaza a `implementation-plan.md` (Fases 3–7) en orden y alcance.
> - Reemplaza la dirección visual "Darkroom" de `design-direction.md` y del checkpoint de `CLAUDE.md`.
> - `design-direction.md` e `interaction-model.md` siguen vigentes en lo que no contradigan este documento: modelo objeto-primero, capacidades, accesibilidad y Esc por capas.
>
> Creado el 2026-10-07. Una sesión nueva tiene que leer primero **§ 1. Checkpoint**.

---

## 1. Checkpoint (dónde estábamos)

**Estado de git al crear el checkpoint**
- **Branch de trabajo:** `feature/myland-editor-v3`, creada desde `main` en `44f4acc`. Va pusheada a `origin`.
- **`main` = `origin/main` = `44f4acc`** (`feat: implement menu editor inspector phase 2`). Incluye:
  - Iteración 0 (`b69b635`);
  - docs de la dirección UX (`2e76d1a`);
  - Fase 1 Cimientos (`d617ea2`, `06a1cc9`);
  - Fase 2 Inspector acoplado + lista de objetos (`44f4acc`).
- `claude/zealous-goldberg-xlerxx` (branch de Cloud) apunta al mismo `44f4acc`. Ya está mergeada; se conserva.
- **Working tree esperado:** solo `.claude/settings.local.json` modificado. Son permisos locales: no se commitean nunca.
- **Este checkpoint es un commit solo de documentación** sobre `44f4acc`, en `feature/myland-editor-v3`. No modifica código funcional.

**Verificación sobre `44f4acc`**
- `npm test`: 504/504.
- `npx tsc --noEmit --incremental false`: limpio.
- `npx next build`: limpio (13/13 páginas).

**Fases**
- **Terminadas, mergeadas a `main`:**
  - Block 1, Block 2, Iteración 0;
  - Menu Redesign Fase 1 (Cimientos) y Fase 2 (Inspector acoplado + lista de objetos).
- **Sin QA en navegador:** la Fase 2. El usuario sí probó la Iteración 0.
- **NO empezadas:** las fases 0, A, B, C, D, F, E, G, H e I de este documento.
  - La fase 0 se completa con el commit de este checkpoint.

**Siguiente acción exacta**
1. Abrir una sesión nueva en `C:\Users\Nico\Desktop\mnemo.app`.
2. `git switch feature/myland-editor-v3 && git pull`.
3. Verificar:
   - `git status`: solo `settings.local.json`;
   - `git log --oneline -3`: arriba, el commit del checkpoint.
4. Leer este documento y el checkpoint de `CLAUDE.md`.
5. Verificar que el MCP `claude-design` esté conectado (`claude mcp list`). Si no, `/design-login`.
6. **Arrancar la Fase A** (§ 6), solo con el OK del usuario, con el flujo de trabajo de § 9.

---

## 2. Objetivo general

Llevar al producto real la UX/UI aprobada en Claude Design (`MYLAND Editor v3`), **sin reescribir el editor ni el motor**:

```
NEW EDITOR UI                       (diseño de Claude Design: shell, inspector, controles, temas)
        ↓
EXISTING EDITOR STATE / ACTIONS     (effectBinding, editorCapabilities, ops update_*/add/delete,
                                     y lo que agregan B/C: selección central, controladores, historial)
        ↓
EXISTING PROFILE / CANVAS ENGINE    (PROTEGIDO, § 4)
```

**Calidad buscada:** MYLAND + energía The Designers Republic + UX de calidad Apple/iOS + Liquid Glass sutil.

**Lo que NO tiene que parecer:** SaaS genérico, dashboard, panel de administración, glassmorphism excesivo, bordes o cards de más, solo violeta, crema/papel, cartoon, ruido visual.

---

## 3. Diseño de Claude Design y su relación con el repo

**El proyecto**
- Proyecto: `b4ee73c0-786c-4151-937e-78d0758a3e74`
  (https://claude.ai/design/p/b4ee73c0-786c-4151-937e-78d0758a3e74?file=MYLAND+Editor+v3.dc.html).
- Se lee con el MCP `claude-design` (local, `https://api.anthropic.com/v1/design/mcp`). Necesita `/design-login` una vez.

**Archivos**
- **Principal:** `MYLAND Editor v3.dc.html`. Tiene 10 pantallas: 01 Sala, 02 Tarjeta, 03 Navegación, 04 Texto, 05 Imagen, 06 Galería, 07 Música, 08 Efectos, 09 Publicar, 10 Angosto.
  - Incluye una **"Dependency sheet" D1–D8** que coincide con este plan.
  - Su script tiene los datos de cada pantalla: chips, filas de efectos, notas por pantalla y deps.
- **Controles:** `M3Slider`, `M3Toggle`, `M3Color`, `M3Section` y `M3Select` (marco de selección), en `.dc.html`.
- **Design System:** `_ds/mnemo-design-system-bf742855-…/` (`_ds_bundle.js` con `Icon` y otros, `tokens/*.css`, `components/components.css`).
- **Otros:** `assets/myland-mark.png` y `support.js`, que es el runtime de las previews y **no se porta**.

**Reglas de la relación**
- **Claude Design es la fuente de verdad visual y de UX. El repo es la fuente de verdad funcional:**
  - capacidades;
  - modelo de datos;
  - persistencia;
  - comportamiento del canvas.
- **No se copia el HTML.** El diseño se mapea sobre los primitivos y el estado existentes. No se crea un editor paralelo.
- **Si el mock simplifica un control, se mantiene el comportamiento actual con progressive disclosure.**
  - Ejemplo: el mock muestra Peso como slider de 100 a 900, pero hoy solo se ofrecen los pesos cargados de cada fuente.
  - No se pierde ninguna capacidad: la matriz de `editorCapabilities` lo vigila.
- **Lo representacional del mock no se implementa:**
  - la barra de pantallas;
  - "Dependencias";
  - los badges D1–D8;
  - "CANVAS EXISTENTE · REPRESENTACIÓN";
  - "100%" de zoom en el rail;
  - los datos de ejemplo ("Mara Ibáñez", "sala-04").

**Design System de MYLAND (tokens del diseño)**

- **Tipografía** (`tokens/typography.css`). Nada por debajo de 11px.
  - `--font-display`: Bricolage Grotesque.
  - `--font-sans`: Geist.
  - `--font-mono`: Geist Mono.
  - `--font-serif`: Instrument Serif, en italic editorial.
  - Roles: `--type-title 650 22px` (título de objeto en el inspector), `--type-label 450 13px`, `--type-control 550 13px`, `--type-value 450 12px mono`, `--type-eyebrow 600 11px`, `--type-accent` serif 22px.
  - Las fuentes se cargan desde Google Fonts (`tokens/fonts.css`). **Ninguna está en las fuentes del canvas** (`CANVAS_FONTS`), así que no cambian ningún perfil. Se verifica con un test en la Fase A.
- **Temas del editor (variables `--t-*` de `MYLAND Editor v3.dc.html`):**

  | Token | light | dark | og |
  |---|---|---|---|
  | panel | `#FFFFFF` | `#121214` | `#FFFFFF` |
  | field / hover | `#F2F2F4` / `#E9E9EC` | `#1C1C20` / `#25252A` | `#F2F2F4` / `#E9E9EC` |
  | ink / ink2 / ink3 | `#0B0B0C` / `#6B6B73` / `#A1A1AA` | `#F4F4F5` / `#9B9BA4` / `#5F5F68` | `#0B0B0C` / `#66666E` / `#A1A1AA` |
  | track / track2 | `rgba(0,0,0,.09)` / `#E4E4E7` | `rgba(255,255,255,.10)` / `#2C2C31` | igual que light |
  | fill (slider) | `#6B4EFF` | `#8B73FF` | `#6B4EFF` |
  | sel / selInk (chip activo) | `#6B4EFF` / `#FFF` | `#7B61FF` / `#FFF` | `#C6F432` / `#0B0B0C` |
  | on / knobOn (switch) | `#0B0B0C` / `#FFF` | `#C6F432` / `#0B0B0C` | `#FF5C9D` / `#FFF` |
  | edit (modificado) | `#C2541A` | `#FF8A3D` | `#C2541A` |
  | rail / railInk / railSel / railSelInk | `#0B0B0C` / `#8A8A93` / `#6B4EFF` / `#FFF` | `#000` / `#6F6F78` / `#C6F432` / `#0B0B0C` | `#6B4EFF` / `rgba(255,255,255,.72)` / `#C6F432` / `#0B0B0C` |
  | glass / glassInk / glassInk2 | `rgba(255,255,255,.80)` / `#0B0B0C` / `#6B6B73` | `rgba(16,16,18,.58)` / `#F4F4F5` / `#9B9BA4` | `rgba(16,16,18,.55)` / `#FFF` / `rgba(255,255,255,.65)` |
  | pop (popover) | `rgba(255,255,255,.78)` | `rgba(26,26,30,.74)` | `rgba(255,255,255,.80)` |
  | seg / segInk | `#FFF` / `#0B0B0C` | `#2E2E34` / `#F4F4F5` | `#0B0B0C` / `#FFF` |
  | n1–n4 (tono de sección 01–04) | `#6B4EFF` `#E11D74` `#C2541A` `#5E7A00` | `#9B85FF` `#FF5C9D` `#FF8A3D` `#C6F432` | igual que light |

  El detalle completo está en el archivo de diseño: `glassEdge`, `glassBtn`, `panelShadow`, `segShadow`.
- **Colores de marca:**
  - violeta `#6B4EFF`: selección y marco;
  - rosa `#FF5C9D`: Publicar y Agregar;
  - lima `#C6F432`;
  - naranja `#FF8A3D`: modificado y cambios.
- **Controles:**
  - **Slider:** label 13/500, valor en mono 12 dentro de una pastilla `field`, track de 4px, thumb blanco de 18px que escala a 1.18 al arrastrar, y el valor cambia a `fill` mientras se arrastra.
  - **Switch:** 40×24 con knob de 20px y resorte `cubic-bezier(.34,1.56,.64,1)`.
  - **Color:** label, hex en mono y círculo de 24px.
  - **Sección:** número en mono 10.5 con su tono, título en mayúsculas mono 10.5 con tracking .12em y "N cambios" con el punto naranja.
  - **Marco de selección:** contorno violeta de 1.5px con etiqueta violeta (nombre), etiqueta negra con texto lima (coordenadas) y handles blancos de 8px.

**Desvío consciente del mock (seguridad del producto)**
- Topbar de 60px sobre el canvas, pero `CANVAS_TOP_OFFSET` **no cambia** (§ 7, R1).

---

## 4. Sistemas PROTEGIDOS

**No se modifican salvo necesidad técnica demostrada:**

| Sistema | Archivos principales |
|---|---|
| Render y composición de ProfileCard | `CardLayers.tsx`, `cardComposition.ts`, `blockConstraints.ts`, `computeBlockLayout`, el render de `ProfileCard.tsx` |
| Geometría y posicionamiento | `cardGeometry.ts` (`centerCardPosition`, `clampFreeformCardSize`, `computeRequiredCardHeight`, `shouldApplyGrowth`), `CANVAS_TOP_OFFSET` |
| Drag & drop | `useDragDrop.ts`, `dragClickGuard.ts`, regla `draggable={false}` |
| Matemática del resize | `resizeMath.ts`, `ResizeHandles.tsx` |
| Magnetismo y snapping existentes | magnetismo de stacks (`useDragDrop`), `snapAxis`/`nextAnchorAxis` (bloques internos) |
| Hit-testing | `hitStack.ts`, `getElementsAtPoint` (`CanvasBoard`), `resolveImageMouseDownTarget` |
| Guards de selección del canvas | `canvasSelectionGuards.ts`, `editorGuards.ts` (guard positivo por foco) |
| Interacciones de la card | `useCardInteractions.ts` |
| Floating y parallax | `cardMotion.ts`, `getParallaxStyle(layer, depth)` |
| Motor de estilos visuales de la card | `textEffects.ts`, `cardColors.ts` (resolvers), `profileCardEffects.ts`, `bgStyle.ts`, `blockStyle.ts` |
| Modelo de persistencia | tipos de `src/types/index.ts`, ops `add_*`/`update_*`/`delete_*`, cola `enqueueOp`/`applyOp`, publicación |
| Canvas público y mobile | `PublicCanvas.tsx`, `[handle]/page.tsx`, `MobilePublicCanvas.tsx`, `mobileMerge.ts`, `space_mobile` |

**Si una fase necesita tocar un sistema protegido, antes de modificarlo documenta:**
1. el motivo;
2. el archivo;
3. el comportamiento que puede cambiar;
4. el riesgo y cómo se aísla.

**Esta fase NO es una reimplementación del motor de ProfileCard.**

---

## 5. Decisiones tomadas (2026-10-07, por el usuario)

**Dirección visual**
- El diseño de Claude Design reemplaza a "Darkroom". Usa colores de marca y modos Light/Dark/OG.

**Temas**
- **Light/Dark/OG** son preferencias del editor:
  - guardadas localmente, con Dark por defecto;
  - se aplican **solo** a las superficies del editor: rail, topbar en modo editor, inspector y popovers.
- **Nunca** modifican el canvas, la ProfileCard, las imágenes, las decoraciones ni el contenido guardado. Un test lo garantiza.
- El selector vive **solo en "Tu sala" → Apariencia**. No va en el menú de cuenta.

**Alcance**
- **Galería:** no se implementa. Las galerías legacy mantienen su barra actual.
- **Layers: SÍ, como feature real:**
  - panel de Layers con la lista ordenada por el orden visual real (`zIndex + layer × 100`);
  - selección desde Layers;
  - reordenar (arrastrar, subir/bajar, al frente/al fondo) **dentro de la misma capa**;
  - selector **explícito** Fondo/Medio/Frente, que es la única forma de cambiar `layer`. Así se preserva la relación `layer` ↔ parallax;
  - reutiliza `zIndex`, `layer`, `depth` y `locked`, y persiste con las ops `update_*` existentes;
  - un reorden equivale a **una** operación de deshacer/rehacer;
  - **arregla el bug:** el doble click "traer al frente" (`CanvasBoard.tsx` ~3140 imagen, ~3483 card legacy) hoy solo hace `setElements`, sin `enqueueOp`, y no persiste;
  - **no incluye:** ocultar elementos, un modelo de datos nuevo ni features no justificadas.
- **Grid visual: SÍ:**
  - mostrar u ocultar cuadrícula;
  - solo en el editor, nunca en el perfil público;
  - sin eventos de puntero;
  - dentro del wrapper del canvas, así acompaña el desplazamiento de vista;
  - preferencia local;
  - toggle en "Tu sala" → Lienzo;
  - **sin tocar** `useDragDrop.ts` ni el motor de resize.
- **Ajuste a la cuadrícula (snapping):** más adelante, en la fase I, aislada.
- **Fuera de alcance:**
  - presencia en tiempo real ("2 visitando");
  - conteo y lista de cambios sin publicar (D6): Publicar va sin conteo, que es el fallback del propio diseño;
  - "Mover vista";
  - cualquier panel de capas distinto de Layers;
  - Galería.

**Deshacer/Rehacer global: un gesto de edición = una operación**
- **Cubre:** cambios de estilo, mover o redimensionar objetos, Layers, agregar y borrar.
- **Ejemplos de gestos:**
  - slider de tamaño = 1;
  - cambiar un color = 1;
  - cambiar el fondo = 1;
  - arrastrar un objeto = 1;
  - reordenar varias capas = 1;
  - agregar = 1;
  - borrar = 1.
- **Vista en vivo:** el valor se aplica localmente en cada `onChange`, pero **no** se crea una entrada de historial por cada `onChange`.
- **Dónde termina cada gesto:**

  | Gesto | Fin |
  |---|---|
  | Slider con puntero | `pointerup` |
  | Slider con flechas | `blur` o ~500ms sin teclas |
  | Selector de color | cerrar o confirmar |
  | Campo de texto | `blur` o pausa |
  | Toggle o elección discreta | inmediato |
  | Arrastrar o redimensionar | al soltar, en el punto donde ya se persiste (`persistDragResult`), **sin tocar la matemática** |
  | Reorden de Layers | una operación agrupada |

- **Cada entrada:**
  - guarda el estado anterior y posterior, con objetos completos para que no reaparezcan keys ausentes;
  - deshace y rehace por las ops existentes, así persistencia, el estado "pendiente" de Publicar y la vista pública funcionan sin cambios.
- **Compatibilidad:** la pila actual (`Array<() => void>`, que cubre agregar y borrar) se migra a pares deshacer/rehacer sin regresión.
- **Persistencia:** los patches consecutivos del mismo objeto se unen en la cola.
- **Atajos:** Ctrl/⌘+Z y Shift+Ctrl/⌘+Z, respetando el deshacer nativo dentro de los inputs de texto. Más los botones de la topbar (D).

**Git**
- Todo se trabaja en `feature/myland-editor-v3`.
- **Cada fase:** revisión, tests, `tsc`, build, commit y push a esa branch.
- **El merge a `main` es por fase y solo con OK explícito del usuario.** Nunca se commitea directo en `main`.

**Se mantienen de antes**
- Sin presets visuales (Minimal/Glass/Creator), sin estilos generados por IA, sin inline editing.
- Name, handle, bio y demás datos se editan desde el inspector.
- Progressive disclosure sí, eliminación de capacidades no. Los controles avanzados siguen disponibles.
- ProfileCard es el núcleo, Music es independiente y las imágenes son elementos separados.
- No se reintroducen SocialCard, StatsCard, LinksCard, Guestbook, Gallery, Analytics ni Favorites como módulos.
- Siguen vigentes las decisiones O1–O4 de `CLAUDE.md` y la Iteración 0:
  - guard de teclado positivo por foco;
  - Ctrl/⌘+flechas para redimensionar;
  - Medidas;
  - O2/O3/O4 de Music y glow.

---

## 6. Fases

**Orden: `0 → A → B → C → D → F → E → G → H`, después `I`.**

- **Por qué D va antes que F:** no hay dependencia técnica fuerte entre F y D, porque las dos dependen de B y C. Pero D fija el contenedor físico donde vive F:
  - el dock pasa del panel pegado de 320px de la Fase 2 al flotante de 360px con 12px de margen, `top:72` y radio 22, bajo la topbar glass;
  - eso cambia el offset de vista (`inspectorViewOffset`) y el breakpoint con su test (hoy `320 + 640 + 32 = 992`);
  - "Tu sala" (D) estrena el header de inspector que F reutiliza.
- **E (Layers)** solo depende de C y D.

### Fase 0: Documentación
- **Hecha con este checkpoint:** este documento más `CLAUDE.md`.

### Fase A: Tema del editor, tipografía y controles
- **Objetivo:** el lenguaje visual nuevo, sin cambios de estructura.
- **Alcance:**
  - Los temas Light/Dark/OG (`--t-*`, § 3) entran en la fuente única de tokens.
    - La Fase 1 genera las `--ui-*` desde `T.ui`. Se extiende para emitir un set por tema, scopeado a un atributo (por ejemplo `data-editor-theme`) que solo llevan las raíces del editor.
  - Fuentes del editor y roles tipográficos del DS.
  - Restyle de los primitivos **existentes** al lenguaje M3:
    - `SliderRow`;
    - `Toggle` (switch);
    - `ColorRow` / `ColorSwatch`;
    - `MenuSection` (sección numerada con tono y "N cambios");
    - `Tabs` (segmentado);
    - `Collapsible`, `TextInput`, `ActionButton`, `IconButton`.
  - El hook y el store de la preferencia de tema (sin UI: el selector llega en D).
- **Tests:**
  - las cards nunca leen `--t-*` ni el atributo de tema;
  - las fuentes nuevas no están en `CANVAS_FONTS`;
  - contraste en los 3 temas, con atención a OG (lima y rosa sobre blanco);
  - guardia de tokens actualizada.
- **Archivos:**
  - `src/ui/tokens.ts`, `src/ui/editor.css`, `src/app/layout.tsx` (fuentes);
  - `src/ui/*` (primitivos), `src/ui/uiTokens.test.ts`;
  - un archivo nuevo para la preferencia de tema (por ejemplo `src/lib/editorTheme.ts`).
- **Riesgo:** bajo a medio, porque es visual y afecta a todos los menús.

### Fase B: Arquitectura del editor (D1 + D2)
- **Objetivo:** una sola fuente de verdad de selección y un host del inspector fuera de `ProfileCard`. Sin cambio visual mayor.
- **Alcance:**
  - **Estado único de selección del editor** (store o context): `{ selectedIds, target: { kind: "room"|"profile"|"text"|"image"|"music", id?, objectId? } }`.
    - `ProfileInspector` pasa a ser **controlado**.
    - Absorbe `inspectorSession` (objeto activo y scroll por card).
  - **`EditorHost`** en el nivel de `CanvasBoard`, por portal.
    - `ProfileCard` deja de montar el inspector: se quita el portal en `ProfileCard.tsx` ~1447 y las props del inspector de su comparador de memo.
  - **Angosto (<900px):** bottom sheet debajo del elemento seleccionado, nunca encima, con targets de 44px.
    - Reemplaza el overlay a la derecha de la Fase 2.
    - Se actualizan `inspectorViewOffset` y su test.
  - **Forma del dock:** el host la contempla, pero el tamaño final se fija en D.
- **No toca** la lógica de puntero, el drag, el hit-testing ni el render.
- **Tests:**
  - equivalencia: abrir y cerrar no escribe `card.x/y`;
  - el foco y el Esc por capas se mantienen;
  - el guard positivo sigue funcionando;
  - la matriz de capacidades.
- **Archivos:**
  - `CanvasBoard.tsx`, `ProfileCard.tsx`;
  - `ProfileInspector.tsx`, `InspectorShell.tsx`;
  - `inspectorSession.ts`, `inspectorViewOffset.ts`;
  - nuevos: `src/lib/editorSelection.ts`, `src/components/canvas/EditorHost.tsx`.
- **Riesgo:** alto/medio, porque toca archivos sensibles.

### Fase C: Controladores por objeto y deshacer/rehacer global (D3)
- **Objetivo:** que todas las escrituras pasen por un controlador por tipo de objeto y por el historial.
- **Alcance:**
  - **Controladores:** identidad, metadata, fondo, logo, links, texto, imagen y Music. Extraen las escrituras que hoy hacen esos menús.
    - Ya existen `useTypographyActions`, `useCardEffectActions` y `effectBinding`.
  - **Historial:** con las reglas de § 5 (Deshacer/Rehacer), incluidos `beginGroup`/`endGroup`, la unión de patches en la cola, los atajos y la migración de la pila actual.
- **Tests:**
  - un gesto = una entrada;
  - deshacer → rehacer;
  - grupos;
  - el deshacer de agregar y borrar sin regresión;
  - el orden de publicación;
  - sin commits perdidos al desmontar.
- **Archivos:**
  - `CanvasBoard.tsx` (pila de deshacer, cola, atajos);
  - `effectBinding.ts` (`owner.write` como costura);
  - `ProfileIdentityMenu`, `ProfileMetadataMenu`, `ProfileBackgroundMenu`, `ProfileLogoMenu`, `ProfileContactLinksMenu`, `MusicCardWidget.tsx`;
  - primitivos de `src/ui`, que avisan cuándo empieza y termina el gesto;
  - nuevos: `src/lib/editorHistory.ts` y `src/lib/objectControllers.ts` (o un archivo por objeto).
- **Riesgo:** medio.

### Fase D: Shell del editor (rail, topbar, "Tu sala" y cuadrícula visual)
- **Rail (64px):**
  - logo `myland-mark`;
  - Seleccionar (V);
  - Agregar (A): el menú `+` existente, sin cambiar sus funciones;
  - Capas (L): se activa en E.
- **Topbar glass, solo en contexto de editor:**
  - wordmark y ruta;
  - Deshacer/Rehacer (de C);
  - Vista previa: el perfil público existente;
  - Publicar, con los estados actuales y **sin conteo**.
  - **Se conservan** chats, señales, Browse, el cambio de modo y logout.
  - `Topbar.tsx` también la ven los visitantes, y esa variante no se toca.
  - **No cambia `CANVAS_TOP_OFFSET`.**
- **Dock con la forma del diseño:** 360px, flotante con 12px de margen y radio 22. Incluye el header de inspector: ruta en mono, título en display, aside en serif, medidas y Cerrar.
- **"Tu sala"** (inspector sin selección):
  - **Fondo:** wallpaper, color y viñeta, más desenfoque, brillo, música del espacio, fuente y cursor. Son los ajustes de MyLand, que **salen del menú `+`** con las mismas operaciones (`enqueueOp` idénticos).
  - **Lienzo:** "Mostrar cuadrícula".
  - **Apariencia:** Light/Dark/OG.
  - Mensaje vacío: "Tocá cualquier cosa de la sala para editarla."
- **Cuadrícula:** se dibuja dentro del wrapper del canvas, solo en el editor. Un test asegura que nunca aparece en `PublicCanvas` ni en `[handle]`.
- **Archivos:**
  - `Topbar.tsx` (variante editor), `CanvasBoard.tsx` (rail, MyLand, cuadrícula);
  - `InspectorShell.tsx`, `inspectorViewOffset.ts` (forma del dock), `tokens.ts`;
  - nuevos: `EditorRail.tsx`, `RoomInspector.tsx`, `CanvasGrid.tsx`, `InspectorHeader.tsx`.
- **Riesgo:** medio, por la Topbar compartida y porque MyLand tiene que quedar idéntico.

### Fase F: Inspector de la card con el diseño nuevo
- **Header:** el de D, con ruta `profile-card / <objeto>`, título, "de la tarjeta" y medidas.
- **Chips de objeto:** una fila horizontal que reemplaza a la lista agrupada de la Fase 2.
  - Mantiene la semántica de tablist APG.
  - Con el punto naranja si el objeto está modificado.
  - Chips de 44px en el bottom sheet.
- **Secciones numeradas** (01 Contenido, 02 Tipografía, 03 Color…):
  - campo de fuente con el nombre renderizado en su propia fuente;
  - Tamaño y Peso (con la regla de pesos cargados);
  - alineación segmentada;
  - "Espaciado ›" como disclosure;
  - puntos de modificado con reset que borra la key.
- **Efectos:** filas con muestra, nombre, estado y switch; se despliega una a la vez. Usa `effectBinding`.
- **Se conservan:**
  - el ruteo `OBJECT_SECTIONS`;
  - "Color de todos los textos";
  - los enlaces cruzados;
  - Medidas;
  - el Estilo del bloque.
- **La matriz de capacidades** se actualiza y su test tiene que pasar.
- **Archivos:**
  - `ProfileInspector.tsx`, `ObjectList.tsx`, `ProfileConfigMenu.tsx`;
  - `ProfileTypographyMenu.tsx`, `ProfileEffectsMenu.tsx` y los demás menús `Profile*`;
  - `RoleTypographyFields.tsx`, `BlockStyleFields.tsx`;
  - `editorCapabilities.ts`.
- **Riesgo:** medio, por las capacidades.

### Fase E: Layers
- **Alcance:** el de § 5 (Layers). Se abre desde "Capas" en el rail y se muestra en el dock.
- **Lógica pura `layerOrder.ts`:**
  - orden efectivo;
  - reorden dentro de la capa, que reescribe `zIndex`;
  - cambio explícito de capa;
  - devuelve los patches por elemento.
- **Ops `update_*`** según el tipo, agrupadas en un solo paso del historial (C).
- **Arreglo del bug** del doble click para traer al frente, usando la misma función.
- **Elementos legacy** (cards, galerías, etc.): aparecen en la lista para que sea fiel al canvas real, pero no se agregan features legacy.
- **Archivos:** `CanvasBoard.tsx` y los nuevos `LayersPanel.tsx`, `src/lib/layerOrder.ts` (+ test).
- **Riesgo:** medio/bajo. Cambia a propósito qué elemento recibe el click donde se superponen, así que hay que probar el hit-stack con una imagen sobre la card.

### Fase G: Texto, Imagen y Music en el dock (D8)
- **Texto:** contenido, fuente, tamaño, interletrado, mayúsculas, color y opacidad. **Solo los campos que hoy existen en `CanvasText`**: hay que verificarlos antes de implementar.
- **Imagen:**
  - reemplazar, quitar y opacidad;
  - esquinas y link, que hoy viven en la toolbar;
  - la capa se maneja desde Layers.
- **Music:**
  - deja su `MenuPanel` flotante y pasa al dock;
  - secciones Contenido, Fondo y Texto, más las filas Fuente, Efectos, Animar y Medidas;
  - O2/O4 sin cambios.
- **Widgets legacy:** mantienen su panel flotante (P4B).
- **Archivos:** `CanvasBoard.tsx` (chrome de texto e imagen), `MusicCardWidget.tsx` y los nuevos `TextInspector`, `ImageInspector`, `MusicInspector`.
- **Riesgo:** medio.

### Fase H: Navegación por partes (D4/D5)
- **Click 1** selecciona la card. **Click 2** sobre una parte, sin arrastre, abre ese objeto:
  - se resuelve con `data-role` en las líneas existentes y `closest()`;
  - `resolveClickAfterDrag` se extiende a cada bloque;
  - el drag de bloque no cambia;
  - el hit-stack 3B.4 no cambia: el texto **no** se marca como hot.
- **Esc** vuelve a la card.
- **Resaltado punteado y pastilla glass "Editando X · esc volver"**: solo en el editor, nunca en el render público.
- **Archivos:** `ProfileCard.tsx` (`data-role` + resaltado en modo editor) y `CanvasBoard.tsx` (puntero, **sensible**).
- **Riesgo:** alto/medio.

### Fase I (posterior): Ajuste a la cuadrícula
- **Función pura de ajuste** aplicada en los puntos donde ya se escribe la posición: drag, resize y nudge.
- **No cambia fórmulas.** Excluye la ProfileCard, que siempre se recentra. Hay que definir si Shift lo desactiva.
- **Toca sistemas protegidos** (`useDragDrop`, `resizeMath`, `canvasNudge`): antes hay que documentarlo según § 4.

---

## 7. Riesgos conocidos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | La topbar del diseño mide 60px y `CANVAS_TOP_OFFSET` es 44. Si se cambia, el efecto de centrado **reescribe `card.y`** en todos los perfiles al abrirlos. | La topbar glass se superpone al canvas sin cambiar el offset. Un test lo verifica. |
| R2 | `Topbar.tsx` también la ven los visitantes y la usan chats, señales y Browse. | El restyle se aplica solo en contexto de editor. Se conservan todas las funciones. |
| R3 | Contraste del modo OG (lima y rosa sobre blanco). | Medir los 3 temas en la revisión de accesibilidad. |
| R4 | Rehacer no existe y la pila guarda funciones sueltas. | Migrar a pares sin cambiar el deshacer de agregar y borrar. Tests de publicación y cola. |
| R5 | Layers cambia el destino del click donde hay superposición. | Es intencional. QA del hit-stack (imagen sobre la card). |
| R6 | La fase H es la zona más delicada (drag, 3B.4). | Fase aislada, regla de dos clicks y revisión de regresiones. |
| R7 | Perder capacidades al rediseñar (F, G). | Matriz `editorCapabilities` y su test por sección en cada fase. |
| R8 | El mock simplifica controles (Peso 100–900, etc.). | Se conserva el comportamiento actual con progressive disclosure. |
| R9 | `CanvasBoard.tsx` mide más de 4000 líneas. | Cambios chicos y aislados por fase, tests de equivalencia, sin refactor general. |
| R10 | Fuentes nuevas cargadas de forma global. | No afectan las cards porque no están en `CANVAS_FONTS`; se verifica con un test. Solo pesan en rendimiento. |
| R11 | `space_mobile`: el inspector se abre ahí. | No se cambia su render ni su arquitectura. Solo se prueba que el editor no se rompe. |

---

## 8. Fuera de alcance (explícito)

- **Features descartadas:**
  - presencia en tiempo real;
  - conteo y lista de cambios sin publicar;
  - "Mover vista";
  - un panel de capas distinto de Layers;
  - ocultar elementos;
  - Galería en el inspector y cualquier reintroducción de Gallery;
  - presets o estilos generados;
  - inline editing.
- **Cambios descartados:**
  - nuevo modelo de datos;
  - migraciones;
  - cambios al motor protegido sin documentar (§ 4);
  - snapping antes de la fase I.
- **Cosas que no se tocan:**
  - `CANVAS_TOP_OFFSET`;
  - el render público;
  - mobile legacy.

---

## 9. Flujo de trabajo por fase

1. **Plan:** el ingeniero inspecciona el código real y escribe un plan corto, con bitácora de progreso por ítem para retomar si hay un corte.
2. **Revisión del plan:** Interaction, Accessibility y Design Systems, en pocas líneas.
3. **Implementación:** sin commit hasta terminar la revisión.
4. **Revisión de la implementación real:** Visual, UX Critic, Accessibility y Capacidades/Regresiones.
5. **Correcciones y verificación de cierre** por parte de los mismos revisores.
6. **Verificación:** `npm test`, `npx tsc --noEmit --incremental false`, `npx next build`.
7. **Commit y push:** a `feature/myland-editor-v3`, sin `.claude/settings.local.json`.
8. **Actualización de documentos:** este documento (§ 1 y el estado de la fase) y `CLAUDE.md`.
9. **Merge a `main`:** solo con OK explícito del usuario.

**Regla de commits:** `git add -A -- . ':!.claude/settings.local.json'`, o rutas explícitas.
