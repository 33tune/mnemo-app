# MYLAND · Menús "Liquid glass": plan de implementación

> **Estado: L0–L6 IMPLEMENTADAS (2026-10-14)** en la branch `feature/myland-menus-v4` (desde `main`), con el OK del
> usuario para ejecutar L0–L6 seguidas. **No mergeada a `main`; no se mergea sin OK explícito.** Bitácora en § 4;
> lo que falta verificar en navegador real (con login) en § 5.
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
- **L4 (Texto, Imagen, Music, Tu sala, Capas):** cards del diseño (todas cerradas al abrir, una abierta por vez),
  Medidas en grilla dentro de su card, pie fijo; Capas con grupos Frente/Medio/Fondo y su conteo, filas de 56px con
  candado, card de selección (capa + Al frente/Subir/Bajar/Al fondo); Tu sala con Fondo, Ambiente (subidas con los
  selectores existentes), Lienzo y Apariencia del editor (Claro/Oscuro/OG con ícono).
  - Adaptación A10: el selector de capa del pie y de Capas son botones conmutables (aria-pressed), no un radiogroup con
    flechas (revisión E-M1: cada flecha escribiría y dejaría un paso de deshacer). Se ven igual que el IconTabs del DS.
  - Adaptación A11: los campos de texto conservan la línea inferior de 1px en gris de borde (WCAG 1.4.11, revisiones
    previas); el diseño no la tiene.
  - Adaptación A12: el texto de ayuda del ajuste a la cuadrícula conserva la redacción revisada en la Fase I
    ("Mientras arrastrás, mantené Mayús…").
- **L5 (shell):** la topbar ancha deja de ser una barra: dos cápsulas de vidrio flotantes (`Topbar.tsx`). Izquierda,
  la marca (logo, "myLand", la ruta `@usuario / my land`, punto de estado: acento = hay cambios para publicar, verde =
  todo publicado; un punto, nunca un conteo). Derecha, Deshacer, Rehacer, tema del editor (alterna Oscuro → OG →
  Claro…; Tu sala › Apariencia sigue igual), Vista previa, "Más" y Publicar (pastilla de acento del DS); se corre a la
  izquierda con el spring mientras el dock está abierto (`right = 16 + ancho ocupado por el dock`). Rail = cápsula
  vertical centrada a la izquierda con indicador que se desliza y tooltips a la derecha (`railW` = 16 + 56 = 72). Dock
  a 16px del borde superior (en el layout angosto sigue debajo de la barra compacta). Menú Agregar del DS (280px,
  ítems de 60px con pozo de ícono y bajada). Pastilla inferior "Tocá algo para editarlo · A agregar" cuando no hay nada
  seleccionado (solo visual; la ayuda de teclado del lienzo sigue en `aria-describedby`).
  - Adaptación A13: MY LAND / SOCIAL, Señales y Salir no tienen lugar en las cápsulas del diseño: pasan al menú "Más"
    de la cápsula de acciones (el mismo patrón de divulgación que la barra compacta, revisada en la Fase D). El punto
    del botón "Más" avisa chats o señales sin leer. No se pierde ninguna función.
  - Adaptación A14: el botón de tema alterna los TRES temas (el diseño alterna dos); Vista previa se agrega como botón
    redondo (el diseño no la muestra y el repo la tiene).
  - Adaptación A15: el ítem del menú Agregar se llama "Music" (vocabulario del producto), no "Música"; "Card de
    presentación" sigue apareciendo solo si la tarjeta no existe.
  - Verificación: capturas lado a lado contra el prototipo (vacío, Agregar abierto, dock abierto, Claro, OG).
