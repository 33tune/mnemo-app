# Plan de implementación — Editor MNEMO

## K. Arquitectura de componentes
| Pieza | Responsabilidad | Ubicación |
|---|---|---|
| `EffectState` + `bindEffect(owner:{raw,effective,write}, path)` | Un estado (off/paused/on + modified/inherited) que lee el valor efectivo y escribe el crudo, con pausa vía effectPause.ts. Compartido por card/PFP/texto/Music. Reemplaza los 4 cableados duplicados. El dueño abstrae la escritura: `updateProfile` o `update_profile` para la card, `setEffects` o `update_music` para Music. `EffectPath` hoy solo cubre `CardEffects` (`effectPause.ts:33`). Encender pasa por `withNeutralGlowOnCreate` (O3) y `glowFlagPatch`. | `src/lib/effectBinding.ts` (nuevo) |
| Defaults de rol | Salen del hardcode y pasan a `effectEditorDefaults.ts` | lib existente |
| `InspectorShell` | Aside acoplado de ~320px que evoluciona desde MenuPanel. h2 del objeto, header sticky, overlay en viewport angosto, offset de vista. | `src/ui/` |
| `ObjectList` | Radiogroup de chips con el texto real o una miniatura; la selección se sincroniza con el canvas | `src/components/canvas/` |
| `StyleObjectCard` | Placa espécimen de 56px (`resolveTextEffectStyle` + fondo efectivo) + caption + secciones. Reemplaza RoleTypographyFields. | idem |
| `EffectTile` + `TileGroup` | Miniatura, switch, detalle en acordeón exclusivo y estado pausado | `src/ui/` |
| Pickers visuales | `FontTiles`, `WeightRail`, `ColorWell` (con recientes/usados en la card) y `GradientBar` (desde GradientStops) | `src/ui/` |
| `MoreSettings` | Disclosure único de precisión | `src/ui/` |
| `forcePreview` | Modo de `useCardInteractions.ts` que fija las CSS vars de hover/tilt/spotlight. **Sin tocar CardLayers.** | `src/hooks/` |
| Style undo | Snapshot en pointerdown o al abrir un picker, y un `pushUndo` al final del gesto (pointerup; con teclado, blur o ~500ms sin teclas). Snapshot y restauración van por dueño (`update_profile` / `update_music`) y restauran objetos enteros. `pushUndo` se expone por context, no por prop drilling. El handler global de Ctrl/⌘+Z respeta los inputs de texto. | CanvasBoard.tsx (~1310) |
| Matriz capacidad→ruta | Test que falla si un campo editable queda sin UI | test nuevo |

## L. Lo que no se puede romper
- Hit-stack/ghost de 3B.4 (`hitStack.ts`, `canvasSelectionGuards.ts`).
- Drag de bloques internos, `dragClickGuard.ts` y `draggable={false}` en `<a>`/`<img>`.
- Guards de Iteración 0: "on" = visible, `inert` del color con gradiente, foco de MenuPanel.
- Modelo de pausa (`effectPause.ts`: apagar no borra) y read-effective/write-raw (`getProfileCardEffects`).
- `centerCardPosition` y `shouldApplyGrowth`. El inspector jamás escribe x/y.
- Composición, geometría, resize, CardLayers, render de texto e infra de animación: sin cambios.
- `space_mobile`, `MobilePublicCanvas.tsx` y `mobileMerge.ts`: intactos.
- Datos: cero migraciones. Los paths persistidos no cambian.
- Music (O2/O4):
  - paridad de `getMusicCardEffects`, con el menú leyendo el valor efectivo;
  - player idéntico cuando Tamaño/Fuente no tienen valor;
  - defaults propios de Music.
- Glow neutro al crear (O3). Los flags Exterior/Interior del glow.
- Layout de MyLand y de los widgets legacy que usan las primitivas de `src/ui`, sobre todo si cambia el ritmo de
  `MenuSection`/`Collapsible`.
- Guard positivo de teclado, nudge O1 y "Medidas" de la Iteración 0.

