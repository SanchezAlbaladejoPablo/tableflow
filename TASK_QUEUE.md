# TASK_QUEUE.md — Development Task Queue

Tasks are ordered by priority. Always pick the first PENDING task.
Update status as you work: PENDING → IN_PROGRESS → DONE.

---

## Phase 1 — Documentation & Context System

| ID | Task | Status |
|---|---|---|
| TASK-001 | Create all documentation files and folder structure | DONE |

---

## Phase 2 — Architecture & Schema

| ID | Task | Status |
|---|---|---|
| TASK-002 | Write `docs/ARCHITECTURE.md` | DONE |
| TASK-003 | Write `docs/DATABASE_SCHEMA.md` | DONE |

---

## Phase 4 — PocketBase Setup

| ID | Task | Status |
|---|---|---|
| TASK-004 | Write PocketBase migration files (JS hooks) to create all collections with correct fields and indexes | DONE |
| TASK-005 | Write PocketBase server-side hooks for logging reservation events | DONE |
| TASK-006 | Write seed data script (`seed/seed.js`) to populate example restaurant, tables, customers, and reservations | DONE |

---

## Phase 5 — Reservation API

| ID | Task | Status |
|---|---|---|
| TASK-007 | Create `frontend/src/services/api.js` — base HTTP client wrapping PocketBase REST API | DONE |
| TASK-008 | Create `frontend/src/services/reservations.js` — CRUD operations for reservations | DONE |
| TASK-009 | Create `frontend/src/services/tables.js` — table availability queries | DONE |
| TASK-010 | Create `frontend/src/services/customers.js` — customer CRUD | DONE |
| TASK-011 | Implement table assignment logic (`frontend/src/utils/table-assignment.js`) — best-fit algorithm | DONE |

---

## Phase 6 — Floor Plan Rendering

| ID | Task | Status |
|---|---|---|
| TASK-012 | Create `frontend/src/components/floor-plan.js` — SVG floor plan renderer | DONE |
| TASK-013 | Implement table status color coding (green/yellow/red) | DONE |
| TASK-014 | Implement table click handler → table detail modal | DONE |
| TASK-015 | Implement drag-and-drop table repositioning | DONE |

---

## Phase 7 — Dashboard UI

| ID | Task | Status |
|---|---|---|
| TASK-016 | Create `frontend/index.html` — main app shell | DONE |
| TASK-017 | Create `frontend/src/components/reservation-form.js` — create/edit reservation modal | DONE |
| TASK-018 | Create `frontend/src/components/reservation-list.js` — reservations table view | DONE |
| TASK-019 | Create `frontend/src/components/customer-form.js` — customer CRM form | DONE |
| TASK-020 | Create `frontend/styles/main.css` — global styles | DONE |
| TASK-021 | Wire up all components in `frontend/src/app.js` — main application entry point | DONE |

---

## Phase 8 — n8n Automation Workflows

| ID | Task | Status |
|---|---|---|
| TASK-022 | Design and export n8n workflow: reservation confirmation email/SMS | DONE |
| TASK-023 | Design and export n8n workflow: 24-hour reminder notification | DONE |
| TASK-024 | Design and export n8n workflow: webhook receiver for incoming reservation messages | DONE |
| TASK-025 | Document how to import and configure n8n workflows in `docs/SETUP.md` | DONE |

---

## Phase 9 — AI Message Classification

| ID | Task | Status |
|---|---|---|
| TASK-026 | Create `frontend/src/services/ai-classifier.js` — client for AI classification endpoint | DONE |
| TASK-027 | Design and export n8n workflow: AI message classification using OpenAI | DONE |
| TASK-028 | Integrate classification results into reservation creation flow | DONE |

---

## Phase 10 — Testing & Finalization