- **L6 (Buscar ajuste):** botón Buscar en la cabecera del dock, `/` y ⌘K / Ctrl+K (en el dock, o en el lienzo
  con un inspector abierto; `/` escrito dentro de un campo es una barra). El campo reemplaza la fila del título (el
  h2 queda en el DOM, oculto: F6, Editar y el nombre del tabpanel lo siguen usando) y el cuerpo lista los ajustes
  (pozo de ícono, control · tile, "Objeto › Card"); Enter toma el primero, ↓/↑ recorren, Esc cierra la búsqueda y
  después el inspector. Al elegir uno: cambia de parte si hace falta, abre su card (`RevealContext` en
  `MenuSection`), abre el "Ajustes de X" del tile o "Más ajustes" si el control está ahí adentro, lo centra, lo hace
  destellar (DS `ml-flash`) y le pasa el foco. En la tarjeta busca en las 12 partes; en Texto / Imagen / Music / Tu
  sala, en ese objeto.
  - El índice (`src/lib/settingsIndex.ts`) NO genera UI: es una lista objeto › card › control con los textos
    visibles, extraída del dock renderizado (harness) y atada al código por `settingsIndex.test.ts` (si un control se
    renombra o se mueve, el test falla). Los controles de tiles que en la extracción estaban apagados no tienen sus
    sub-ajustes indexados (se encuentra el tile).
  - Adaptación A16: la pista inferior no dice "/ buscar": sin nada seleccionado no hay dock donde buscar (el
    prototipo tampoco hace nada ahí). Tu sala también tiene búsqueda (el prototipo solo en objetos).
- **No implementado:** el toast con Deshacer del DS (L2). Deshacer sigue en la cápsula de acciones y con ⌘Z/Ctrl+Z.

- **Selector de partes por grupos (decisión del usuario, 2026-10-14):** la fila única del diseño escondía 5 de las 12
  partes fuera del dock (Fondo, Efectos y Textos incluidas) y los íconos solos no decían qué eran. Ahora: un control
  segmentado **Tarjeta / Perfil / Contenido** y, debajo, las partes de ese grupo con su nombre siempre visible
  (Tarjeta: Fondo, Efectos, Textos · Perfil: Foto, Nombre, @usuario, Frase, Ubicación, Bio · Contenido: Links, Logo,
  Visitas). Elegir un grupo abre la última parte usada en él (si no, la primera), así el grupo es siempre el de la
  parte activa. Las flechas recorren las partes del grupo. `PART_GROUPS` en `inspectorObjects.ts`.
  - Adaptación A17: el diseño tenía una sola fila de partes con separador; se reemplazó por grupos.

- **Efectos por texto (decisión del usuario, 2026-10-14):** Sombra, Brillo, Pulso (nuevo: el brillo "respira"),
  Contorno y Desenfoque pasan a cada texto, en su card "Efectos del texto", junto a Gradiente, Shimmer y Rebote (antes
  "Por letra"). "Textos" de la tarjeta queda con Color de todos los textos y Alineación y espaciado. Se quitó el atajo
  "Sombra, brillo y contorno › Todos los textos".
  - Datos: `RoleTextEffect` suma `shadow`, `glow` (con `animation` = Pulso), `stroke` y `blur`. `card.effects.text`
    queda como dato heredado: cada texto usa su valor propio y si no tiene, el de la tarjeta
    (`mergeRoleTextEffects`), así ninguna tarjeta existente cambia de aspecto. La primera edición de un efecto de
    texto reparte los valores de la tarjeta en los 6 textos y los saca de la tarjeta, en la misma escritura y sin
    cambio visual (`splitCardTextEffects`, con test de render idéntico).
  - Render: el Pulso anima una propiedad registrada (`--mnemo-text-glow`) que multiplica el alfa del brillo; la
    sombra y el contorno no se mueven. Verificado en Chromium (el alfa va de 0,85 a 0,28 y vuelve). Con movimiento
    reducido queda quieto.
  - Matriz de capacidades: los `text.*` de la tarjeta pasan a "superseded" por las rutas de cada texto.

