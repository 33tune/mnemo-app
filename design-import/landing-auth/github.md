repo: 33tune/mnemo-app
branch: main
path: src

## Last sync
date: 2026-10-16T21:09:05Z
commit: 9747c88a9bef

### Updated in this project
- Landing v6: the hero menu copies the app's inspector (header plus accordion cards from src/ui/MenuSection.tsx and editor.css .mn-card)
- "Interletrado" and "Tamaño" use the same names and icons as RoleTypographyFields.tsx
- ES/EN language switch; the card section plays its animation on its own
- Card formats come from src/lib/cardGeometry.ts

## Screen map
| Screen | Repo files |
|---|---|
| Landing v6.dc.html | src/app/page.tsx, src/ui/MenuSection.tsx, src/ui/InspectorHeader.tsx, src/ui/editor.css, src/components/canvas/RoleTypographyFields.tsx, src/lib/cardGeometry.ts |
| Auth v3.dc.html | src/app/login/page.tsx |
| Responsive Board.dc.html | (board of Landing v6 + Auth v3) |

## Sync history
- 2026-10-16T19:59:09Z — Landing v3
- 2026-10-15T19:27:59Z — first landing + auth