| ID | Task | Status |
|---|---|---|
| TASK-029 | Write unit tests for table assignment logic (`tests/table-assignment.test.js`) | DONE |
| TASK-030 | Write integration tests for PocketBase API endpoints (`tests/api.test.js`) | DONE |
| TASK-031 | Write tests for automation trigger logic (`tests/automations.test.js`) | DONE |
| TASK-032 | Final documentation review and README polish | DONE |
| TASK-033 | Add architecture diagram (ASCII or Mermaid) to `docs/ARCHITECTURE.md` | DONE |

---

## Phase 11 — n8n Automation Setup (Pending manual configuration)

| ID | Task | Status |
|---|---|---|
| TASK-034 | Instalar n8n: `npm install -g n8n` | PENDING |
| TASK-035 | Arrancar n8n: `n8n start` → verificar http://localhost:5678 | PENDING |
| TASK-036 | Importar los 4 workflows desde `automations/n8n/` en n8n (Workflows → Import from File) | PENDING |
| TASK-037 | Configurar credenciales SMTP en n8n (host, puerto, usuario, contraseña) | PENDING |
| TASK-038 | Configurar credencial OpenAI API Key en n8n | PENDING |
| TASK-039 | Actualizar la URL de PocketBase en cada workflow (variable `POCKETBASE_URL = http://localhost:8090`) | PENDING |
| TASK-040 | Activar los 4 workflows en n8n | PENDING |
| TASK-041 | Añadir webhook en PocketBase: tras crear reserva → POST http://localhost:5678/webhook/reservation-confirmation | PENDING |
| TASK-042 | Probar flujo completo: crear reserva → verificar que llega email de confirmación | PENDING |

---

## Phase 12 — Authentication & Access Control (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-043 | Add `users` collection to PocketBase with role field (`superadmin`, `restaurant_admin`, `staff`) and restaurant_id relation | DONE |
| TASK-044 | Configure PocketBase collection rules for all collections to enforce `@request.auth.restaurant_id = restaurant_id` | DONE |
| TASK-045 | Create login page in frontend (`frontend/src/pages/login.js`) with email/password form | DONE |
| TASK-046 | Update `api.js` to attach JWT token to all requests and handle 401 → redirect to login | DONE |
| TASK-047 | Add logout button to app header | DONE |
| TASK-048 | Write tests for auth flow and collection rule enforcement | DONE |

---

## Phase 13 — Restaurant Onboarding Wizard (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-049 | Add `restaurant_settings` collection (timezone, default_duration_minutes, min_gap_minutes, opening_time, closing_time, logo_url, primary_color, booking_widget_enabled, booking_widget_token) | DONE |
| TASK-050 | Create restaurant registration page — new restaurant_admin can sign up and create their restaurant | DONE |
| TASK-051 | Create onboarding wizard (3 steps): 1) Restaurant details, 2) Add tables, 3) Set operating hours | DONE |
| TASK-052 | Load per-restaurant settings at app startup and apply to reservation form defaults | DONE |
| TASK-053 | Replace hardcoded `duration_minutes: 90` and `GAP_MS: 3h` with per-restaurant settings | DONE |
| TASK-054 | Write `docs/SAAS_ONBOARDING.md` — guide for new restaurant sign-up | DONE |

---

## Phase 14 — Editable Floor Plan (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-055 | Add floor plan editor mode toggle (view vs. edit) in the UI | DONE |
| TASK-056 | Enable drag-and-drop repositioning in editor mode (already implemented, expose to admin) | DONE |
| TASK-057 | Add "New Table" button in editor mode — opens form to set number, capacity, area, shape | DONE |
| TASK-058 | Add "Delete Table" button per table in editor mode | DONE |
| TASK-059 | Add multi-area support: Indoor / Terraza / Barra as separate floor plan sections | DONE |

---

## Phase 15 — Real-time Updates via SSE (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-060 | Replace 60-second polling with PocketBase SSE subscription to `reservations` collection | DONE |
| TASK-061 | Subscribe to `tables` collection for instant floor plan updates when table status changes | DONE |
| TASK-062 | Add visual indicator in header when SSE is connected/disconnected | DONE |
| TASK-063 | Implement SSE reconnection logic with exponential backoff | DONE |