- **Temas Lima oscuro y Lima claro (decisión del usuario, 2026-10-14):** dos temas nuevos, además de Oscuro, Claro y
  OG: paneles grafito / niebla neutros (sin tinte violeta), verde lima como acento y un vidrio un poco más translúcido
  (blur 30, saturación 150 %, para que la sala no tiña el panel). El desenfoque pasó a ser un valor por tema
  (`materialBlur`). Se agregó `accentText` (el acento como glifo sobre el panel). Tu sala › Apariencia pasó de un
  segmentado a una grilla de 5 muestras (radiogroup con flechas). El botón de tema de la cápsula recorre los 5.
  - Contraste: la maqueta proponía 70 % / 74 % de opacidad; para que el texto llegue a 4,5:1 sobre salas blancas o
    negras quedó en 78 % (Lima oscuro) y 80 % (Lima claro), con tintas y bordes ajustados. En Lima claro el lima
    brillante es solo relleno (con texto negro); las marcas sobre el panel usan un verde oscuro (#446A00). El test de
    contraste pasó a medir las marcas reales (relleno del slider, punto de cambios, glifo, switch encendido).

- **Botones con link estilo Linktree (decisión del usuario, 2026-10-14):** parte nueva **Botones** en Contenido (los
  íconos de redes pasan a llamarse "Íconos"). Hasta 8 botones `{texto, link}` en `card.linkButtons` con un estilo
  compartido en `card.linkButtonStyle`: Forma (Recta / Suave / Píldora), Relleno (Sólido / Contorno / Vidrio), color
  del botón y del texto, fuente, tamaño (11–20 px), ícono de la red (sale del link), ancho (Completo / Ajustado),
  separación y Al pasar el cursor (Elevar / Brillo / Invertir). La lista se reordena arrastrando el grip o con ↑ ↓.
  - Motor: 7.º bloque de `computeBlockLayout`, el de menor prioridad, **no estructural** (como los íconos, la tarjeta
    nunca crece sola: Stage 4.2-C.2.6). Si no entra, no se dibuja y el inspector lo dice, con "Agrandar la tarjeta
    para que entren": una edición explícita, con deshacer, que agrega exactamente lo que falta. Agregar un botón
    que no entra agranda la tarjeta en la misma escritura. Sin mover, los íconos se apilan justo arriba de los
    botones (identidad → íconos → botones). Los botones se arrastran como bloque.
  - Seguridad del editor: cada `<a>` lleva `draggable={false}` y el click que cierra un arrastre no navega
    (`resolveClickAfterDrag`); con el inspector abierto no navegan.
  - **Preparado para mobile:** `src/lib/linkButtons.ts` (puro: defaults, tamaño, estilo resuelto, CSS) y
    `LinkButtonsBlock.tsx` (no sabe nada del lienzo ni del motor) son lo único que necesita el render de celular;
    `MobilePublicCanvas.tsx` / `space_mobile` no se tocaron (regla de mobile legacy). En celular, hoy, los botones
    no se ven.
  - Sin dato = sin bloque: ninguna tarjeta existente cambia. `fontWeight` existe en el tipo sin control (600).

- **Motor de la tarjeta reescrito (pedido del usuario, 2026-10-15).** La auditoría (450 configuraciones × alturas)
  encontró que el motor viejo elegía entre 5 distribuciones por puntaje y el puntaje cambiaba con el tamaño. Al
  redimensionar: el espacio entre líneas crecía con el alto (hasta 30 px), la distribución saltaba, se escondían
  textos o botones al AGRANDAR, las filas se comprimían a la mitad, y los íconos y botones quedaban pegados al
  borde de abajo. Cambios (`cardComposition.ts`, `profileCardLayout.ts`, `textMeasure.ts`):
  - **Dos formas:** foto arriba o abajo de los textos, o foto al costado. La elige dónde está la foto (al costado →
    al lado; si no → arriba o abajo). La otra forma solo se usa si un texto no entra a lo ancho. **Nunca cambia por
    la altura**, así que redimensionar en vertical no hace saltar nada.
  - **El grupo entero se ancla:** foto, textos, íconos y botones se mueven juntos según la posición de la foto
    (centrada = todo centrado). Arrastrar la foto mueve el grupo 1:1.
  - **Espacios fijos:** 10 px entre filas, foto→textos según el tamaño de la foto, 14 px antes de los íconos y de
    los botones. Ninguno depende del tamaño de la tarjeta.
  - **Íconos y botones debajo del texto** (si no los arrastraste). Si los arrastrás quedan donde los dejaste. Si
    arrastrás la ubicación o las visitas, el resto del texto se cierra.
  - **Alineación** (izquierda / centro / derecha) alinea también la foto y los íconos, no solo las filas.
  - **Nunca se comprime una fila.**
  - **Tope de achique (decisión del usuario):** la tarjeta no se puede achicar más que su contenido. El borde se
    frena ahí (arrastre, Ctrl/⌘+flechas y Medidas usan el mismo tope). Para achicar más hay que sacar contenido.
    Agregar contenido agranda la tarjeta sola, en el mismo paso de deshacer. Sacar contenido no la achica.
    Una tarjeta guardada más chica que su contenido se dibuja en su mínimo (también en el perfil público) y el
    editor lo guarda.
  - **Medición real del texto:** el ancho de cada texto se mide con la fuente elegida y la bio cuenta sus líneas
    reales (palabras y saltos de línea). Antes se estimaba con un ancho promedio que ignoraba la fuente.
  - **Interlineados alineados:** la bio reserva 1,6 (antes 1,5 y se cortaba la última línea); las fuentes mono
    tienen interlineado 1,4 explícito.
  - Se quitaron "Agrandar la tarjeta para que entren" y el crecimiento por botón (ya no hacen falta).
  - Pendiente / no hecho: el Logo sigue siendo un elemento libre que no participa del motor (puede quedar encima
    del texto si lo ponés ahí). `space_mobile` no guarda el tamaño nuevo (regla de mobile legacy).

- **Motor libre de la tarjeta (decisiones del usuario, 2026-10-15) — reemplaza al motor de "dos formas" de arriba.**
  El usuario compone; el motor solo actúa ante un choque real (`src/lib/cardSolver.ts`,
  `src/lib/profileCardLayout.ts`, `ProfileCard.tsx`):
  - Cada bloque (foto, texto = nombre + @usuario + frase + bio, ubicación, visitas, íconos, botones) tiene una
    posición **deseada** (la que dejó el usuario, anclas normalizadas) y una **resuelta**, calculada siempre desde
    cero (sin acumulación ni recálculos en cadena).
  - **Sin choque, nada se mueve.** Con choque, se corre lo que molesta al lugar libre más cercano, en cadena, por
    prioridad: la **foto es el núcleo** (nunca la mueve otro bloque), después el bloque arrastrado, después el
    resto. Lo que estaba apilado justo debajo de un bloque empujado lo acompaña (se conserva el orden).
  - Los bloques elásticos se angostan para entrar al lado de algo: los textos toman **más líneas** (todos los
    textos envuelven, nada se corta con "…"), los íconos pasan a otra fila, los botones se angostan (mínimo 112 px).
  - Mientras arrastrás: el bloque sigue al mouse 1:1 (el arrastre arranca a los 4 px, un click no mueve nada),
    imán con guías (bordes y centro de la tarjeta y de los otros bloques), continuidad entre cuadros, preferencia
    por el sentido del empuje y, si no hay lugar, la **tarjeta crece hacia abajo** en vez de mandar un bloque lejos.
    Todo es reversible dentro del arrastre. **Al soltar** se guardan las posiciones de todos los bloques (un solo
    paso de deshacer, `blockLayout: 2`, `blockWidths` para un bloque que quedó angosto).
  - **Tope de achique:** la medida mínima donde los bloques, en el orden de tu composición, quedan pegados sin
    superponerse (compactación vertical). Ahí el borde se frena; nunca desaparece nada.
  - Tarjetas sin posiciones guardadas: disposición inicial apilada y centrada; una tarjeta posicionada con el motor
    anterior conserva esas posiciones. Los botones siguen el ancho de la tarjeta.
  - Pendiente: el Logo sigue siendo un elemento libre fuera del motor (puede quedar encima de algo). En un caso
    extremo (foto arrastrada en diagonal por el medio de una tarjeta llena, al alto máximo de 636 px) los botones
    se acomodan al costado. Sin QA en navegador real con login.
- **Palabras largas (bug del usuario, 2026-10-15):** el ancho mínimo de un texto era su palabra más larga; una
  palabra sin espacios (o emotes pegados) dejaba el bloque más ancho que la tarjeta y trababa el achique en ese
  ancho. Ahora `makeRow` parte las palabras que no entran entre caracteres (grafemas: un emoji compuesto nunca se
  corta), igual que el render (`overflow-wrap: anywhere`); el mínimo es el carácter más ancho.

## 5. Verificaciones pendientes (QA en navegador real, con login)

Todo se verificó con tests (`npm test` 630/630), `tsc`, `next build` y capturas del harness de Chromium (los
inspectores y el shell montados con datos de prueba, sin backend). **No se probó la app real con sesión iniciada.**
Hay que probar en local:

1. **Shell:** cápsulas sobre wallpaper claro y oscuro; la de acciones se corre al abrir y cerrar el dock (y con el
   dock colapsado); "Más" (MY LAND / SOCIAL, Señales, Salir, punto de no leídos, Esc); tema Oscuro → OG → Claro;
   Publicar en sus 4 estados; punto de estado; logo real en la cápsula de marca.
2. **Rail:** indicador deslizante con V / A / L y Tu sala; tooltips a la derecha; menú Agregar (Texto, Imagen, Music,
   Card de presentación sin tarjeta), Esc devuelve el foco a "+"; pista inferior solo sin selección.
3. **Dock:** a 16px del borde superior; vista centrada entre el rail (72) y el dock; layout angosto (barra compacta
   + hoja inferior) sin cambios.
4. **Inspectores (L2–L4):** los 12 objetos de la tarjeta, Texto, Imagen / GIF, Music, Tu sala y Capas — cada card,
   resumen vivo, restablecer, switches, tiles con "Ajustes de X", slider líquido (arrastre, teclado, click en el
   valor para escribir, doble click restablece), cinta "Tu tarjeta", subidas por click y arrastre, Peso con pesos
   cargados, pie de elemento (capa con el mismo escritor que Capas, Bloquear, Eliminar con deshacer).
5. **Efectos por texto:** Sombra/Brillo/Pulso/Contorno/Desenfoque en cada texto; una tarjeta vieja con efectos
   en "Todos los textos" se ve igual y, al editar un texto, los demás conservan su efecto; Pulso con Rebote en el
   Nombre; deshacer.
6. **Búsqueda:** `/`, ⌘K y Ctrl+K desde el lienzo y desde el dock; ir a un ajuste de otra parte; tiles y "Más
   ajustes"; destello y foco; lector de pantalla (conteo anunciado, nombre del h2).
7. **Temas y accesibilidad:** Light / Dark / OG / Lima oscuro / Lima claro; forced colors (Windows Alto contraste); reduced motion y reduced
   transparency; NVDA / VoiceOver en switches, tiles, part picker y acordeón.
8. **Sin regresiones:** drag, resize, rotate, marquee, papelera, hit-stack, edición de texto libre, deshacer /
   rehacer global, guardar y recargar, perfil público y `space_mobile` sin cambios.
9. **Botones:** agregar, editar, quitar y reordenar (grip y ↑ ↓); cada Forma, Relleno y hover; fuente y tamaño;
   tarjeta corta → aviso y "Agrandar"; arrastrar el bloque sin navegar; en el perfil público abren el link en una
   pestaña nueva; guardar y recargar; `space_mobile` sin cambios (ahí todavía no aparecen).
10. **Motor de la tarjeta:** redimensionar en alto y ancho con foto arriba / al costado / abajo: el espacio entre
    líneas no cambia, nada desaparece ni salta, el borde se frena en el mínimo; agregar texto o botones agranda la
    tarjeta y Ctrl+Z lo deshace junto; arrastrar la foto mueve el grupo 1:1; arrastrar ubicación, íconos y botones;
    fuentes anchas (Syne, etc.) sin "…"; tarjetas viejas y perfil público.
11. **Motor libre:** arrastrar la foto por encima del texto y a las 4 esquinas; arrastrar el texto, los íconos y
    los botones a cualquier lugar y encima de la foto; un click no mueve nada; achicar la tarjeta hasta el tope
    (bloques pegados, nada desaparece); textos largos en tarjetas angostas; guardar, recargar, deshacer y rehacer;
    perfil público igual al editor.
12. **Palabras largas:** una bio, un @usuario, un nombre o una ubicación sin espacios (letras o emotes pegados)
    en una tarjeta angosta: se parten en renglones dentro de la tarjeta; después de estirarla se puede volver a
    achicar.
