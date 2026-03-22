# docs/FLOORPLAN_3D.md — Floorplan 3D "Animal Crossing"

_Diseño técnico y visual del floorplan 3D isométrico de TableFlow v2.0_

---

## Visión y estética

El floorplan 3D de TableFlow está inspirado en la estética visual de **Animal Crossing**: cálida, caricaturesca, colorida y acogedora. No es fotorrealismo — es **claridad + emoción positiva**.

### Principios visuales

| Principio | Aplicación |
|---|---|
| Formas redondeadas | Esquinas de mesas biseladas, sillas con volúmenes suaves |
| Colores pastel cálidos | Suelo crema, manteles en tonos vino/azul/verde oliva |
| Plano pero con profundidad | Perspectiva isométrica ortográfica — sin distorsión de perspectiva |
| Sin techo | Vista cenital/isométrica, el restaurante visto desde arriba-diagonal |
| Decoraciones simples | Plantas, lámparas, cuadros — sin texturas fotorrealistas |
| Feedback visual claro | El estado de cada mesa siempre es obvio a golpe de vista |

### Paleta de colores

```
// Suelo
FLOOR_BASE      = #F5E6C8   // crema cálido
FLOOR_TILE_ALT  = #EDD9B0   // baldosa alternada (cuadrícula)
FLOOR_TERRACE   = #C8DDB5   // terraza: verde hierba suave
FLOOR_BAR       = #C4B49A   // barra: madera oscura

// Mesas — manteles rotativos por número de mesa
MANTEL_A = #8B1A2F   // vino tinto
MANTEL_B = #1A3A5C   // azul marino
MANTEL_C = #3D5A2C   // verde oliva
MANTEL_BASE = #F5F0E8  // borde de madera de la mesa

// Sillas
CHAIR_SEAT = #D4A96A   // madera clara
CHAIR_BACK = #B8844A   // madera oscura

// Decoraciones
PLANT_POT  = #8B6340   // terracota
PLANT_LEAF = #4A7C3F   // verde hoja
LAMP_BASE  = #C4A882   // latón envejecido

// Estados de mesa (indicadores)
STATUS_FREE     = #4ADE80   // verde vivo
STATUS_PENDING  = #FCD34D   // amarillo cálido
STATUS_OCCUPIED = #F87171   // rojo suave

// Hover
HOVER_LIFT = +2 unidades Y   // la mesa "levita" suavemente
HOVER_TINT = 15% más claro   // mantel aclarado
```

---

## Arquitectura técnica

### Tecnología: Three.js

**Elección:** Three.js vía CDN ESM (sin build step, coherente con el stack vanilla JS actual).

```html
<!-- En index.html -->
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160/examples/jsm/"
  }
}
</script>
```

**Por qué Three.js y no otras opciones:**

| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| **Three.js** | Comunidad enorme, buena doc, ESM nativo, toon shading disponible | Algo pesado (~700KB min) | ✅ Elegido |
| Babylon.js | Más potente, motor físico | Más pesado, curva mayor | ✗ Overkill |
| CSS 3D transforms | Sin deps, ligero | Muy limitado para escena dinámica | ✗ Insuficiente |
| Pixi.js isométrico | Ligero, 2D canvas | Require librerías extra para iso | ✗ Más trabajo |
| Spline | Editor visual increíble | No integrable sin iframe, sin control de datos | ✗ No viable |

### Estructura de archivos

```
frontend/src/
├── components/
│   ├── floor-plan.js          # SVG 2D — se mantiene como fallback
│   └── floor-plan-3d.js       # NUEVO — clase FloorPlan3D (Three.js)
└── utils/
    ├── floor-plan-assets.js   # NUEVO — funciones createRectTable(), createChair(), etc.
    └── floor-plan-colors.js   # NUEVO — paleta de colores + getStatusColor(status)
```

### Clase FloorPlan3D — interfaz pública

La clase `FloorPlan3D` expone **exactamente la misma interfaz** que `FloorPlan` (SVG):

```javascript
class FloorPlan3D {
    constructor(container, options = {})
    // container: HTMLElement donde se monta el canvas Three.js
    // options.draggable: boolean — habilita drag-and-drop de mesas

    render(tables, statuses)
    // tables: Table[] — array de mesas desde PocketBase
    // statuses: TableAvailability[] — estado actual de cada mesa
    // Construye la escena completa desde cero

    update(statuses)
    // statuses: TableAvailability[] — actualiza SOLO los colores de indicadores
    // No reconstruye la escena — solo anima las transiciones de color

    destroy()
    // Limpia el renderer, listeners y memoria Three.js
}
```

`app.js` no necesita cambios lógicos — solo elegir qué clase instanciar:

```javascript
// app.js (extracto)
const FloorPlanClass = window.APP_CONFIG?.USE_3D_FLOOR_PLAN
    ? (await import("./components/floor-plan-3d.js")).FloorPlan3D
    : (await import("./components/floor-plan.js")).FloorPlan;

floorPlan = new FloorPlanClass(container, { draggable: false });
```