---

## Phase 16 — Analytics Dashboard (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-064 | Add "Analytics" tab to the dashboard (4th tab) | DONE |
| TASK-065 | Implement occupancy rate chart (reservations/capacity by day for last 30 days) | DONE |
| TASK-066 | Implement no-show rate tracker (no_show count / total reservations) | DONE |
| TASK-067 | Implement peak hours heatmap (reservations by hour of day, day of week) | DONE |
| TASK-068 | Implement customer retention metrics (new vs returning guests by month) | DONE |
| TASK-069 | Add CSV export for reservations and analytics data | DONE |

---

## Phase 17 — Public Booking Widget (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-070 | Add booking widget settings in restaurant_settings (enable/disable, token, custom message) | DONE |
| TASK-071 | Create standalone booking widget page (`frontend/widget.html`) — minimal UI, no auth, embeddable as iframe | DONE |
| TASK-072 | Implement public availability check endpoint (widget token scoped to one restaurant, read-only capacity check) | DONE |
| TASK-073 | Implement public reservation creation (widget token, create-only, source=widget, status=pending) | DONE |
| TASK-074 | Generate embed code snippet in settings for restaurant owners to paste into their website | DONE |

---

## Phase 18 — AI Predictions (SaaS v2.0) — SKIP

> Omitida por decisión de producto. No implementar de momento.

| ID | Task | Status |
|---|---|---|
| TASK-075 | Add no-show probability score to reservation list | SKIP |
| TASK-076 | Add n8n workflow: demand forecasting | SKIP |
| TASK-077 | Add smart table suggestion in reservation form | SKIP |

---

## Phase 19 — Security Hardening (SaaS v2.0) — SKIP

> Omitida por decisión de producto. No implementar de momento.

| ID | Task | Status |
|---|---|---|
| TASK-078 | Add server-side 3-hour gap enforcement in PocketBase hook | SKIP |
| TASK-079 | Add server-side party_size vs table capacity validation in PocketBase hook | SKIP |
| TASK-080 | Add nginx rate limiting config for reservation creation endpoint | SKIP |
| TASK-081 | Document CORS configuration for production | SKIP |
| TASK-082 | Security audit: review all PocketBase collection rules for cross-tenant leaks | SKIP |

---

## Phase 20 — Billing & Subscriptions (SaaS v2.0) — SKIP

> Omitida por decisión de producto. No implementar de momento.

| ID | Task | Status |
|---|---|---|
| TASK-083 | Add `subscription_plans` and `restaurant_subscriptions` collections | SKIP |
| TASK-084 | Integrate Stripe Checkout for plan upgrades | SKIP |
| TASK-085 | Add Stripe webhook handler (subscription created/updated/cancelled) | SKIP |
| TASK-086 | Enforce plan limits in PocketBase hooks (max tables, max reservations/month) | SKIP |
| TASK-087 | Add subscription status banner in dashboard (trial ending, plan expired) | SKIP |

---

## Phase 21 — Floorplan 3D "Animal Crossing" (v2.0 Visual Overhaul) — DEPRECATED

> **ARQUITECTURA ABANDONADA** (2026-03-22)
> El enfoque Three.js/WebGL fue descartado en favor de un motor 2.5D Canvas+sprites.
> Razones: menor complejidad, mejor rendimiento en tablets, mantenimiento más sencillo.
> Ver Phase 22 para la nueva planificación.

### Sub-fase A — Infraestructura y setup (Three.js)

| ID | Task | Status |
|---|---|---|
| TASK-088 | Añadir Three.js como dependencia del frontend vía CDN ESM | DEPRECATED |
| TASK-089 | Crear `floor-plan-3d.js` — clase `FloorPlan3D` con Three.js | DEPRECATED |
| TASK-090 | Configurar escena Three.js: WebGLRenderer, OrthographicCamera, luces | DEPRECATED |
| TASK-091 | Implementar resize handler para renderer Three.js | DEPRECATED |
| TASK-092 | Flag `USE_3D_FLOOR_PLAN` en `APP_CONFIG` | DEPRECATED |

