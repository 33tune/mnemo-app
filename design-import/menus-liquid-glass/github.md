repo: 33tune/mnemo-app
branch: main
path: src/components/canvas, src/ui, src/lib

## Last sync
date: 2026-10-14T01:42:59Z

### Updated in this project
- Rediseño de todos los menús de personalización (Liquid glass + sistema de cards)
- Inventario completo de opciones, rangos y campos del repo en `menu-schema.js`
- Mapa de capacidades y especificación de componentes para implementar

## Screen map
| Pantalla | Archivos del repo |
|---|---|
| Editor.dc.html · ProfileCard (Foto, Nombre, @usuario, Frase, Ubicación, Bio, Visitas) | src/components/canvas/ProfileInspector.tsx, ProfileConfigMenu.tsx, ProfileIdentityMenu.tsx, ProfileMetadataMenu.tsx, ProfileTypographyMenu.tsx, RoleTypographyFields.tsx, BlockStyleFields.tsx, src/lib/effectEditorDefaults.ts |
| Editor.dc.html · Links / Logo | src/components/canvas/ProfileContactLinksMenu.tsx, ProfileLogoMenu.tsx, src/lib/contactLinksBlock.ts |
| Editor.dc.html · Fondo / Efectos / Textos de la tarjeta | src/components/canvas/ProfileBackgroundMenu.tsx, ProfileEffectsMenu.tsx, ProfileTypographyMenu.tsx (GlobalTextSection) |
| Editor.dc.html · Texto / Imagen / Music | src/components/canvas/TextInspector.tsx, ImageInspector.tsx, MusicInspector.tsx, ElementInspectorParts.tsx, src/lib/canvasText.ts |
| Editor.dc.html · Capas | src/components/canvas/LayersPanel.tsx |
| Editor.dc.html · Tu sala / Rail | src/components/canvas/RoomInspector.tsx, EditorRail.tsx |
| Menu System.dc.html | todos los anteriores + src/ui/* (MenuSection, SliderRow, ColorRow, EffectRow, Collapsible, InspectorShell) |
