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

## Phase 18 — AI Predictions (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-075 | Add no-show probability score to reservation list (computed from customer history: no_show_count / total_reservations) | PENDING |
| TASK-076 | Add n8n workflow: demand forecasting — predict next week's busy hours from historical data | PENDING |
| TASK-077 | Add smart table suggestion in reservation form — recommend best table based on party size + availability | PENDING |

---

## Phase 19 — Security Hardening (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-078 | Add server-side 3-hour gap enforcement in PocketBase hook (`reservation-hooks.js`) | PENDING |
| TASK-079 | Add server-side party_size vs table capacity validation in PocketBase hook | PENDING |
| TASK-080 | Add nginx rate limiting config for reservation creation endpoint | PENDING |
| TASK-081 | Document CORS configuration for production (restrict to known frontend origins) | PENDING |
| TASK-082 | Security audit: review all PocketBase collection rules for cross-tenant leaks | PENDING |

---

## Phase 20 — Billing & Subscriptions (SaaS v2.0)

| ID | Task | Status |
|---|---|---|
| TASK-083 | Add `subscription_plans` and `restaurant_subscriptions` collections | PENDING |
| TASK-084 | Integrate Stripe Checkout for plan upgrades | PENDING |
| TASK-085 | Add Stripe webhook handler (subscription created/updated/cancelled) | PENDING |
| TASK-086 | Enforce plan limits in PocketBase hooks (max tables, max reservations/month) | PENDING |
| TASK-087 | Add subscription status banner in dashboard (trial ending, plan expired) | PENDING |

---

## Phase 21 — Floorplan 3D "Animal Crossing" (v2.0 Visual Overhaul)

> Sustituye el SVG 2D por un floorplan 3D isométrico con estética caricaturesca cálida.
> La lógica de negocio (reservas, estados de mesa, gap de 3h, etc.) NO cambia.
> Tecnología elegida: **Three.js** (ver DECISIONS.md para el razonamiento).

### Sub-fase A — Infraestructura y setup

| ID | Task | Status |
|---|---|---|
| TASK-088 | Añadir Three.js como dependencia del frontend vía CDN ESM (`https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js`) — sin build step | PENDING |
| TASK-089 | Crear `frontend/src/components/floor-plan-3d.js` — clase `FloorPlan3D` con la misma interfaz pública que `FloorPlan` (métodos `render(tables, statuses)` y `update(statuses)`) para ser un drop-in replacement | PENDING |
| TASK-090 | Configurar escena Three.js: `WebGLRenderer`, `Scene`, cámara isométrica ortográfica (OrthographicCamera), luz ambiental + luz direccional suave con sombras desactivadas (rendimiento) | PENDING |
| TASK-091 | Implementar resize handler: el renderer se adapta al contenedor sin distorsionar la perspectiva isométrica | PENDING |
| TASK-092 | Añadir flag de feature en `APP_CONFIG` (`USE_3D_FLOOR_PLAN: true`) para poder alternar entre SVG 2D y 3D sin borrar código | PENDING |

### Sub-fase B — Assets 3D (geometrías y materiales)

| ID | Task | Status |
|---|---|---|
| TASK-093 | Crear módulo `frontend/src/utils/floor-plan-assets.js` — funciones que devuelven `THREE.Group` para cada tipo de objeto | PENDING |
| TASK-094 | Diseñar suelo (`createFloor`): plano con textura de baldosas cálidas (color crema/arena), bordes redondeados simulados con segmentos extra. Sin imagen externa — color flat `#F5E6C8` | PENDING |
| TASK-095 | Diseñar mesa rectangular (`createRectTable`): cuerpo BoxGeometry redondeado (usando `RoundedBoxGeometry` de three-stdlib o aproximación con CylinderGeometry para las patas), mantel plano encima en color pastel (rojo vino, azul marino, verde oliva — rotación por número de mesa mod 3) | PENDING |
| TASK-096 | Diseñar mesa redonda (`createRoundTable`): CylinderGeometry para el tablero, pata central, mantel circular (TorusGeometry plano o disco) | PENDING |
| TASK-097 | Diseñar silla (`createChair`): cuerpo pequeño BoxGeometry + respaldo, colocadas alrededor de la mesa según `capacity` (2, 4, 6 sillas en posiciones predefinidas) | PENDING |
| TASK-098 | Diseñar decoraciones de ambiente (`createDecoration`): maceta con planta (CylinderGeometry marrón + SphereGeometry verde), lámpara de techo (ConeGeometry), cuadro en la pared — objetos opcionales para rellenar el espacio vacío del restaurante | PENDING |
| TASK-099 | Crear paleta de colores Animal Crossing en `frontend/src/utils/floor-plan-colors.js`: colores de suelo, mesas, sillas, decoraciones y los 3 estados (libre/pendiente/ocupada) con valores HEX fijos y función `getStatusColor(status)` | PENDING |

### Sub-fase C — Estados y animaciones