### Sub-fase B — Assets 3D (Three.js)

| ID | Task | Status |
|---|---|---|
| TASK-093 | Módulo `floor-plan-assets.js` con THREE.Group | DEPRECATED |
| TASK-094 | Suelo con BoxGeometry/PlaneGeometry | DEPRECATED |
| TASK-095 | Mesa rectangular con BoxGeometry | DEPRECATED |
| TASK-096 | Mesa redonda con CylinderGeometry | DEPRECATED |
| TASK-097 | Sillas con BoxGeometry | DEPRECATED |
| TASK-098 | Decoraciones 3D (plantas, lámparas) | DEPRECATED |
| TASK-099 | Paleta de colores para Three.js | DEPRECATED |

### Sub-fase C — Estados y animaciones (Three.js)

| ID | Task | Status |
|---|---|---|
| TASK-100 | Indicadores de estado (cilindros Three.js) | DEPRECATED |
| TASK-101 | Animación de transición con requestAnimationFrame | DEPRECATED |
| TASK-102 | Hover highlight con translateY | DEPRECATED |
| TASK-103 | Pulso en mesas `seated` | DEPRECATED |

### Sub-fase D — Interactividad (Three.js)

| ID | Task | Status |
|---|---|---|
| TASK-104 | Raycasting para detección de click | DEPRECATED |
| TASK-105 | Raycasting para hover | DEPRECATED |
| TASK-106 | Drag-and-drop 3D con proyección al plano XZ | DEPRECATED |
| TASK-107 | Tooltip flotante HTML | DEPRECATED |

### Sub-fase E — Integración (Three.js)

| ID | Task | Status |
|---|---|---|
| TASK-108 | Integración `FloorPlan3D` en `app.js` | DEPRECATED |
| TASK-109 | Verificar `refreshFloorPlan()` con Three.js | DEPRECATED |
| TASK-110 | Verificar evento `tableselect` | DEPRECATED |
| TASK-111 | Verificar evento `tablemove` | DEPRECATED |
| TASK-112 | Soporte multi-área en escena 3D | DEPRECATED |

### Sub-fase F — Rendimiento (Three.js)

| ID | Task | Status |
|---|---|---|
| TASK-113 | Optimizar geometrías con BufferGeometry | DEPRECATED |
| TASK-114 | Frustum culling | DEPRECATED |
| TASK-115 | Limitar render loop Three.js | DEPRECATED |
| TASK-116 | Fallback SVG si WebGL no disponible | DEPRECATED |
| TASK-117 | Tests para FloorPlan3D | DEPRECATED |

### Sub-fase G — Documentación (Three.js)

| ID | Task | Status |
|---|---|---|
| TASK-118 | Actualizar leyenda del floorplan | DEPRECATED |
| TASK-119 | Control de zoom/pan | DEPRECATED |
| TASK-120 | Crear `docs/FLOORPLAN_3D.md` | DEPRECATED |
| TASK-121 | Actualizar `docs/SETUP.md` para Three.js | DEPRECATED |

---

## Phase 22 — Floorplan 2.5D Isometric Engine (v2.0 Visual Overhaul)

> Sustituye el SVG 2D por un **motor isométrico 2.5D basado en Canvas + sprites**.
> Tecnología: **Canvas 2D API** — sin librerías externas, sin WebGL.
> La interfaz pública (`render`, `update`, `tableselect`, `tablemove`) no cambia.
> `app.js` no necesita modificaciones — `FloorPlan2_5D` es un drop-in replacement.
>
> **Decisión de arquitectura (2026-03-22):** Three.js descartado.
> Razones: menor complejidad, mejor rendimiento en tablets de restaurante,
> estética más coherente con sprites 2D, animaciones de personajes más sencillas.

---

### Sub-fase A — Motor 2.5D