---

## Escena Three.js — configuración

### Cámara isométrica

```javascript
// Cámara ortográfica — sin distorsión de perspectiva
const aspect = container.clientWidth / container.clientHeight;
const frustumSize = 20;
const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,  // left
     frustumSize * aspect / 2,  // right
     frustumSize / 2,           // top
    -frustumSize / 2,           // bottom
    0.1,                        // near
    1000                        // far
);

// Posición isométrica clásica (45° horizontal, ~35° vertical)
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);
```

### Iluminación

```javascript
// Luz ambiental cálida — ilumina todo uniformemente
const ambient = new THREE.AmbientLight(0xFFF8E7, 0.8);

// Luz direccional suave — da dimensión sin sombras duras
const sun = new THREE.DirectionalLight(0xFFE0A0, 0.6);
sun.position.set(10, 20, 10);
// NO activar castShadow — demasiado costoso para esta estética
```

### Materiales

Usar `MeshLambertMaterial` (no `MeshStandardMaterial`) — más rápido, suficiente para estética flat:

```javascript
// Compartir materiales para rendimiento — no crear uno por mesh
const materialCache = new Map();

function getMaterial(color) {
    if (!materialCache.has(color)) {
        materialCache.set(color, new THREE.MeshLambertMaterial({ color }));
    }
    return materialCache.get(color);
}
```

---

## Catálogo de assets 3D

### Mesa rectangular (`createRectTable`)

```
Vista lateral:
  ┌──────────────────┐  ← mantel (plano elevado)
  │   ████████████   │  ← tablero madera
  │   ██  ██  ██     │  ← patas (4 cilindros)
  └──────────────────┘

Geometrías:
  - Tablero: BoxGeometry(2, 0.12, 1.2)
  - Mantel:  BoxGeometry(1.9, 0.02, 1.1) — ligeramente encima
  - Pata x4: CylinderGeometry(0.05, 0.05, 0.6, 8)
  - Indicador de estado: CylinderGeometry(0.12, 0.12, 0.08, 16) — encima del mantel
```

### Mesa redonda (`createRoundTable`)

```
Geometrías:
  - Tablero: CylinderGeometry(0.8, 0.8, 0.12, 32)
  - Mantel:  CylinderGeometry(0.75, 0.75, 0.02, 32)
  - Pata:    CylinderGeometry(0.08, 0.08, 0.6, 8) — central
  - Indicador: CylinderGeometry(0.12, 0.12, 0.08, 16)
```

### Silla (`createChair`)

```
Geometrías:
  - Asiento: BoxGeometry(0.35, 0.06, 0.35)
  - Respaldo: BoxGeometry(0.35, 0.4, 0.06)
  - Patas x4: CylinderGeometry(0.025, 0.025, 0.35, 6)

Posición respecto a mesa (para capacity=4):
  Norte: (0, 0, -d)    rotación 0°
  Sur:   (0, 0, +d)    rotación 180°
  Este:  (+d, 0, 0)    rotación 90°
  Oeste: (-d, 0, 0)    rotación -90°
  (d = radio_mesa + 0.4)

Para capacity=2: Norte + Sur
Para capacity=6: Norte + Sur + Este + Oeste + NorEste + NorOeste
```

### Planta decorativa (`createPlant`)

```
Geometrías:
  - Maceta: CylinderGeometry(0.18, 0.14, 0.3, 8) — color terracota
  - Tierra: CylinderGeometry(0.17, 0.17, 0.04, 8) — color marrón
  - Hoja 1: SphereGeometry(0.28, 8, 6) — verde, elevada
  - Hoja 2: SphereGeometry(0.2, 8, 6)  — verde más oscuro, offset lateral
```

### Lámpara de techo (`createLamp`)

```
Geometrías:
  - Cable: CylinderGeometry(0.02, 0.02, 0.5, 4) — negro, colgando desde arriba
  - Pantalla: ConeGeometry(0.3, 0.25, 16, 1, true) — abierta abajo, color laton
  - Bombilla: SphereGeometry(0.1, 8, 6) — color amarillo claro emisivo
```

---

## Sistema de coordenadas

El suelo 3D mapea las coordenadas `x, y` de PocketBase (píxeles SVG) a unidades Three.js:

```javascript
// Factor de escala: el SVG puede ser 800x600px, la escena 3D es ~20x15 unidades
const SCALE = 0.025;

function tablePosition(table) {
    return {
        x: (table.x - SVG_CENTER_X) * SCALE,
        z: (table.y - SVG_CENTER_Y) * SCALE,  // Y del SVG → Z en 3D (plano suelo)
        y: 0.3  // altura fija sobre el suelo
    };
}
```

Al guardar posición tras drag-and-drop, la conversión es inversa:

