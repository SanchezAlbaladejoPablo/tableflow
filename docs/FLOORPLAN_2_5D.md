# Motor Isométrico 2.5D — Guía de desarrollo

> Fase 22 · Canvas 2D API · Sin dependencias externas

---

## ¿Qué es?

El floor plan 2.5D es un **motor isométrico dibujado sobre un `<canvas>` HTML**.
Reemplaza el SVG 2D original con una vista de perspectiva isométrica de estilo cálido (inspiración: Animal Crossing / videojuego de restaurante).

No usa Three.js ni WebGL. Todo el dibujo es Canvas 2D API puro — funciona en cualquier navegador moderno y en tablets sin drivers de GPU.

**`FloorPlan2_5D` expone exactamente la misma interfaz que `FloorPlan` (SVG)**, por lo que `app.js` no sabe qué motor está activo. El flag de activación está en `index.html`:

```js
window.APP_CONFIG = {
    USE_2_5D_FLOOR_PLAN: true,   // true → canvas 2.5D  |  false → SVG
};
```

Si el canvas no está disponible, el sistema hace fallback automático al SVG.

---

## Archivos

```
src/components/floor-plan-2_5d.js   ← motor principal (canvas, loop, eventos)
src/utils/iso-sprites.js            ← funciones de dibujo de cada sprite
src/utils/iso-palette.js            ← todos los colores en un solo lugar
src/utils/characters.js             ← personajes animados (Tom Nook)
```

---

## Interfaz pública

```js
const fp = new FloorPlan2_5D(containerEl, { draggable, editMode });

fp.render(tables, availability);   // pintado completo
fp.update(availability);           // solo actualiza colores/personajes (barato)
fp.highlight(tableId);             // marca una mesa con borde
fp.destroy();                      // libera canvas y todos los listeners
```

### Eventos que despacha en el contenedor

| Evento        | `detail`              | Cuándo                            |
|---------------|-----------------------|-----------------------------------|
| `tableselect` | `{ table, status }`   | Click en mesa (modo vista)        |
| `tablemove`   | `{ tableId, x, y }`   | Fin de drag-and-drop (modo edición)|
| `tabledelete` | `{ tableId, table }`  | Click en badge × (modo edición)   |

---

## Sistema de coordenadas

### Dos espacios de coordenadas

```
World space  →  0–800 (x)  ×  0–500 (y)   (herencia del SVG original)
Screen space →  0–960 (x)  ×  0–520 (y)   (canvas virtual, escala con CSS)
```

Las mesas guardan `pos_x` / `pos_y` en **world space**.
El motor los convierte a screen space con la proyección isométrica:

```
ISO_SCALE = 0.45       ← ajusta cuánto espacio ocupa el mundo en pantalla
OFFSET_X  = 460.8      ← centra horizontalmente
OFFSET_Y  = 55         ← margen superior

worldToScreen(wx, wy):
  ix = wx × ISO_SCALE
  iy = wy × ISO_SCALE
  sx = (ix - iy) + OFFSET_X      ← eje diagonal izquierda-derecha
  sy = (ix + iy) × 0.5 + OFFSET_Y ← eje diagonal arriba-abajo
```

> Para más espaciado entre mesas: subir `ISO_SCALE` (ej. 0.55) o ampliar `VIRT_W`/`VIRT_H`.

---

## Capas de render (painter's algorithm)

Las capas se dibujan en orden para que el "frente" tape al "fondo":

```
1. Suelo        — tiles isométricos en patrón ajedrez (drawFloorTile)
2. Decoraciones — plantas de esquina + puerta (drawPlant, drawDoor)
3. Mesas        — ordenadas por pos_x+pos_y ascendente (las del fondo primero)
                   drawTableRect / drawTableRound + drawChairs
4. Personajes   — Tom Nook caminando hacia la mesa (drawCharacter)
5. Indicadores  — rombo flotante de estado sobre cada mesa (drawStatusIndicator)
```

---

## Estados de mesa y colores

```js
// iso-palette.js → PALETTE.status
available: "#4ADE80"   // verde
reserved:  "#FCD34D"   // ámbar
occupied:  "#F87171"   // rojo
pending:   "#93C5FD"   // azul
```

Los cambios de estado tienen **transición de color de 400 ms** (interpolación RGB).
Las mesas `occupied` tienen **efecto pulso** (`Math.sin` sobre el indicador).

---

## Personajes (Tom Nook)

Cuando una mesa pasa a `reserved`, se instancia un personaje en la puerta
que camina hacia la mesa a 60 px/s y se sienta al llegar.

```
CharacterManager.spawn(tableId, doorPos, tablePos)  ← al pasar a reserved
CharacterManager.remove(tableId)                    ← al liberar la mesa
```

Gestionado en `characters.js` · Dibujado en `iso-sprites.js → drawCharacter`.

---

## Cómo modificar colores

Todos los colores están centralizados en **`iso-palette.js`**.
Cambiar un color ahí afecta automáticamente a todos los sprites que lo usen.

```js
// Ejemplo: cambiar el suelo a tonos nocturnos
export const PALETTE = {
    floor_tile:     "#1E293B",   // azul noche
    floor_tile_alt: "#0F172A",   // más oscuro
    ...
};
```

---

## Cómo añadir un sprite nuevo

1. Añadir `drawMiSprite(ctx, cx, cy, ...)` en **`iso-sprites.js`**
2. Añadir los colores necesarios en **`iso-palette.js`**
3. Llamar desde la capa apropiada en `#draw()` en **`floor-plan-2_5d.js`**

Regla: **solo primitivos Canvas 2D** — sin imágenes externas, sin dependencias.

---

## Performance

| Técnica | Descripción |
|---------|-------------|
| Dirty-flag | Solo redibuja cuando `#dirty=true` o hay animaciones activas |
| 60 fps cap | Loop con `requestAnimationFrame` + delta time |
| Ordenación única | Las mesas se reordenan solo en `render()`, no en cada frame |
| Transiciones | Interpolación RGB en `lerpColor`, máx 400ms por mesa |
| Pulso | `Math.sin(frame × 0.05)` — barato, sin canvas extra |

---

## Constantes clave (floor-plan-2_5d.js)

| Constante | Valor | Qué controla |
|-----------|-------|--------------|
| `VIRT_W` / `VIRT_H` | 960 / 520 | Resolución del canvas virtual |
| `ISO_SCALE` | 0.45 | Escala world → pantalla (más = más separación entre mesas) |
| `OFFSET_X` | 460.8 | Centrado horizontal del world space |
| `OFFSET_Y` | 55 | Margen superior |
| `FLOOR_TILE` | 80 | Tamaño de cada tile de suelo en world units |
| `DOOR_WORLD` | `{x:0, y:250}` | Posición de la puerta (origen de personajes) |
| `DECORATION_POSITIONS` | array 5 pts | Posiciones de las plantas decorativas |
