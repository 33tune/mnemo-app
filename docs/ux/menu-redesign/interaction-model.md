# Modelo de interacción — Editor MNEMO

> **ESTADO (2026-10-07):** sigue vigente en flujos, foco, teclado y accesibilidad, salvo donde
> `myland-editor-v3-plan.md` lo cambia (bottom sheet en pantallas angostas, dock de 360px, historial).

## C. Flujos
**Abrir.**
- Card seleccionada + "Editar" (o Enter) abre el inspector acoplado. El foco va al h2 del objeto, y Esc lo devuelve a "Editar".
- El inspector nunca escribe `card.x/y`. Si tapa la card, se compensa solo con un offset de vista.

**Descubrir.**
- La lista de objetos es el **camino primario y garantizado** (teclado, lector de pantalla, objetos tapados por imágenes).
- Es un radiogroup de chips que se recorre con flechas.

**Atajo de canvas (solo navega, nunca edita).**
| Regla | Detalle |
|---|---|
| 2 clics | El primer click selecciona la card, como hoy. Con la card ya seleccionada, un click sobre una línea navega a ese objeto. |
| Granularidad | `data-role` en los div de línea existentes (ProfileCard.tsx ~1296-1322, más location/views/pfp/links/logo), resuelto con `closest("[data-role]")`. Un click en zona del bloque sin `data-role` navega al objeto del bloque. El layout "free" (`startFreeDrag`) queda fuera del atajo y se alcanza solo desde la lista. |
| Links | Con el inspector abierto, un click en un ícono navega al objeto Links y no abre la URL: `ContactLinkIcon` pasa de `preventDefault` cuando `menuOpen` a hacerlo cuando el inspector está abierto. Con el inspector cerrado, el ícono abre la URL como hoy. |
| Drag ≠ click | `resolveClickAfterDrag` (dragClickGuard.ts) extendido a todos los bloques. Un drag nunca navega. |
| Hit-stack | 3B.4 sin cambios. El texto NO se marca como hot y las imágenes ghost siguen sin interceptar. |
| No inline | Sin contentEditable. El contenido se edita en el campo del inspector. |

**Modificar.**
- Los controles visuales aplican en vivo.
- Click en un tile apagado: lo enciende con defaults reales, abre su detalle y hace un eco en la card.
- El switch del tile apaga, y apagar equivale a **pausar** (se conservan los valores).

## D. Divulgación progresiva
| Nivel | Contenido |
|---|---|
| Visible | Espécimen/miniatura, hasta 6 controles primarios visuales y los tiles con su estado |
| Contextual | Detalle del tile en acordeón exclusivo, a ancho completo bajo su fila. Se recuerda por objeto durante la sesión. |
| Más ajustes | Precisión numérica (px/ms/°), offsets y pesos exactos. Un nivel, sin anidar. |

## F. Motion
| Animación | Propósito | Reduced motion |
|---|---|---|
| Resaltado del objetivo en la card mientras se edita un objeto: outline de 1px, blanco .40, offset 2. Se oculta durante el drag de un bloque para no superponerse con `dragOutline`. | Mostrar qué se toca | Contorno estático |
| Eco al encender un efecto (1 pulso de 300ms, ≤3 destellos/s) | Causa → efecto | Sin eco; anuncio por status |
| Simulación de hover (tilt/glow/scale/spotlight) con el detalle abierto + tag "Vista previa" + "Pausar vista previa". El hover real del puntero tiene prioridad sobre `forcePreview`. | Ver efectos invisibles mientras se edita | Frame estático + botón "Ver en acción" (≤5s) |
| Miniaturas de tile | Anticipar el resultado | Animan solo en hover/foco; estáticas con reduced motion (incluido `::after`) |
| Apertura de acordeón y cambio de objeto (≤180ms) | Continuidad espacial | Instantáneo |
| Snackbar de Deshacer | Confirmar acción discreta | Aparece sin slide |

## G. Estados de feedback
| Estado | Cómo se ve |
|---|---|
| Activo | Tile con relleno .11 + anillo inset de 1px .42 (`T.ui.shadow.thumb`) + indicador de forma (no solo color) + switch on |
| Modificado | Punto SVG en área de 24×24 con tooltip. La sección cerrada muestra "N cambios". |
| Heredado | Valor a .50 + "hereda" |
| Deshabilitado | `inert` + nota de causa |
| Pausado | Tile atenuado a opacidad .55, nunca menos (mantiene contraste ≥3:1) + "Pausado · valores" |
| Reset | "Restablecer" por campo o sección (borra la key cruda) + Deshacer |
| Guardado | Indicador global existente. Sin toast por cada cambio. |
| Seleccionado | Chip de objeto con borde de 2px + `aria-checked` |
| Preview | Tag "Vista previa" sobre la card + control de pausa |

## Teclado y foco
- Orden de Tab: header → lista de objetos → secciones. Flechas dentro de los radiogroups (lista, fuentes, pesos, tiles).
- Enter/Space en un tile apagado lo enciende y abre el detalle. El foco **queda en el tile** y el detalle tiene heading.
  - Sobre un tile ya encendido, Enter solo abre o cierra el detalle. Nunca lo apaga: eso lo hace el switch.
- Un click en el canvas no le saca el foco al canvas. El inspector hace scroll al objeto y el status anuncia
  "Editando: X".
- Esc cierra por capas: popover de color → acordeón abierto → inspector (foco a "Editar") → canvas → deselección.
  Es la extensión del Esc por capas de la Iteración 0.
- Ctrl/⌘+Z deshace el estilo, salvo dentro de inputs de texto, donde manda el undo nativo.
- Fin de gesto para el undo:
  - Con puntero, al hacer pointerup.
  - Con flechas sobre un slider, en blur o tras ~500ms sin teclas.
- Al cerrar el popover de color, el foco vuelve al well.

## Guardarraíles a11y
- Tiles con semántica radio/switch y estado seleccionado que no dependa solo del color.
- Tabs/tabpanel APG donde queden tabs.
- `role=status` solo en acciones discretas: encender, quitar, deshacer, restablecer.
- Contraste ≥4.5 en texto y ≥3 en bordes de controles.
- Forced colors: fondo `Canvas` y sin blur.
- Objetivos ≥24×24.
- Ningún gesto oculto como única vía: el doble click de reset tiene un botón equivalente.
