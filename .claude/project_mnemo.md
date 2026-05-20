# Estado actual del proyecto — Mnemo

## Arquitectura de persistencia (implementada)

Modelo de operaciones (event sourcing):
- `canvas_ops`: tabla donde se guarda cada operación del usuario
- `canvases`: tabla de snapshots (se actualiza al compactar, cada 50 ops)
- `applyOp()`: fuente de verdad para cambios de estado
- `enqueueOp()`: UI inmediata + flush async a Supabase
- `compactOps()`: se ejecuta en background tras cada flush exitoso

Flujo de carga en `switchCanvas`:
1. Obtener `canvas_id` de `canvases` (o crear si no existe)
2. Aplicar snapshot base de `canvases`
3. Cargar solo ops posteriores al `updated_at` del snapshot
4. Replay de ops en orden (created_at + id, ascending)

## Problemas críticos — resolver en orden en próxima sesión

### 1. Carga tarda 1 minuto (BLOQUEANTE)
El código inserta en `canvas_ops` con columna `canvas_id`, pero la tabla fue
creada originalmente con columnas `user_id + canvas_type`. Hay un mismatch de
esquema. El insert falla silenciosamente o va a la tabla equivocada.

**Acción:** Verificar el esquema real de `canvas_ops` en el dashboard de Supabase.
Opciones:
- Si la tabla tiene `canvas_type`: revertir el código a usar `canvas_type`
- Si la tabla tiene `canvas_id`: confirmar que existe FK a `canvases.id`
Alinear código y esquema antes de cualquier otra cosa.

### 2. MY SPACE no permite subir imágenes
`enqueueOp` falla en modo space. Probable causa: `canvasIdRef.current` es null
cuando el usuario intenta agregar imágenes en el canvas space (canvas_id no
resuelto todavía al momento de la interacción).

**Acción:** Investigar por qué `canvasIdRef.current` es null en mode "space".
Revisar si el `switchCanvas` resuelve el canvas_id correctamente para ambos modos.
Agregar log al inicio de `enqueueOp` para confirmar el valor de `canvasIdRef.current`.

### 3. Migrar imágenes a Supabase Storage
Las imágenes se guardan actualmente como base64 en las ops, lo que hace los
payloads enormes y causa lentitud.

**Acción:**
1. Crear bucket `canvas-assets` público en Supabase Storage
2. Implementar `uploadToStorage(file): Promise<string>` → retorna URL pública
3. Reemplazar `fileToBase64(f)` en:
   - `handleImageUpload` en CanvasBoard.tsx
   - `addImages` en GalleryWidget.tsx
   - Cualquier otro lugar donde se suba imagen
4. Guardar URL en lugar de base64 en la op

## Regla para próxima sesión
No tocar nada más hasta resolver estos 3 puntos en orden.