| ID | Task | Status |
|---|---|---|
| TASK-122 | Crear `frontend/src/components/floor-plan-2_5d.js` — clase `FloorPlan2_5D` con interfaz idéntica a `FloorPlan`: `render(tables, statuses)`, `update(statuses)`, `destroy()` | DONE | 
| TASK-123 | Crear `<canvas>` y contexto 2D dentro del contenedor; implementar resize handler que escale el canvas sin distorsionar la perspectiva isométrica | DONE | 
| TASK-124 | Implementar sistema de coordenadas isométricas: funciones `worldToScreen(x, y)` y `screenToWorld(sx, sy)` para convertir entre coordenadas del modelo (pos_x, pos_y de las mesas) y píxeles en canvas | DONE | 
| TASK-125 | Implementar loop de render con `requestAnimationFrame`; render dirty-flag para no redibujar si no hay cambios | DONE | 
| TASK-126 | Implementar sistema de capas de render: 1) suelo, 2) decoraciones traseras, 3) mesas+sillas, 4) personajes, 5) indicadores de estado, 6) UI overlay | DONE | 
| TASK-127 | Añadir flag `USE_2_5D_FLOOR_PLAN: false` en `APP_CONFIG` de `index.html` y lógica en `app.js` para instanciar `FloorPlan2_5D` cuando está activo | DONE | 

---

### Sub-fase B — Sistema de sprites

> Todos los sprites se dibujan con Canvas 2D API (formas primitivas + colores).
> No se usan imágenes externas — el estilo "pixel art simplificado" se genera por código.

| ID | Task | Status |
|---|---|---|
| TASK-128 | Crear `frontend/src/utils/iso-sprites.js` — módulo central con función `drawSprite(ctx, type, x, y, options)` que despacha al dibujante correcto según `type` | DONE | 
| TASK-129 | Sprite `table-rect`: mesa rectangular isométrica dibujada con paths — tablero, laterales, patas; acepta `color` (pastel) y `capacity` | DONE | 
| TASK-130 | Sprite `table-round`: mesa redonda isométrica — elipse para el tablero, cilindro simplificado lateral | DONE |
| TASK-131 | Sprite `chair`: silla isométrica pequeña — asiento cuadrado + respaldo; se colocan N sillas alrededor de la mesa según `capacity` (posiciones predefinidas para 2, 4, 6 personas) | DONE |
| TASK-132 | Sprite `plant`: maceta isométrica — cuerpo cilíndrico marrón + esfera verde encima; decoración de ambiente | DONE |
| TASK-133 | Sprite `door`: puerta de entrada al restaurante — arco isométrico con marco; punto de spawn para personajes | DONE |
| TASK-134 | Sprite `floor-tile`: baldosa isométrica individual en color crema `#F5E6C8` con borde sutil; el suelo se construye como una rejilla de tiles | DONE |
| TASK-135 | Crear `frontend/src/utils/iso-palette.js` — constantes de color para cada tipo de sprite y función `getStatusColor(status)` → `{ free: '#4ADE80', pending: '#FCD34D', reserved: '#60A5FA', seated: '#F87171' }` | DONE |

---

### Sub-fase C — Estados visuales

| ID | Task | Status |
|---|---|---|
| TASK-136 | Dibujar indicador de estado sobre cada mesa: rombo isométrico pequeño en el color del estado actual (usa `getStatusColor`) | DONE |
| TASK-137 | Animación de cambio de estado: interpolar el color del indicador durante 400ms usando `requestAnimationFrame` y lerp de componentes RGB | DONE |
| TASK-138 | Hover highlight: cuando el cursor está sobre una mesa, dibujarla con brillo aumentado (mezcla con blanco al 20%) y offset vertical de -4px | DONE |
| TASK-139 | Efecto pulso en mesas con estado `seated`: el indicador escala entre 1.0 y 1.3 con una sinusoide de periodo 2s — llama la atención del staff | DONE |

---

### Sub-fase D — Interactividad