```javascript
function to2DCoords(position3D) {
    return {
        x: position3D.x / SCALE + SVG_CENTER_X,
        y: position3D.z / SCALE + SVG_CENTER_Y,
    };
}
```

---

## Interactividad — raycasting

```javascript
// Click en mesa → tableselect event
renderer.domElement.addEventListener("click", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(tableHitboxes, true);
    if (hits.length > 0) {
        const tableId = hits[0].object.userData.tableId;
        const table = tablesMap.get(tableId);
        container.dispatchEvent(
            new CustomEvent("tableselect", { bubbles: true, detail: { table } })
        );
    }
});
```

El evento `tableselect` es **idéntico** al que despacha el SVG 2D — `app.js` no sabe qué implementación lo generó.

---

## Animaciones

### Transición de color de estado

```javascript
// Sin GSAP — interpolación manual con requestAnimationFrame
function animateColor(mesh, fromColor, toColor, duration = 400) {
    const start = performance.now();
    const from = new THREE.Color(fromColor);
    const to   = new THREE.Color(toColor);

    function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        mesh.material.color.lerpColors(from, to, easeOutCubic(t));
        if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
```

### Pulso de mesa ocupada

```javascript
// Mesa en estado "seated" pulsa su indicador cada 2 segundos
function pulseIndicator(indicatorMesh) {
    let t = 0;
    function tick() {
        t += 0.02;
        const scale = 1 + 0.3 * Math.abs(Math.sin(t * Math.PI));
        indicatorMesh.scale.setScalar(scale);
        indicatorMesh.userData.pulseRaf = requestAnimationFrame(tick);
    }
    tick();
}

function stopPulse(indicatorMesh) {
    cancelAnimationFrame(indicatorMesh.userData.pulseRaf);
    indicatorMesh.scale.setScalar(1);
}
```

---

## Render loop

Para maximizar rendimiento, el loop de render es **bajo demanda**, no continuo:

```javascript
let needsRender = true;
let rafId = null;

function requestRender() {
    needsRender = true;
    if (!rafId) rafId = requestAnimationFrame(renderLoop);
}

function renderLoop() {
    rafId = null;
    if (!needsRender) return;
    needsRender = false;
    renderer.render(scene, camera);
    // Si hay animaciones activas (pulso, transición), el propio tick llama requestRender()
}
```

El floor plan renderiza solo cuando:
1. Se monta por primera vez
2. Se llama `update()` (cambia estado de mesas)
3. El usuario hace hover o mueve el ratón sobre una mesa
4. Hay un pulso activo en una mesa ocupada

---

## Fallback a SVG 2D

Si WebGL no está disponible:

```javascript
// Al construir FloorPlan3D
constructor(container, options) {
    if (!this.#webglAvailable()) {
        console.warn("WebGL no disponible — usando floorplan SVG 2D");
        this.#fallback = new FloorPlan(container, options);
        return;
    }
    // ... setup Three.js
}

#webglAvailable() {
    try {
        const canvas = document.createElement("canvas");
        return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch { return false; }
}
```

---

## Extensión — añadir nuevos objetos

Para añadir un nuevo tipo de elemento decorativo:

1. Añadir función `createMiObjeto()` en `floor-plan-assets.js`
2. Devolver un `THREE.Group` con `userData.type = "decoration"` (no añadir a `tableHitboxes`)
3. Llamar desde `FloorPlan3D.#buildDecoration(x, z)` si la mesa está en esa zona

No tocar `floor-plan-3d.js` para añadir assets — solo `floor-plan-assets.js`.

---

## Checklist de implementación (orden sugerido)

```
[ ] TASK-088: Three.js CDN + importmap en index.html
[ ] TASK-090: Escena básica (renderer + cámara isométrica + luz)
[ ] TASK-094: Suelo (plano con color crema)
[ ] TASK-095: Mesa rectangular básica (cuerpo + mantel, sin sillas)
[ ] TASK-104: Raycasting click → tableselect event
[ ] TASK-108: Integración en app.js con flag USE_3D_FLOOR_PLAN
[ ] TASK-100: Indicadores de estado (cilindros de color)
[ ] TASK-109: Verificar refreshFloorPlan() funciona
[ ] TASK-096: Mesa redonda
[ ] TASK-097: Sillas según capacity
[ ] TASK-101: Animación transición de color
[ ] TASK-102: Hover lift effect
[ ] TASK-103: Pulso en mesas ocupadas
[ ] TASK-105: Cursor pointer en hover
[ ] TASK-106: Drag-and-drop 3D en modo edición
[ ] TASK-098: Decoraciones (plantas, lámparas)
[ ] TASK-112: Multi-área (Indoor / Terraza / Barra)
[ ] TASK-119: Zoom/pan con rueda
[ ] TASK-113-116: Optimización y fallback
[ ] TASK-117: Tests
```
