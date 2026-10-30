# Crews (v1 2026-10-29 · v2 2026-10-30 · v3 2026-10-31)

Grupos con su propia sala, pensados para quien reúne gente (un influencer, el que arma la juntada del
Discord): un **canal de difusión** con avisos de 24 horas. Borrable sin romper nada (ver abajo).

## Qué es (v3)
- **Abiertos:** miembros infinitos, crews infinitos por persona (fundar: hasta 10). Se entra con el link de
  invitación, que se puede compartir donde sea.
- **Roles:** **Fundador** (quien lo creó, #01) y **Admins** (los nombra o saca solo el fundador). Fundador y admins
  editan la sala, publican avisos, manejan la invitación y sacan o **bloquean** (un admin no toca a otro admin ni
  al fundador). Sacar = puede volver con el link; bloquear = no vuelve (se puede desbloquear).
- **Barra izquierda del editor:** el botón Crews abre la lista ("Tus crews": tocar uno despliega su sala; estrella =
  fijar/quitar de la barra; crear con solo el nombre; unirse pegando el link). Debajo de las herramientas, los
  **emblemas de hasta 10 crews fijados**: tocar uno despliega la sala (ventana de vidrio). Al crear o unirse, el
  crew se fija solo si hay lugar.
- **Sala** (`/c/<slug>` y a pantalla completa en el editor):
  - arriba: emblema, nombre (fuente principal), descripción (fuente secundaria), tag, miembros y fecha de fundación,
    música y links (Discord + hasta 6 links fijos);
  - pestañas **Sala** (avisos + los primeros miembros) y **Miembros** (todos, por llegada o por rol, buscador, de a 30;
    para fundador y admins: hacer admin / sacar / bloquear desde "···", y la lista de bloqueados);
  - acciones arriba a la derecha según el rol: Invitación (copiar / renovar), Editar, Fijar en tu barra, Salir.
- **Avisos:** los publican fundador y admins; texto de hasta 280 caracteres (los saltos de línea cuentan) y 6
  renglones, link opcional, **Público** o **Solo miembros**; hasta 10 activos por crew; ordenados por hora con "hace
  5 h"; **duran 24 h** (se borran solos cada hora, `pg_cron` `crew-posts-gc`).
- **Notificaciones:** los avisos nuevos de los crews **fijados** aparecen en el dashboard (abajo a la izquierda,
  `CrewInbox`) con "Marcar como leído", la X y "Ver sala"; el emblema de la barra muestra un punto.
- **Editar la sala** (fundador y admins): se despliega la sala y a la derecha el menú (`CrewEditPanel`) que edita en
  vivo: Identidad (nombre, descripción, **tag**, emblema, color), Fuentes (principal y secundaria), Sala (fondo,
  imagen/GIF, música), Links. Borrar crew: solo el fundador.
- **Tag:** 2 a 4 letras o números, único en myLand. En la card (Contenido › Crew) se elige **Chip** (emblema, nombre y
  número) o **Tag** (solo el tag, en el color y la fuente del crew); los dos son bloques del motor de la card y se
  arrastran. El tag también se ve en la sala y junto a cada miembro.
- **El chip se va solo:** si el crew se borra o el dueño de la card deja de ser miembro, el editor saca el chip de la
  card (no es paso de deshacer) y el perfil público no lo dibuja ni le guarda lugar.

## Dónde está
- Base: `supabase/migrations/20261029000000_crews.sql` + `20261031000000_crews_v3.sql` (roles, bloqueos, avisos,
  leídos, fijados, tag, fuente secundaria, links; funciones `crew_*`; toda escritura pasa por ellas). Las tablas
  `crew_bans`, `crew_posts`, `crew_post_reads` no tienen policies: se leen por `crew_house` / `crew_inbox`, que
  aplican "público o miembro" y "no vencido". `crews.notice` y `crew_members.featured/badge_*` son de versiones viejas.
- Código: `src/features/crews/` (`CrewsHub` = estado del editor, barra y notificaciones; `CrewsPanel`;
  `CrewHouseView` = la sala; `CrewHouseOverlay`; `CrewEditPanel`; `CrewRoomPage`; `CrewPactView`; `CrewChipView`) y
  las rutas `src/app/c/[slug]`, `src/app/c/[slug]/unirme`, `src/app/crews` (redirige a `/dashboard?crews`).
- Fuera de esa carpeta: motor de la card (`src/lib/crewChip.ts`, `cardSolver.ts`, `profileCardLayout.ts`,
  `ProfileCard.tsx`, tipos `CrewChip` / `crew` en `src/types/index.ts`), la parte Crew (`ProfileCrewMenu.tsx`,
  `inspectorObjects.ts`, `partNavigation.ts`, `ObjectList.tsx`, `ProfileConfigMenu.tsx`, `settingsIndex.ts`,
  `editorCapabilities.ts`), el editor (`EditorRail.tsx`, `EditorHost.tsx`, `editorSelection.ts`, `CanvasBoard.tsx`),
  `ColorPopover.tsx` (`data-popover-z`), `siteAuth.ts`, `SetupScreen.tsx`, `handles.ts`, `runStorageCleanup.ts`.

## Cómo borrarlo
1. Base: `supabase/rollback/crews_v3_down.sql` y después `supabase/rollback/crews_down.sql`.
2. Código: borrar `src/features/crews/`, `src/app/crews/`, `src/app/c/`, `src/lib/crewChip.ts`,
   `ProfileCrewMenu.tsx`, y sacar las líneas de crew de los archivos de arriba. Sacar
   `src/features/crews/crewLook.test.ts` de `package.json`.
3. Las cards que mostraban el chip guardan `card.crew`: sin el bloque en el motor se ignora.
4. `npm test`, `tsc`, `next build`.