| ID | Task | Status |
|---|---|---|
| TASK-140 | Detección de click en mesa: hit-test AABB isométrico sobre el área de cada mesa; despachar `CustomEvent("tableselect", { detail: { table } })` — misma interfaz que SVG | DONE |
| TASK-141 | Hover: listener `pointermove` en canvas → detectar mesa bajo cursor → cambiar `cursor` a `pointer`, activar highlight, limpiar al salir | DONE |
| TASK-142 | Tooltip flotante HTML: al hacer hover, mostrar `<div>` superpuesto al canvas con nombre de mesa, capacidad y estado; posicionado con `worldToScreen` + `getBoundingClientRect` | DONE |
| TASK-143 | Drag-and-drop en modo edición: `pointerdown` + `pointermove` + `pointerup`; convertir coordenadas de pantalla a mundo con `screenToWorld`; despachar `CustomEvent("tablemove", { detail: { tableId, x, y } })` | DONE |

---

### Sub-fase E — Sistema de personajes (Tom Nook)

> Feature puramente visual. No afecta la lógica de reservas ni PocketBase.
> Un "personaje" representa a un grupo de comensales que tiene reserva próxima.

| ID | Task | Status |
|---|---|---|
| TASK-144 | Crear `frontend/src/utils/characters.js` — gestor de personajes activos: `spawnCharacter(tableId)`, `removeCharacter(tableId)`, `updateCharacters(dt)` | DONE |
| TASK-145 | Crear sprite `tom-nook` en `iso-sprites.js`: figura isométrica estilizada (cabeza circular, cuerpo rectangular, colores cálidos) — dibujada con Canvas 2D primitivos | DONE |
| TASK-146 | Animación de caminar: el personaje sigue un path desde la puerta (`door` sprite) hasta la mesa asignada; velocidad constante, interpolación lineal por segmentos | DONE |
| TASK-147 | Animación de sentarse: al llegar a la mesa, el personaje hace una animación de "encogerse" (scale 1.0 → 0.7) y queda visible junto a la mesa durante la reserva | DONE |
| TASK-148 | Lógica de spawn: en cada ciclo de `update(statuses)`, para cada mesa con estado `reserved` cuya reserva empiece en ≤ 30 minutos, llamar `spawnCharacter(tableId)` si no existe ya; llamar `removeCharacter(tableId)` cuando el estado cambie a `completed` o `cancelled` | DONE |
| TASK-149 | Integrar `updateCharacters(deltaTime)` en el loop de render principal de `FloorPlan2_5D`; los personajes se renderizan en la capa 4 (entre mesas e indicadores) | DONE |

---

### Sub-fase F — Performance

| ID | Task | Status |
|---|---|---|
| TASK-150 | Dirty-flag render: solo llamar a la función de redibujado completo cuando cambia el estado (`update`), entra/sale hover, o hay animaciones activas; usar `cancelAnimationFrame` cuando el canvas no está visible | DONE |
| TASK-151 | Sprite caching: pre-renderizar cada tipo de sprite en un `OffscreenCanvas` auxiliar y hacer `drawImage` en el canvas principal — evita recalcular paths en cada frame | DONE |
| TASK-152 | Fallback SVG: si `FloorPlan2_5D` falla al inicializarse (canvas no disponible), instanciar `FloorPlan` (SVG) automáticamente; registrar el error en consola | DONE |
| TASK-153 | Escribir tests para `FloorPlan2_5D`: mock de `CanvasRenderingContext2D`, verificar que `render()` llama a `drawSprite` para cada mesa, `update()` actualiza colores, `tableselect` se despacha al hacer click | DONE |

---

### Sub-fase G — Documentación

