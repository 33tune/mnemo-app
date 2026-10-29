# Crews (2026-10-29)

Círculos cerrados con su propia casa pública. Pedido del usuario: retención por pertenencia
("mostrar que pertenecen a algo"), simple, borrable sin romper nada.

## Qué es
- **Casa** `myland.lol/c/<slug>`: emblema, nombre (fuente y color del crew), lema, "Fundado el …",
  miembros (máx. 30), aviso del dueño, música (botón Escuchar), Discord, fondo (color o imagen) y la
  grilla de **mini-cards** de los miembros (foto, nombre con su fuente y color, @, fondo de su card,
  número `#07`, marca FUNDADOR para los primeros 10). Tocar una mini-card abre el perfil.
  Visible para cualquiera con el link. Sin buscador ni lista pública de crews.
- **El Pacto** `myland.lol/c/<slug>/unirme?k=<código>`: pantalla oscura con emblema, nombre, lema,
  música y el botón **UNIRME**. Sin cuenta: crea la cuenta y vuelve (login/registro con `?next=`,
  y `/setup` vuelve al pacto vía `localStorage.mnemo_pending_pact`).
- **Editor** `myland.lol/crews` (también desde el celular; acceso en el menú "Más" del editor y en la
  pantalla del celular): tus crews (destacar en tu card, tamaño del chip, irte), crear (nombre + link),
  y solo para el dueño: nombre, lema, emblema, color, fuente, fondo, imagen de fondo, música (MP3),
  aviso, Discord, link de invitación (copiar / renovar), miembros (sacar) y borrar el crew.
- **Chip en la card**: el crew destacado aparece en la card del miembro con el emblema, el nombre y
  su número, en el color y la fuente del crew. En el perfil público es un link a la casa; en el
  editor, con la card seleccionada, se arrastra. Su lugar y tamaño se guardan en `crew_members`
  (`badge_x/y/size`), **nunca en los datos de la card**: una card sin crew destacado no cambia nada.
- Límites: 30 miembros por crew, 3 crews por persona, nombre 40, lema 120, aviso 280.

## Dónde está
- Base: `supabase/migrations/20261029000000_crews.sql` (aplicada 2026-10-29). Tablas `crews`,
  `crew_members`, `crew_invites` (el código nunca es público) y funciones `crew_*` (toda escritura
  pasa por ellas y verifica quién llama; las tablas solo se leen). La limpieza diaria
  (`storage_gc_candidates` y `runStorageCleanup.ts`) cuenta los archivos de los crews como usados.
- Código: `src/features/crews/` (todo) + rutas `src/app/crews`, `src/app/c/[slug]`,
  `src/app/c/[slug]/unirme`.
- Toques mínimos fuera de esa carpeta: `ProfileCard.tsx` (monta `<CrewBadge>`), `Topbar.tsx`
  (ítem "Crews" en "Más"), `MobileClaimed.tsx` (link "Mis crews"), `siteAuth.ts` (`?next=`),
  `SetupScreen.tsx` (volver al pacto), `handles.ts` ("crews" reservado),
  `runStorageCleanup.ts` (archivos de crews).

## Cómo borrarlo
1. Base: correr `supabase/rollback/crews_down.sql`.
2. Código: borrar `src/features/crews/`, `src/app/crews/`, `src/app/c/`, y sacar las líneas marcadas
   "Crews" en los archivos de la lista de arriba (cada una está comentada). Sacar
   `src/features/crews/crewLook.test.ts` de `package.json`.
3. `npm test`, `tsc`, `next build`.
Las cards no guardan nada de crews: no hay datos que migrar.
