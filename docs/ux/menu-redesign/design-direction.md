# Dirección de diseño — Editor MNEMO (Menu Redesign)

> Decidida el 2026-10-05 por el equipo especializado, sobre el código en `b69b635`. Participaron UX/Product Lead,
> Interaction, Visual/UI, Design Systems, UX Critic, Accessibility y Behavioral. Pasó por inspección dirigida →
> matriz deduplicada → debate D1–D8 → borrador del UX Lead → firma con enmiendas de Interaction, Visual y DS.
> **Reemplaza** a la "Dirección UX/UI aprobada" del checkpoint de `CLAUDE.md` en lo que se contradiga: entrada por
> facetas, filas resumen en texto. Mantiene vigentes los límites de producto, O1–O4 y la Iteración 0.
> Compañeros: `interaction-model.md` · `implementation-plan.md`.

## A. Modelo mental
**"Tocá lo que ves y dale estilo."** El usuario no "configura campos": elige un objeto de su card y lo transforma. El inspector siempre responde a una pregunta: *¿qué objeto estoy editando?* (nunca *¿qué tipo de propiedad?*).

## B. Arquitectura de información
Inspector acoplado a la derecha (~320px) = **header del objeto + lista de objetos (chips) + secciones del objeto activo**.

| Objeto (chip) | Caption | Secciones dentro |
|---|---|---|
| Nombre | "Tu nombre" | Texto (campo) · Fuente · Color · Tamaño · Gradiente/Brillo animado · Animación por letra · Más ajustes |
| @usuario | "@usuario" | Fuente · Color · Tamaño · Gradiente · Más ajustes (handle de solo lectura) |
| Frase | "Frase corta" | Texto · Fuente · Color · Tamaño · Gradiente · Más ajustes |
| Ubicación | "Ubicación" | Texto · Fuente · Color · Tamaño · Gradiente · Estilo de bloque |
| Bio | "Bio" | Texto · Fuente · Color · Tamaño · Gradiente · Más ajustes (interlineado) |
| Visitas | "Visitas" | Mostrar · Fuente · Color · Tamaño · Estilo de bloque |
| Foto | miniatura real | Imagen · Tamaño · Forma · Efectos (Borde, Sombra, Brillo+Pulso) |
| Links | íconos reales | Links · Tamaño de ícono · Estilo de bloque |
| Logo | miniatura | Imagen · Tamaño · Opacidad · Rotación · Profundidad |
| Fondo de la card | muestra del fondo | Color/Imagen · Forma (radio) · Opacidad/vidrio · Medidas (Más ajustes) |
| Efectos de la card | "N activos" | Grupos de tiles: Borde y sombra · Brillo · Movimiento · Retro |
| Todos los textos | "Aa" | Alineación · Interlineado secundario · Sombra/Brillo/Contorno/Desenfoque globales |

Objetos fuera de ProfileCard (mismo shell):
- **Music:** Pista · Fondo · Texto · Efectos.
- **Imagen:** Forma · Capa · Link, más ⋯ (Bloquear/Eliminar).

Las facetas Contenido/Fondo/Texto/Efectos **dejan de ser la entrada**. Sobreviven como secciones dentro de cada objeto.

## E. Comunicación visual
| Pasa a ser visual | Queda como texto |
|---|---|
| Rol = placa espécimen de 56px con el texto real del usuario, con sus efectos, sobre el fondo efectivo de la card | Caption del objeto |
| Fuente = tiles renderizados en su fuente | Números, solo en Más ajustes (Space Mono) |
| Peso = riel con los pesos cargados | Hex, solo dentro del popover de color |
| Color = well + colores recientes/usados en la card | "Pausado · valores" |
| Gradiente = una barra con stops | Notas de causa ("lo reemplaza el gradiente") |
| Efecto = tile con miniatura estática (anima en hover/foco) + switch | |
| Activos = barra "Activos (N)" | |

### Especificación visual (enmienda Visual)

**Placa espécimen**
- Alto 56, radio 12, padding 12/16.
- Texto en 1 línea, con ellipsis.
- Escala hacia abajo solo si el tamaño real supera los 28px (techo visual 28px). Nunca agranda.
- Usa el fondo efectivo de la card. Si es imagen o transparente, pasa a `#141417` + damero.
- Contraste ≥3:1 y hairline `.10`.

**Tile de efecto**
- Grilla de 2 columnas, tile de 148×64, radio 12.
- Miniatura "Aa" de 32×32 a la izquierda.
- Nombre en DM Sans 13.
- Switch como target separado.

**Chip de objeto**
- Alto 32, radio 999.

**Monocromo y vidrio**
- El color del usuario aparece solo dentro de la placa espécimen, el well, la miniatura y la barra de gradiente. Todo
  el chrome queda en grises.
- El inspector es L1 opaco `rgba(20,20,23,.94)`.
- El blur se usa solo en popovers y en el tag "Vista previa". "Glass" es la estética del editor, nunca un preset de
  perfil.

## H. Reglas de densidad
- Máximo **6 controles primarios** visibles por sección. El resto va a "Más ajustes" (un nivel, nunca anidado).
- Tiles en grupos de 3–6, nunca una pared plana.
- Un solo detalle abierto por grupo de tiles.
- Un solo objeto en pantalla. Al cambiar de objeto se reemplaza el cuerpo y se recuerdan el scroll y la sección abierta.
- No hay filas "Activar". Una palabra por concepto (Intensidad/Tamaño/Velocidad), con unidades humanas.

## I. Camino del usuario general
Seleccionar la card → click en el nombre (o chip "Nombre") → tile de fuente → color. Son **≤4 clics y 0 sliders.** Lo mismo vale para la Bio.

## J. Profundidad avanzada
Todo parámetro actual sigue alcanzable:
- "Más ajustes" por sección: peso exacto, espaciado, interlineado, ángulo, stagger, offsets.
- Medidas, en Fondo de la card.
- Un test de matriz capacidad→ruta garantiza que ningún campo queda sin UI.

## Alternativas rechazadas
| Alternativa | Motivo |
|---|---|
| Facetas como entrada | Reparten un objeto en 4 lugares (P1) |
| Efecto como unidad de Texto | Contradice "tocá lo que ves" |
| Detalle en popover | Se apila con ColorPopover y tapa la card |
| Drill-in con "volver" | Pierde la comparación entre efectos |
| Activación implícita al tocar un parámetro | Rompe el modelo de pausa |
| Probar con hover sin aplicar | Requiere un estado paralelo fuera de applyOp y no existe en touch |
| Efectos de texto por rol ahora | Toca el render de texto. Queda diferido (viable vía `RoleTextEffect.text`) |
| Panel flotante junto a la card | Hay 11 copias de la fórmula de anclaje y tapa el objeto |
| Bottom sheet en desktop | Saca el ojo de la card; queda solo como overlay en viewport angosto |
| Filas resumen en texto (dirección previa) | Ordenan el formulario, pero siguen siendo texto para leer, no algo para ver |
