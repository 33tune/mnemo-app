# Crews (2026-10-29, v2 2026-10-30)

Círculos cerrados con su propia sala. Pedido del usuario: retención por pertenencia
("mostrar que pertenecen a algo"), simple, borrable sin romper nada.

## Qué es
- **Botón CREWS en la barra izquierda del editor** (entre Capas y Tu sala): abre el panel Crews en el
  dock, con el mismo diseño y tema del editor.
  - Sin crews: **Crear crew** (solo el nombre, hasta 24 letras/números/espacios; el link es el mismo
    nombre: "Los Búhos" → `myland.lol/c/los-buhos`, se ve mientras escribís) o **Unirme** pegando el link
    de invitación. Renombrar el crew después no cambia el link (las invitaciones no se rompen).
  - Con crews: la lista (emblema, nombre, `#01 · fundador · 2/30 · dueño`). Cada crew abre su página:
    vista previa, **Visitar** (la sala a pantalla completa ENCIMA del editor; Esc o Cerrar vuelve) y
    **Pestaña nueva** (`/c/<slug>`).
  - El dueño ve accesos directos: **Editar la sala**, **Miembros** (buscador por nombre o @, sacar) e
    **Invitación** (copiar / renovar link). Los demás ven "Irme del crew".
  - **Editar la sala** (solo el dueño): la sala se despliega a pantalla completa como una ventana de
    vidrio que nace del botón (se desempaña al abrirse; al cerrar se pliega) y después aparece a la
    derecha el menú (`CrewEditPanel.tsx`): Identidad (nombre, lema, emblema, color, fuente), Sala (fondo,
    imagen o GIF, música), Aviso y Discord, y Borrar crew. Cada cambio se ve en la sala al instante y se
    guarda solo; "Listo" cierra el menú y deja la sala. También se entra con "Editar crew" dentro de la
    sala, o desde `/c/<slug>` (lleva a `/dashboard?crews=<id>&edit`). Sin animación con "reducir
    movimiento".
- **Sala** `myland.lol/c/<slug>`: emblema, nombre (fuente y color del crew), lema, "Fundado el …",
  miembros (máx. 30), aviso, música, Discord, y la grilla de **mini-cards** de los miembros (número
  `#07`; FUNDADOR solo el #01, el que lo creó). El fondo funciona igual que el de la sala de myLand:
  la imagen a su tamaño, repetida, y los GIF animados.
- **El Pacto** `myland.lol/c/<slug>/unirme?k=<código>`: botón **UNIRME**. Sin cuenta: crea la cuenta y
  vuelve (login/registro con `?next=`, y `/setup` vuelve al pacto vía `localStorage.mnemo_pending_pact`).
  Funciona también en el celular.
- **Chip en la card = un bloque más del motor de la card** (Contenido › Crew): "Mostrar en la card",
  cuál crew (si tenés varios) y Tamaño (60–200 %). Se arrastra sobre la card como los botones y se
  guarda con la card (`card.crew`, `crewAnchorX/Y`): necesita **Publicar**. Al aparecer en una card
  ya armada va debajo del nombre. En el perfil público se verifica que el dueño siga en el crew
  (si no, no se ve), muestra el aspecto actual del crew, y tocarlo abre la sala encima del perfil.
- Límites: 30 miembros por crew, 3 crews por persona, nombre 40, lema 120, aviso 280.
- `/crews` (la página de la v1) redirige a `/dashboard?crews` (abre el panel).

## Dónde está
- Base: `supabase/migrations/20261029000000_crews.sql` (aplicada 2026-10-29). Tablas `crews`,
  `crew_members`, `crew_invites` (el código nunca es público) y funciones `crew_*` (toda escritura
  pasa por ellas y verifica quién llama; las tablas solo se leen). La limpieza diaria
  (`storage_gc_candidates` y `runStorageCleanup.ts`) cuenta los archivos de los crews como usados.
  `crew_feature` / `crew_set_badge` / `crew_badge_of` y las columnas `featured` / `badge_*` son de la
  v1: el código ya no las usa.
- Código: `src/features/crews/` (panel, sala, pacto, chip) + rutas `src/app/crews` (redirección),
  `src/app/c/[slug]`, `src/app/c/[slug]/unirme`.
- Fuera de esa carpeta:
  - motor de la card: `src/lib/crewChip.ts` (tamaño del chip), `cardSolver.ts` (BlockKey "crew"),
    `profileCardLayout.ts` (spec, anclas, orden), `ProfileCard.tsx` (bloque `rects.crew`),
    tipos `CrewChip` y `crew` / `crewAnchorX/Y` en `src/types/index.ts`;
  - parte Crew del inspector: `ProfileCrewMenu.tsx`, `inspectorObjects.ts`, `partNavigation.ts`,
    `ObjectList.tsx`, `ProfileConfigMenu.tsx`, `settingsIndex.ts`, `editorCapabilities.ts`;
  - panel: `EditorRail.tsx`, `EditorHost.tsx`, `editorSelection.ts` (kind "crews"), `CanvasBoard.tsx`;
  - `siteAuth.ts` (`?next=`), `SetupScreen.tsx` (volver al pacto), `handles.ts` ("crews" reservado),
    `runStorageCleanup.ts`, ícono "crew" en `src/ui/icons/lucide.tsx`.

## Cómo borrarlo
1. Base: correr `supabase/rollback/crews_down.sql`.
2. Código: borrar `src/features/crews/`, `src/app/crews/`, `src/app/c/`, `src/lib/crewChip.ts`,
   `ProfileCrewMenu.tsx`, y sacar las líneas de crew de los archivos de la lista de arriba. Sacar
   `src/features/crews/crewLook.test.ts` de `package.json`.
3. Las cards que mostraban el chip guardan `card.crew`: sin el bloque en el motor, el campo se ignora
   (o se borra con un SQL sobre `canvases.data`).
4. `npm test`, `tsc`, `next build`.
