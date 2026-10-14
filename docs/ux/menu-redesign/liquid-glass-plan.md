# MYLAND · Menús "Liquid glass": plan de implementación

> **Estado: EN IMPLEMENTACIÓN (2026-10-14)** en la branch `feature/myland-menus-v4` (desde `main`), con el OK del
> usuario para ejecutar L0–L6 seguidas. **No se mergea a `main` sin OK explícito.** Bitácora en § 4.
>
> **Fuente del diseño:** proyecto de Claude Design "Menús de personalización mejorados"
> (https://claude.ai/design/p/acc23753-1b2c-4fb7-ba8d-fe93672bdcfa?file=Editor.dc.html), importado como project
> archive en `design-import/menus-liquid-glass/`:
> - `Editor.dc.html`: prototipo interactivo, el que se implementa;
> - `menu-schema.js`: inventario de objetos, cards, controles, rangos y defaults;
> - `Menu System.dc.html`: mapa de capacidades;
> - `_ds/myland-design-system-…/`: tokens (`tokens/*.css`), `components/glass.css` y el bundle de componentes
>   (`_ds_bundle.js`);
> - `assets/`: logo y foto de ejemplo; `screenshots/system.jpg`.
>
> Es **referencia, no código a copiar**: el HTML/JS se traduce a los tokens, `editor.css` y componentes de `src/ui`.
>
> **Relación con el plan v3** (`myland-editor-v3-plan.md`): este diseño se monta sobre lo que dejaron las Fases A–I
> (`EditorHost`, rail, dock, selección única, historial global, Layers, inspectores de Texto/Imagen/Music, navegación
> por partes, cuadrícula). **No se rehace la arquitectura:** cambian el lenguaje visual y la forma de los
> inspectores. Siguen vigentes los sistemas protegidos (v3 § 4), los riesgos (v3 § 7) y el flujo por fase (v3 § 9).

---

## 1. Qué trae el diseño

**Lenguaje visual "Liquid glass"**
- Vidrio grafito con tinte ciruela (dark, por defecto) o perla (light): `blur(28px) saturate(190%)`, borde de 0.5px y
  sombra larga. **El vidrio va solo en la capa flotante:** dock, rail, topbar, menús y toasts. Los controles internos
  son "wells" planos.
- **Un solo acento, Rosa** (`#FF4F94`; light `#D42A70`): tiles encendidos, switches, sliders, Publicar, punto de
  modificado y selección en el canvas. Lo seleccionado pero no activo (tabs, part picker, rail) usa el neutro
  `--glass-on`. Foco lila (`#B9A2FF` / `#7C5CFF`).
- **Tipografía:** Geist para la UI (título 19/650, control 14/550, label 13/600, caption 12), Geist Mono para
  números y Bricolage 800 solo para el wordmark. Ya están cargadas en `layout.tsx`.
- **Radios:** 10 ítem de menú, 16 control/campo, 20 tile, 22 popover, 30 panel. Hit targets ≥ 44px.
- **Motion:** springs `(.34,1.56,.64,1)` en lo que se toca, indicadores que se deslizan, swaps direccionales, barrido
  de luz en tiles y tick de valores. Con reduced motion todo es instantáneo; con reduced transparency, fills sólidos.

**Estructura del dock (344px, a 16px de los bordes)**
1. **Cabecera:** ícono del objeto, nombre, ruta en mono (`tarjeta / nombre`), Buscar ajuste (`/` o ⌘K) y Cerrar.
2. **Part picker** (solo en la tarjeta): una fila de chips con los 12 objetos de hoy (Foto, Nombre, @usuario, Frase,
   Ubicación, Bio, Visitas, Links, Logo | Fondo, Efectos, Textos), con miniatura y punto de modificado.
   Reemplaza a la lista de objetos actual.
3. **Cards en acordeón:** cada objeto es una lista de cards. Una card fijada sin cabecera lleva el contenido; el
   resto tiene ícono, título, resumen vivo con muestra de color, punto de modificado, "Restablecer card" y, si
   corresponde, un switch (Estilo del bloque).
4. **Efectos como tiles 2×N:** preview, nombre y estado ("Activado", "Pausado", "Apagado" o su valor). Al tocarlos
   se prenden o apagan, y el chevron abre "Ajustes de X" con su propio Restablecer. "Avanzado" va inline.
5. **Pie para Texto, Imagen y Music:** capa (Fondo/Medio/Frente), ir a Capas, Bloquear y Eliminar.
6. **Toast** con Deshacer en las acciones destructivas.

**Controles nuevos o rediseñados:** LiquidSlider (la cápsula entera es el control, con rubber-band y valor editable),
ColorRibbon (paleta "Tu tarjeta" sacada de los colores de la card), pad 2D de offset de sombra, Peso con muestras
"Aa" por peso cargado, esquinas como 4 opciones visuales, editor de stops de gradiente, campo de upload con
miniatura y drop, y Medidas en grilla.

**Shell:** cápsula de marca arriba a la izquierda (logo, `myLand`, @usuario y punto de estado). Cápsula de acciones
arriba a la derecha (Deshacer, Rehacer, tema y Publicar), que se corre cuando abre el dock. Rail vertical
(Seleccionar, Agregar, Capas, Tu sala). Menú Agregar con Texto, Imagen y Música. Pista inferior "Tocá algo para
editarlo · A agregar · / buscar".

---

## 2. Criterio y decisiones (2026-10-14, del usuario)

**Fidelidad visual alta.** Estructura del dock, tamaños, colores, espaciados, textos y animaciones como en
`Editor.dc.html`. Solo se adapta donde copiarlo rompería una funcionalidad, los datos o la accesibilidad, y cada
adaptación queda anotada acá (§ 2.1). Ninguna capacidad se pierde: lo avanzado va detrás de "Avanzado" o de los
ajustes de cada tile.

**Decisiones ya tomadas:**
- Temas Oscuro, Claro y OG. OG conserva su identidad (selección lima, rail violeta, acento rosa) sobre el vidrio claro.
- Sin contador de cambios sin publicar (v3 § 8).
- Borde de la card: el tile no se apaga; con ancho 0 muestra "Sin borde". No se agrega pausa de borde.
- Los rangos y capacidades del repo mandan cuando difieren de los ejemplos del prototipo.
- Cada fase termina con capturas comparativas (prototipo vs. harness con los componentes reales) y, como no hay login
  en la nube, con una lista de verificaciones pendientes para QA local.

### 2.1 Adaptaciones registradas (dónde no es idéntico y por qué)

| # | Qué | Diseño | Implementado | Motivo |
|---|---|---|---|---|
| A1 | Opacidad del vidrio del dock / rail / topbar | dark .60, light .66 | dark .85, light .86 (= `--glass-fill-strong` del DS), OG .94 | Con .60 el texto secundario baja a 2,4:1 sobre wallpapers claros. El dock queda legible sobre cualquier sala. |
| A2 | Tintas secundarias | ink2 .68 / ink3 .42 (dark), .64 / .42 (light) | ink2 .82 / ink3 .71 (dark), .72 / .64 (light) | ≥ 4,5:1 sobre el vidrio, el well y el well en hover, sobre fondo blanco, negro y gris. |
| A3 | Switch apagado | track `--glass-well-press` sin borde | mismo track + anillo `edge` | El track solo tiene ~1,5:1 (WCAG 1.4.11 pide 3:1). |
| A4 | Íconos Lucide | se bajan de unpkg en runtime | incrustados en `src/ui/icons/lucide.tsx` | Sin red externa en el editor; `corner` sale de Lucide 0.500 porque 0.460 no lo tiene (en el prototipo ese ícono queda vacío). |
| A5 | Rojo de peligro y foco claro | `#D93A31` / `#FF5F57`, foco `#7C5CFF` | `#B02A24` / `#FF8079`, foco claro `#6440F0` | Contraste sobre el vidrio translúcido. |

## 3. Diferencias con el repo (resueltas)

El schema dice que sus rangos "salen del repo", pero hay puntos donde no coinciden o que chocan con decisiones ya
tomadas. **Regla por defecto: manda el repo** (capacidades, rangos, semántica). El diseño manda en lo visual.

| # | Tema | Diseño | Repo / decisión vigente | Propuesta |
|---|---|---|---|---|
| Q1 | Contador de cambios sin publicar | Badge numérico en Publicar | Fuera de alcance (v3 § 8) | **Sin badge**; Publicar mantiene sus estados actuales. El punto de estado (rosa/verde) solo si sale del estado real de publicación. |
| Q2 | Borde de la card como tile on/off | Tile "Borde" con switch | `effectPause` no tiene pausa para borde; regla: sin switch hasta que exista (con test) | Agregar la pausa de borde en `effectPause` (sistema protegido: se documenta) **o** mostrar el tile sin apagado ("Sin borde" con ancho 0). Decide el usuario. |
| Q3 | Atajos de una letra (`A`, `L`, `V`, `/`) | Globales | Guard positivo por foco (`editorGuards.ts`) | Solo con el foco en el canvas o el dock, nunca en campos. `/` y ⌘K abren la búsqueda. |
| Q4 | Temas | Dark y Light (el selector de Tu sala también tiene OG) | Light/Dark/OG (Fase A) | Mantener los 3; OG se reinterpreta con el material nuevo. |
| Q5 | Rangos de Medidas de la card | 220–520 × 300–760 | `MIN_PROFILE_CARD_WIDTH=240`, `MIN_PROFILE_CARD_HEIGHT=220`, máximos de `CARD_FORMATS` | Los del repo. |
| Q6 | Ancho del dock | 344px | 360px (Fase D) | 344px; revisar `inspectorViewOffset` y su test. |
| Q7 | Paleta "Tu tarjeta" | Hasta 5 colores derivados de la card | No existe | Helper puro nuevo en `src/lib` con test; solo lee, no escribe nada. |
| Q8 | Búsqueda de ajustes | Índice de todos los controles del objeto o de la tarjeta | No existe | Se arma desde una lista declarativa por sección que **no genera UI** (respeta "no menús generados desde un schema"). Se testea contra la matriz de `editorCapabilities`. |

---

## 3b. Fases

Cada fase sigue el flujo de v3 § 9: plan corto → revisión → implementación → revisión → correcciones → `npm test`,
`tsc` y `next build` → commit y push → docs. Ninguna toca el render de la card ni el modelo de datos.

**Fase L0: tokens y material**
- Tokens `--glass-*` de `design-import/…/tokens/` dentro de `T.ui`/`T.theme`: una sola fuente, generados por
  `uiCssVars()` y con los tests de paridad y guardia existentes.
- Material glass, acento Rosa, foco lila, radios, alturas y motion.
- Re-medir contraste en los 3 temas.
- Sin cambios de estructura.

**Fase L1: primitivas**
- `src/ui`: LiquidSlider, LiquidSwitch, IconTabs, GlassButton, ColorRibbon con ColorPopover, tiles, upload,
  esquinas, pad de offset, stops, Peso y Medidas.
- Se rediseñan las primitivas existentes (`SliderRow`, `Toggle`, `Tabs`, `ColorRow`, `EffectRow`, `NumberField`…)
  en lugar de duplicarlas; las APIs se mantienen donde se pueda.
- Tests de accesibilidad: roles, teclado, forced colors y reduced motion.

**Fase L2: dock y part picker**
- Cabecera con ruta, part picker en lugar de `ObjectList` y cards en acordeón con resumen, punto de modificado y
  Restablecer.
- Pie de elemento con capa, Capas, Bloquear y Eliminar.
- Toast con Deshacer conectado al historial global.

**Fase L3: inspector de la ProfileCard**
- Los 12 objetos con las cards del schema; los efectos pasan a tiles.
- Matriz de capacidades sin pérdidas, con el test por sección actualizado.

**Fase L4: Texto, Imagen, Music, Tu sala y Capas** con el mismo lenguaje.

**Fase L5: shell**
- Cápsulas de marca y acciones, rail con indicador, menú Agregar y pista inferior.
- Atajos (Q3).
- No se toca `CANVAS_TOP_OFFSET` (R1).

**Fase L6: búsqueda de ajustes** (Q8).

**Fuera de alcance:** el render de la card y del canvas del prototipo (sus estilos de tarjeta son una maqueta, no la
spec del motor), presets, inline editing, Gallery y mobile legacy.

---

## 4. Bitácora de implementación

Retomar desde la última línea. Cada fase: código → `npm test` / `tsc` / `next build` → capturas → commit → push.

- **L0 (tokens y material):** paletas Liquid glass en `src/ui/tokens.ts` (dark/light/og), radios, tamaños, motion,
  `material.blur`; íconos Lucide incrustados; `.mn-panel` con vidrio y blur; tests de contraste reescritos para el
  vidrio translúcido (sobre blanco, negro, gris y la página).
- **L1 (primitivas):** con la misma API para todos los que las usan: `SliderRow` = cápsula líquida (rango nativo
  transparente encima: teclado, aria, tocar para saltar; valor editable con click; rebote en los extremos; botón
  Restablecer del DS); `Toggle` = LiquidSwitch 51×31; `Tabs` pill = IconTabs con thumb que se estira; `EffectList` /
  `EffectRow` = tiles 2×N con ripple, preview y "Ajustes de X" a lo ancho; `ColorRow` = tile de color + hex + chip
  heredado + cinta "Tu tarjeta" (`src/lib/cardPalette.ts`, con test); `TextInput` / `TextArea` con contador adentro;
  `NumberField` = campo de Medidas; `Collapsible` = fila "› Avanzado"; botones redondos y cápsulas.
  - Adaptación A6: el selector de color completo sigue siendo el popover flotante existente (con su teclado y Esc
    probados), no se despliega inline dentro del dock como en el prototipo.
  - Adaptación A7: `FontField` mantiene la lista nativa de fuentes del repo; el explorador del prototipo (buscar,
    favoritas, instalar cualquier Google Font o subir TTF) sería una funcionalidad nueva y queda fuera de alcance.
- **L2 (dock):** cabecera del DS (ícono del objeto, título 19/650, ruta en mono, Buscar y Cerrar como botones
  redondos de 36px); part picker redondo (`ObjectList.tsx`, orden del diseño: Foto primero, separador antes del grupo
  de la tarjeta; miniatura de la foto y muestra del fondo; punto de modificado); secciones = cards en acordeón
  (`MenuSection`: una abierta por parte, resumen vivo con muestra, "Restablecer card", switch en la cabecera para
  Estilo del bloque; card fijada para el contenido); pie de elemento (`ElementFooter`: Fondo/Medio/Frente con el MISMO
  escritor que Capas, Ordenar en Capas, Bloquear, Eliminar); tooltips del DS; cascada al cambiar de parte.
- **L3 (tarjeta, los 12 objetos):** Foto (Imagen fijada con subida/arrastre, Forma, Efectos en tiles); Nombre /
  @usuario / Frase / Ubicación / Bio / Visitas (Contenido fijado en la fuente del rol, Tipografía con Peso en muestras
  "Aa", Color con bloqueo por gradiente, Efectos del texto en tiles + "Sombra, brillo y contorno ›", Estilo del bloque
  con switch); Links (lista, agregar, contador, Íconos); Logo (Imagen, Tamaño y giro, Profundidad); Fondo (Color,
  Imagen o GIF, Superficie en tiles, Forma y medidas); Efectos (Luz, Movimiento, Al pasar el cursor, Retro); Textos
  (Color de todos los textos, Alineación y espaciado, Efectos de todos los textos). Matriz de capacidades: 0 pérdidas
  (las evidencias se actualizaron a los controles nuevos).
  - Adaptación A8: Hover de la tarjeta pasa de una fila con dos switches a dos tiles (Brillo, Escala) — mismas escrituras.
  - Adaptación A9: el texto de @usuario sigue siendo de solo lectura (se cambia desde la cuenta), como en el diseño.
- **L4 (parcial — Texto, Imagen, Music):** las mismas cards del diseño + Medidas en grilla + pie fijo.