| ID | Task | Status |
|---|---|---|
| TASK-100 | Implementar sistema de estado visual: cada mesa tiene un `indicador` (pequeño cilindro o esfera encima) que cambia de color según el estado — verde `#4ADE80`, amarillo `#FCD34D`, rojo `#F87171` | PENDING |
| TASK-101 | Implementar animación de transición de estado: cuando `update(statuses)` cambia el color del indicador, interpolar suavemente con GSAP (CDN ESM) o con un loop `requestAnimationFrame` manual (preferir sin deps extra) | PENDING |
| TASK-102 | Implementar hover highlight: al pasar el ratón sobre una mesa, elevarla ligeramente (translateY +2 unidades) y aclarar el color del mantel — efecto de "levitar" suave | PENDING |
| TASK-103 | Implementar efecto de pulso en mesas con estado `seated` (rojo): el indicador hace un pulso de escala (1.0 → 1.3 → 1.0) cada 2 segundos para llamar la atención del staff | PENDING |

### Sub-fase D — Interactividad

| ID | Task | Status |
|---|---|---|
| TASK-104 | Implementar raycasting para detección de click en mesas: `THREE.Raycaster` + listener `click` en el canvas → despachar evento `CustomEvent("tableselect", { detail: { table } })` igual que en el SVG actual | PENDING |
| TASK-105 | Implementar raycasting para hover: listener `pointermove` → cambiar cursor a `pointer` al pasar sobre una mesa, restaurar a `default` al salir | PENDING |
| TASK-106 | Implementar drag-and-drop 3D en modo edición: `pointerdown` + `pointermove` + `pointerup` con proyección de coordenadas 3D al plano XZ del suelo → actualizar posición de la mesa y despachar `CustomEvent("tablemove", { detail: { tableId, x, y } })` | PENDING |
| TASK-107 | Añadir tooltip flotante HTML (no Three.js) al hacer hover sobre una mesa: nombre de mesa, capacidad, estado — posicionado via `getBoundingClientRect` del canvas + coordenadas proyectadas | PENDING |

### Sub-fase E — Integración con lógica existente

| ID | Task | Status |
|---|---|---|
| TASK-108 | Modificar `app.js`: si `APP_CONFIG.USE_3D_FLOOR_PLAN`, instanciar `FloorPlan3D` en lugar de `FloorPlan` — el resto del código de `app.js` no cambia (misma interfaz) | PENDING |
| TASK-109 | Verificar que `refreshFloorPlan()` sigue funcionando: `getFloorPlanStatus()` devuelve los mismos datos, `FloorPlan3D.update()` los consume correctamente | PENDING |
| TASK-110 | Verificar que el evento `tableselect` abre el modal de detalle de mesa igual que en 2D | PENDING |
| TASK-111 | Verificar que el evento `tablemove` guarda la posición correctamente en PocketBase | PENDING |
| TASK-112 | Añadir soporte multi-área en la escena 3D: zonas `indoor`, `terraza` y `barra` separadas por divisores visuales (bajo muro o cambio de textura de suelo), con label flotante de área en HTML superpuesto al canvas | PENDING |

### Sub-fase F — Rendimiento y calidad

| ID | Task | Status |
|---|---|---|
| TASK-113 | Optimizar geometrías: usar `BufferGeometry` siempre, compartir materiales entre mesas del mismo tipo (`MeshLambertMaterial` compartido por color — no crear uno por instancia) | PENDING |
| TASK-114 | Implementar frustum culling automático (Three.js lo hace por defecto) y verificar que mesas fuera de pantalla no impactan el render | PENDING |
| TASK-115 | Limitar el render loop: usar `renderer.setAnimationLoop(null)` cuando no hay animaciones activas; activar el loop solo durante transiciones de estado o hover | PENDING |
| TASK-116 | Añadir fallback: si WebGL no está disponible (contexto perdido o dispositivo antiguo), mostrar el floorplan SVG 2D automáticamente | PENDING |
| TASK-117 | Escribir tests para `FloorPlan3D`: mock de Three.js, verificar que `render()` crea los objetos correctos, `update()` cambia colores, `tableselect` se despacha | PENDING |

### Sub-fase G — UX y documentación visual

| ID | Task | Status |
|---|---|---|
| TASK-118 | Actualizar la leyenda del floorplan en `index.html`: reemplazar los `legend-dot` 2D por pequeñas esferas SVG inline con los colores del sistema 3D | PENDING |
| TASK-119 | Añadir control de zoom/pan: rueda del ratón para zoom (escalar cámara ortográfica) y arrastrar con botón central para paneo — solo en modo vista, no edición | PENDING |
| TASK-120 | Crear `docs/FLOORPLAN_3D.md` — documentación técnica completa: arquitectura de la escena, catálogo de assets, paleta de colores, decisiones de diseño, guía de extensión para añadir nuevos objetos | PENDING |
| TASK-121 | Actualizar `docs/SETUP.md` con instrucciones para el floorplan 3D: requisito de WebGL, nota sobre Three.js CDN, cómo alternar entre 2D y 3D | PENDING |