| ID | Task | Status |
|---|---|---|
| TASK-154 | Crear `docs/FLOORPLAN_2_5D.md`: arquitectura del motor Canvas 2D, sistema de coordenadas isométricas, catálogo de sprites, sistema de personajes, paleta de colores, guía de extensión | DONE |
| TASK-155 | Actualizar `docs/SETUP.md`: eliminar referencias a WebGL/Three.js; añadir nota sobre Canvas 2D y el flag `USE_2_5D_FLOOR_PLAN` | DONE |
| TASK-156 | Actualizar `docs/ARCHITECTURE.md`: reflejar el cambio de Three.js a Canvas 2D en la sección de frontend | DONE |
| TASK-157 | Registrar la decisión en `DECISIONS.md`: motivo del abandono de Three.js, ventajas del motor Canvas 2D, trade-offs aceptados | DONE |


---

## Phase 23 — Floor Plan 2.5D: Ambientación visual

### Espaciado y escala

| ID | Task | Status |
|---|---|---|
| TASK-158 | **Más espaciado entre mesas** — `ISO_SCALE` 0.45→0.58, `VIRT_H` 520→620, `OFFSET_Y` 55→70. | DONE |

### Modo nocturno

| ID | Task | Status |
|---|---|---|
| TASK-159 | **Paleta nocturna** — `iso-palette.js` reescrito con constantes DAY/NIGHT y `setNightMode(bool)` que muta PALETTE in-place. | DONE |
| TASK-160 | **Fondo nocturno con estrellas** — degradado cielo + 45 estrellas con parpadeo sine-wave en `#drawBackground()`. | DONE |

### Iluminación

| ID | Task | Status |
|---|---|---|
| TASK-161 | **Sprite de vela animada** — `drawCandle()` en `iso-sprites.js`: cilindro iso + pabilo + halo radial + llama bicolor animada con `Math.sin`. | DONE |
| TASK-162 | **Halo de luz en suelo** — `#drawLightHalos()` con `globalCompositeOperation="lighter"`, gradiente radial elíptico por mesa. | DONE |
| TASK-163 | **Lámparas de techo** — `drawCeilingLamp()` en iso-sprites + `#drawCeilingLamps()` en motor, posicionadas a sy-82 sobre cada mesa. | DONE |

---

## Phase 24 — Floor Plan: Rediseño Estética Animal Crossing + Sprites 3D

> **Objetivo:** Reemplazar los sprites procedurales actuales (cajas iso geométricas) por una estética
> completamente fiel a Animal Crossing: suelo de madera cálida, mesas con manteles con patrones,
> sillas con cojines, plantas frondosas multicírculo, y personajes Tom Nook renderizados desde
> el modelo 3D oficial mediante Blender MCP.
>
> **Stack:** Canvas 2D (sin cambio) + Blender 5.1 + blender-mcp (uvx) para renderizado de sprites.
> **Prerequisito:** Blender instalado, addon blender-mcp activo con MCP server corriendo en puerto 9876.

### Sprites Tom Nook con Blender MCP

| ID | Task | Status |
|---|---|---|
| TASK-164 | Descargar modelo 3D Tom Nook (Animal Crossing: New Horizons) desde The Models Resource — formato DAE+PNG textures. URL: https://models.spriters-resource.com/nintendo_switch/animalcrossingnewhorizons/asset/327341/ | PENDING |
| TASK-165 | Via Blender MCP: crear escena Blender con cámara ortográfica isométrica (rot X=60°, Z=45°, tipo Ortho, escala ~3.5), fondo transparente (RGBA), resolución render 288×384 px (6 frames de 48×64 en sprite sheet 3×2) | PENDING |
| TASK-166 | Via Blender MCP: importar modelo DAE de Tom Nook, aplicar texturas, centrar en escena, escalar a proporción chibi (cabeza ~40% del total) | PENDING |
| TASK-167 | Via Blender MCP: configurar materiales Cycles/EEVEE con cel-shading (Toon BSDF o ShaderNodeBsdfToon) y contorno negro (Freestyle lines, grosor 1.5px) — estética AC | PENDING |
| TASK-168 | Via Blender MCP: renderizar 4 frames de walk cycle rotando el modelo en Y (0°, 90°, 180°, 270° para simular pasos) + 1 frame idle + 1 frame seated (escala 0.75). Exportar cada render como PNG RGBA. | PENDING |
| TASK-169 | Componer sprite sheet: combinar los 6 PNGs en una sola imagen 288×128 px (6 frames de 48×64 en fila) usando Canvas 2D o ImageMagick | PENDING |
| TASK-170 | Mover sprite sheet a `frontend/src/assets/tom-nook-sprites.png`. Actualizar `drawCharacter()` en `iso-sprites.js` para usar `ctx.drawImage(spritesheet, srcX, 0, 48, 64, cx-24, cy-64, 48, 64)` con el frame correcto según estado y animFrame | PENDING |