## Archivos afectados
- **Se reescriben:** ProfileConfigMenu, ProfileTypographyMenu, RoleTypographyFields (→ StyleObjectCard), ProfileIdentityMenu, ProfileMetadataMenu, ProfileEffectsMenu, ProfileBackgroundMenu, ProfileContactLinksMenu, ProfileLogoMenu y BlockStyleFields.
- **Se adaptan:**
  - MusicCardWidget (menú).
  - ProfileCard.tsx (`data-role`, navegación, portal → shell).
  - CanvasBoard.tsx (objeto seleccionado, undo).
  - useCardInteractions.ts, `src/ui/*` y effectEditorDefaults.ts.
  - `src/ui/editor.css` y `src/ui/tokens.ts` (una sola fuente de tokens).
  - `MenuSection`/`Collapsible`: sale el `marginTop`/`first` y el ritmo pasa al contenedor.
  - `src/lib/profileCardEffects.ts`.
- **Nuevos:** effectBinding.ts, InspectorShell, ObjectList, StyleObjectCard, EffectTile, los pickers y sus tests.

## Fases (cada una se puede shippear y revisar sola)
| Fase | Alcance | Criterio de cierre |
|---|---|---|
| 1. Cimientos | EffectState/bindEffect (card + Music), defaults de rol, matriz capacidad→ruta, una sola fuente de tokens del editor (`editor.css` ↔ `T.ui`, hoy divergen) + test-guardia contra tokens legacy y `rgba(` literales en `src/ui` y los menús | Tests verdes, UI idéntica |
| 2. Shell | InspectorShell acoplado + offset de vista + ObjectList, con las secciones actuales montadas por objeto | Toda capacidad alcanzable; teclado OK |

> Fase 2: el breakpoint del overlay del inspector es **992 px** (no 960): `inspectorW` 320 + el ancho máximo de la card (640, `getFreeformCardBounds`) + 16 px de margen a cada lado. Con 960 la card más ancha quedaría tapada en modo acoplado (`T.ui.breakpoint.inspectorOverlay`, test en `uiTokens.test.ts`).
| 3. Texto | StyleObjectCard por rol, "Todos los textos", pickers visuales y Más ajustes | "Nombre" y "Bio" en ≤4 clics |
| 4. Efectos | EffectTile/TileGroup, acordeón, Activos (N), pausa visible; Foto y Music sobre los mismos tiles | Paridad de capacidades |
| 5. Canvas ↔ inspector | `data-role`, navegación en 2 clics, resolveClickAfterDrag extendido, resaltado del objetivo y eco | Sin regresión de drag ni de 3B.4 |
| 6. Ver y explorar | forcePreview (tag + pausa), style undo + Deshacer, colores recientes | QA de undo y de reduced motion |
| 7. Pulido | Motion, vocabulario, contraste, forced colors, Imagen y Espacio en el shell | Checklist a11y |

## QA requerido
- **En cada fase:** `tsc`, `build`, la suite completa de tests y la matriz.
- **En navegador real:**
  - Los dos recorridos, con conteo de clics.
  - Drag de bloque vs click en una línea.
  - Imagen ghost sobre texto.
  - Encender → pausar → reanudar cada efecto, verificando que los valores vuelven.
  - Deshacer por gesto, en card y en Music, con puntero y con teclado.
  - Hover simulado y reduced motion.
  - Solo teclado, y lector de pantalla en la lista y los tiles.
  - Forced colors.
  - Viewport angosto (overlay).
  - Guardar → recargar.
  - `space_mobile` sin cambios.

## Riesgos
| Riesgo | Mitigación |
|---|---|
| El click en una línea compite con el drag de bloque | resolveClickAfterDrag + regla de 2 clics; fase 5 aislada |
| Que el tile se encienda al tocarlo se perciba invasivo (disenso de CR) | Switch como target separado, eco y Deshacer |
| El undo con spread de keys ausentes resucita valores | Restaurar objetos enteros, con test |
| forcePreview se filtra a la vista pública | Flag solo en el editor, con test |
| Costo de render de 6 placas espécimen | Memo por rol; animan solo en hover |
| Alcance grande | Fases independientes; la fase 1 no cambia nada visible |
