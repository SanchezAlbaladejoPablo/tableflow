# docs/FLOORPLAN_2_5D.md — Motor Isométrico 2.5D

_Fase 22 — Decisión de arquitectura: 2026-03-22_

---

## Visión general

El floorplan 2.5D sustituye el SVG 2D por un motor isométrico basado en **Canvas 2D API**.
No usa Three.js ni WebGL — funciona en cualquier navegador moderno, incluidos tablets.

El componente `FloorPlan2_5D` expone **la misma interfaz pública** que `FloorPlan` (SVG),
por lo que `app.js` no necesita cambios — solo se selecciona el motor con un flag.

---

## Activación

En `frontend/index.html`:

```js
window.APP_CONFIG = {
    USE_2_5D_FLOOR_PLAN: true,  // false → SVG 2D (por defecto)
};
```

Si Canvas no está disponible, se instancia `FloorPlan` (SVG) automáticamente como fallback.

---

## Interfaz pública

```js
const fp = new FloorPlan2_5D(containerEl, options);

fp.render(tables, availability);  // render completo
fp.update(availability);          // solo actualizar colores/personajes
fp.highlight(tableId);            // resaltar una mesa
fp.destroy();                     // limpiar canvas y listeners
```

### Eventos despachados en el contenedor

| Evento | Detail | Descripción |
|---|---|---|
| `tableselect` | `{ table, status }` | Click en una mesa (modo vista) |
| `tablemove`   | `{ tableId, x, y }` | Fin de drag-and-drop (modo edición) |
| `tabledelete` | `{ tableId, table }` | Click en badge × (modo edición) |

---

## Sistema de coordenadas isométricas

### World space
Herencia del SVG viewBox original: `0–800 × 0–500`.
Cada mesa tiene `pos_x`, `pos_y` en estas unidades.

### Screen space (canvas virtual)
Resolución virtual: `960 × 520` px (escalada con CSS `width:100%`).

### Transformación

```
ISO_SCALE = 0.45
OFFSET_X  = 960 × 0.48 = 460.8
OFFSET_Y  = 55

worldToScreen(wx, wy):
  ix = wx × ISO_SCALE
  iy = wy × ISO_SCALE
  sx = (ix - iy) + OFFSET_X
  sy = (ix + iy) × 0.5 + OFFSET_Y

screenToWorld(sx, sy):
  dx = sx - OFFSET_X
  dy = sy - OFFSET_Y
  wx = (dy + dx × 0.5) / ISO_SCALE
  wy = (dy - dx × 0.5) / ISO_SCALE
```

---

## Sistema de capas

El render se ejecuta en este orden (painter's algorithm):

| Capa | Contenido | Archivo |
|---|---|---|
| 1 | Suelo (tiles isométricos) | `iso-sprites.js → drawFloorTile` |
| 2 | Decoraciones (plantas, puerta) | `iso-sprites.js → drawPlant, drawDoor` |
| 3 | Mesas + sillas | `iso-sprites.js → drawTableRect/Round, drawChairs` |
| 4 | Personajes (Tom Nook) | `iso-sprites.js → drawCharacter` |
| 5 | Indicadores de estado | `iso-sprites.js → drawStatusIndicator` |

Las mesas se ordenan por `pos_x + pos_y` creciente (las más "atrás" se dibujan primero).

---

## Catálogo de sprites

Todos los sprites se dibujan con primitivos Canvas 2D — sin imágenes externas.

| Sprite | Función | Descripción |
|---|---|---|
| Suelo | `drawFloorTile` | Rombo isométrico, patrón ajedrez crema/arena |
| Mesa rect | `drawTableRect` | Caja iso (3 caras) + mantel de color |
| Mesa redonda | `drawTableRound` | Elipse + cilindro lateral |
| Silla | `drawChairs` | Cubos iso pequeños alrededor de la mesa |
| Planta | `drawPlant` | Maceta + esfera de hojas con gradiente |
| Puerta | `drawDoor` | Caja alta con arco y pomo dorado |
| Tom Nook | `drawCharacter` | Figura iso: cuerpo + cabeza + orejas |
| Indicador | `drawStatusIndicator` | Rombo flotante sobre la mesa |

---

## Paleta de colores

Definida en `frontend/src/utils/iso-palette.js`.

### Estados de mesa

| Estado | Color | HEX |
|---|---|---|
| `available` | Verde | `#4ADE80` |
| `reserved`  | Ámbar | `#FCD34D` |
| `occupied`  | Rojo  | `#F87171` |
| `pending`   | Azul  | `#93C5FD` |

### Suelo

| Elemento | HEX |
|---|---|
| Tile base  | `#F5E6C8` |
| Tile alt   | `#EDD9A3` |
| Borde tile | `#D9C48A` |

### Manteles de mesa (rotación por `tableNumber mod 5`)

`#C8E6C9` · `#BBDEFB` · `#FCE4EC` · `#FFF9C4` · `#E1BEE7`

---

## Sistema de personajes — Tom Nook

### Ciclo de vida

```
status cambia a 'reserved'
       ↓
CharacterManager.spawn(tableId, doorPos, tablePos)
       ↓
state = 'walking' → interpola posición door → mesa (60px/s)
       ↓
llega a la mesa → state = 'seated' (escala 0.75)
       ↓
status cambia a 'available'
       ↓
CharacterManager.remove(tableId)
```

### Activación

En `FloorPlan2_5D.update()`, cuando una mesa pasa a `reserved`:

```js
this.#characters.spawn(tableId, doorPos, tablePos);
```

### Archivos

- `frontend/src/utils/characters.js` — `CharacterManager` (spawn, remove, update, getAll)
- `frontend/src/utils/iso-sprites.js` — `drawCharacter(ctx, cx, cy, state, animFrame)`

---

## Performance

| Técnica | Implementación |
|---|---|
| Dirty-flag | Solo redibujar si `#dirty=true` o hay animaciones activas |
| Transición de color | Interpolación RGB 400ms al cambiar estado |
| Pulso | `Math.sin` sobre `#pulseFrame` — solo para estado `occupied` |
| Painter's algorithm | Orden correcto sin z-buffer |
| Fallback | Si Canvas no disponible → `FloorPlan` (SVG) automático |

---

## Extensión — añadir nuevos sprites

1. Añadir función `drawMiSprite(ctx, cx, cy, ...)` en `iso-sprites.js`
2. Añadir colores necesarios en `iso-palette.js`
3. Llamar desde la capa apropiada en `floor-plan-2_5d.js`

Los sprites no deben depender de imágenes externas — solo primitivos Canvas 2D.