### Rediseño Estético Canvas 2D

| ID | Task | Status |
|---|---|---|
| TASK-171 | **Nueva paleta AC** — Reescribir `iso-palette.js` completo con paleta día AC (suelo miel cálido, mesas pasteles saturados, terracota, crema) y paleta noche AC (azul índigo profundo, luces ámbar cálidas). Nuevos campos: `chair_cushion`, `chair_back`, `plant_pot_rim`, `plant_green_1/2/3`, `wall_color`, `floor_tile_grain`, `table_apron` | PENDING |
| TASK-172 | **Suelo de madera** — Reescribir `drawFloorTile()`: loseta iso con 2 líneas de separación de tablones (paralelas al eje diagonal, en t=1/3 y t=2/3 del tile) sobre color miel cálido. Borde de ranura entre losetas. | PENDING |
| TASK-173 | **Mesa con mantel AC** — Reescribir `drawTableRect()` y `drawTableRound()`: mantel que sobresale 4px por los bordes, rayas o lunares según `tableNumber % 3`, highlight interior (rectángulo interior más claro), patas de madera visibles en caras laterales, outline stroke negro 1px | PENDING |
| TASK-174 | **Sillas con cojín** — Reescribir `drawChairs()`: asiento base (madera oscura, isoBox pequeño), cojín encima (rounded highlight, color crema), respaldo visible en sillas norte/sur, patas como pequeños cuadrados en esquinas | PENDING |
| TASK-175 | **Plantas multicírculo AC** — Reescribir `drawPlant()`: maceta trapezoidal terracota con borde superior más claro, 5–6 círculos de follaje superpuestos (2 traseros oscuros, 2 centrales main green, 1 highlight brillante top-left), 3 puntos blancos de brillo AC | PENDING |
| TASK-176 | **Puerta AC** — Reescribir `drawDoor()`: felpudo de bienvenida delante, marco de arco redondeado, panel con tablones verticales, manija dorada, pequeño cristal con reflejo. Opcionalmente: letrero "OPEN" colgante | PENDING |
| TASK-177 | **Indicadores de estado mejorados** — Reescribir `drawStatusIndicator()`: forma circular con gradiente en lugar de rombo plano, glow suave con `ctx.shadowBlur`, símbolo interior (hoja para available, estrella para reserved, exclamación para occupied) | PENDING |
| TASK-178 | **Fondo día AC** — Añadir `#drawBackground()` para `nightMode=false`: paredes color crema cálido con zócalo inferior, ventanas con luz exterior, fondo general `#FFF8E8`. La sala debe sentirse como el interior de un restaurante AC. | PENDING |

### Integración y pulido

| ID | Task | Status |
|---|---|---|
| TASK-179 | Actualizar `floor-plan-2_5d.js`: activar `#drawBackground()` también en modo día, pasar `nightMode` al constructor, asegurar que velas y lámparas siguen funcionando con la nueva paleta | PENDING |
| TASK-180 | Actualizar `index.html` `APP_CONFIG`: añadir `AC_SPRITES: true` flag para activar personajes basados en spritesheet vs. procedural | PENDING |
| TASK-181 | Actualizar `docs/FLOORPLAN_2_5D.md` con la nueva estética, nuevas funciones de paleta, proceso de renderizado Blender MCP y formato del sprite sheet | PENDING |

