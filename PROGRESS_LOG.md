# PROGRESS_LOG.md — Chronological Development Log

Append a new entry at the bottom after every development session.
Format: `## [YYYY-MM-DD] Session title`

---

## [2026-03-21] Phase 1 & 2 — Project Initialization

**Agent:** Claude Sonnet 4.6
**Tasks completed:** TASK-001, TASK-002, TASK-003

### What was done

- Created full repository folder structure:
  `docs/`, `frontend/src/components/`, `frontend/src/services/`, `frontend/src/utils/`,
  `frontend/styles/`, `backend/pocketbase/migrations/`, `backend/pocketbase/hooks/`,
  `automations/n8n/`, `tests/`, `seed/`

- Created all persistent context files:
  `CLAUDE.md`, `MEMORY.md`, `PROJECT_STATUS.md`, `TASK_QUEUE.md`, `PROGRESS_LOG.md`, `DECISIONS.md`

- Created documentation files:
  `docs/ARCHITECTURE.md`, `docs/DATABASE_SCHEMA.md`, `docs/DEVELOPMENT_ROADMAP.md`,
  `docs/SETUP.md`, `docs/AGENT_WORKFLOW.md`

- Created `README.md`

- Populated `TASK_QUEUE.md` with 33 tasks across 10 phases

### Decisions made

- Chose project name: **TableFlow**
- Confirmed tech stack: PocketBase + n8n + Vanilla JS + SVG
- Defined seed data scope: 1 restaurant, 10 tables, 5 customers, 8 reservations

### Next session should start at

**TASK-004** — Write PocketBase migration files

---

## [2026-03-21] Phase 4 — PocketBase Setup

**Agent:** Claude Sonnet 4.6
**Tasks completed:** TASK-004, TASK-005, TASK-006

### What was done

- Created 5 PocketBase JS migration files in `backend/pocketbase/migrations/`:
  - `1711018200_create_restaurants.js`
  - `1711018201_create_tables.js`
  - `1711018202_create_customers.js`
  - `1711018203_create_reservations.js`
  - `1711018204_create_reservation_logs.js`
  Each migration defines fields, types, constraints, and SQL indexes. Down migrations (drop collection) are included.

- Created `backend/pocketbase/hooks/reservation-hooks.js`:
  - `onRecordAfterCreateSuccess` — writes "created" log entry on new reservation
  - `onRecordAfterUpdateSuccess` — writes "updated"/"cancelled"/"table_assigned" log on field change
  - `onRecordAfterUpdateSuccess` — increments `customer.visit_count` when reservation status → "completed"

- Created `seed/seed.js`:
  - Uses the `pocketbase` npm SDK
  - Clears existing data before inserting (idempotent)
  - Creates: 1 restaurant (La Terraza), 10 tables with SVG-ready x/y coordinates, 5 customers, 8 reservations with varied statuses and relative dates

### Decisions made

None new — all within previously defined schema.

### Next session should start at

**TASK-007** — Create `frontend/src/services/api.js` (base HTTP client)

---

## [2026-03-21] Phase 5 — Frontend Service Layer

**Agent:** Claude Sonnet 4.6
**Tasks completed:** TASK-007, TASK-008, TASK-009, TASK-010, TASK-011

### Design session

Before coding, a full architectural plan was produced covering:
- Uniform `ApiResult<T>` envelope — no exceptions thrown by service functions
- Strict separation: services do zero DOM manipulation
- JSDoc `@typedef` for all domain types (no TypeScript, full editor support)
- Auth token stored at module level in `api.js`, injected via `setAuthToken()`
- PocketBase filter string construction via `buildFilter(clauses)` pattern
- Overlap detection workaround for `getTableAvailability` (PocketBase cannot do datetime arithmetic in filters)

### What was done

**`frontend/src/types.js`**
- JSDoc typedefs for `ApiError`, `ApiResult<T>`, `PbListResult<T>`
- Domain types: `Restaurant`, `Table`, `Customer`, `Reservation`, `ReservationLog`
- View-model types: `TableAvailability`, `TableSuggestion`
- Auxiliary union types: `TableShape`, `TableArea`, `TableStatus`, `ReservationStatus`, `ReservationSource`

**`frontend/src/services/api.js`**
- `initClient(baseUrl)` — set PocketBase URL at startup
- `setAuthToken(token)` / `getAuthToken()` — auth state management
- `request(method, path, options)` — core fetch wrapper with 15s timeout (AbortController), 204 guard, PocketBase error normalisation
- `get`, `post`, `patch`, `del` — thin verb helpers
- All errors returned as `{ success: false, error: ApiError }` — never thrown

**`frontend/src/services/reservations.js`**
- `listReservations(restaurantId, options)` — dynamic filter builder for date, status, tableId
- `getReservation(id, expand)` — expand defaults to "table_id,customer_id"
- `createReservation`, `updateReservation`, `deleteReservation`
- `updateStatus(id, status)` — local enum validation before network call
- `assignTable(reservationId, tableId)` — convenience wrapper
- `getReservationsForTable(tableId, from, to)` — used by availability checker

**`frontend/src/services/tables.js`**
- `listTables`, `getTable`, `createTable`, `updateTable`, `updateTablePosition`, `deleteTable`
- `getTableAvailability(restaurantId, slotStart, slotEnd)` — two-step query (fetch tables + fetch conservative reservation superset) with precise JS-side overlap check

**`frontend/src/services/customers.js`**
- `listCustomers` with full-text `~` search across name/email/phone (with `"` escaping)
- `findByPhone`, `findByEmail` — return `null` (not error) when not found
- `createCustomer` — auto-injects `restaurant_id`
- `updateCustomer`, `deleteCustomer`
- `getReservationHistory` — CRM concern, queries reservations collection

**`frontend/src/utils/table-assignment.js`**
- `suggestTables(tables, availability, partySize, options)` — Best Fit algorithm
- `getBestTable(...)` — convenience wrapper returning first suggestion or null
- `isTableAvailable(tableId, availability)` — lookup helper
- `computeTableStatus(tableId, availability)` → `'available'|'reserved'|'occupied'`
- Area preference implemented as fractional score bonus (0.5) — breaks ties only

### Next session should start at

**TASK-012** — `frontend/src/components/floor-plan.js` (SVG floor plan renderer)

---

## [2026-03-21] Phase 6 — Floor Plan Rendering

**Agent:** Claude Sonnet 4.6
**Tasks completed:** TASK-012, TASK-013, TASK-014, TASK-015

### What was done

**`frontend/src/components/floor-plan.js`** — `FloorPlan` class:

- `constructor(containerEl, options)` — creates the SVG, appends it to the container
  - Builds SVG structure: background rect, indoor/outdoor divider line, area labels, tables group, legend
- `render(tables, availability)` — full re-render: clears and rebuilds all table SVG elements
- `update(availability)` — updates only fill colors without recreating elements (for real-time refreshes)
- `highlight(tableId|null)` — adds/removes `.floor-plan__table--highlighted` CSS class
- `destroy()` — removes SVG from DOM

**Table shapes:**
- `rectangle` / `square` → `<rect>` with rounded corners (`rx 4` for square, `rx 8` for rectangle)
- `circle` → `<circle>` using center derived from `pos_x + width/2`, `pos_y + height/2`
- Each table group shows table number and capacity label as SVG `<text>` elements

**Status colors (TASK-013):**
- `available` → `#22c55e` (green)
- `reserved`  → `#eab308` (yellow)
- `occupied`  → `#ef4444` (red)
- Applied via `shape.setAttribute("fill", ...)` — also controlled in CSS via `--color-*` tokens

**Click handler (TASK-014):**
- Click or Enter/Space on table group → dispatches `CustomEvent("tableselect")` on container
- `detail: { table, status }` — no reservation logic in the component
- Accessible: `role="button"`, `tabindex="0"`, `aria-label` includes status text

**Drag-and-drop (TASK-015):**
- Opt-in via `options.draggable = true`
- Uses Pointer Events API (`pointerdown/move/up/cancel`) — works for mouse and touch
- Drag constrained to canvas bounds (800×500)
- `pointercancel` handled to prevent stuck drag state
- On `pointerup` dispatches `CustomEvent("tablemove")` with `{ tableId, x, y }` for persistence
- Updates `table.pos_x / pos_y` locally so subsequent renders use the new position
- `cursor: grab` / `cursor: grabbing` feedback

**`frontend/styles/floor-plan.css`:**
- CSS custom properties for status colors
- Hover: `filter: brightness(0.88)` on shape
- Focus-visible: blue stroke ring for keyboard navigation
- Highlighted: blue drop-shadow + thick stroke
- Dragging: `opacity: 0.85` + drop-shadow + `cursor: grabbing`
- Legend swatches use CSS classes mapped to `--color-*` tokens

### Next session should start at

**TASK-016** — App shell `frontend/index.html`

---

## [2026-03-21] Phases 7–10 — Full Implementation (Autonomous)

**Agent:** Claude Sonnet 4.6
**Tasks completed:** TASK-016 through TASK-033 (all remaining tasks)
**Mode:** Autonomous (no user prompts between tasks — self-evaluated and continued)

### Phase 7 — Dashboard UI

**`frontend/styles/main.css`**
- CSS custom properties for all design tokens (colors, spacing, typography, radius, shadows)
- App layout: sticky header, tab navigation, main content area
- Full component library: buttons (primary/secondary/danger/ghost/sm), form controls, cards, data table, status badges, modal, toasts, spinner, empty states
- Accessibility: focus-visible styles, sr-only utility

**`frontend/index.html`**
- Semantic HTML: header with tab nav, 3 tab panels (floor-plan, reservations, customers)
- Floor plan tab: datetime/duration/party-size controls + floor plan container + suggestions sidebar
- Reservations tab: date/status filters + new reservation button + list container
- Customers tab: search input + new customer button + list container
- Two modal dialogs (reservation, customer) with accessible `role="dialog"` and `aria-modal`
- Toast container with `aria-live="polite"`
- `window.APP_CONFIG` script block for runtime configuration without a build step

**`frontend/src/utils/html.js`**
- `escHtml(value)` — XSS-safe HTML entity escaping for all user data in innerHTML
- `formatDateTime(isoString)` — Intl.DateTimeFormat wrapper
- `toDateTimeInput(isoString)` — ISO → datetime-local input value
- `nowRounded()` — current time rounded to next 30-minute mark for default datetime

**`frontend/src/components/reservation-form.js`** — `ReservationForm` class
- `open(container, defaults)` — renders form (create or edit mode), loads tables dropdown
- `save(container)` → validates → calls API → dispatches `reservationsaved`
- Auto-links or auto-creates customer record from phone/email
- Local validation with per-field error messages; global error area for API errors

**`frontend/src/components/reservation-list.js`** — `ReservationList` class
- `render(container, filters)` — loads and renders reservations table
- Inline status transition buttons based on `STATUS_TRANSITIONS` map
- Dispatches `reservationedit` and `reservationdelete` events for parent to handle
- Single-row re-render on status change (no full table rebuild)

**`frontend/src/components/customer-form.js`** — `CustomerForm` class
- `open(container, defaults)` — renders customer form
- `renderList(container, search)` — renders customers table with edit/delete actions
- `save(container)` → validates → calls API → dispatches `customersaved`

**`frontend/src/app.js`** — Application orchestrator
- `init()`: calls `initClient`, loads first restaurant automatically, wires all components
- Tab navigation with lazy loading (reservations/customers load on first tab switch)
- Floor plan tab: loads tables, initializes FloorPlan, handles `tableselect` → opens reservation modal pre-filled with table + datetime
- Drag-and-drop: handles `tablemove` → calls `updateTablePosition`
- `checkAvailability()`: calls `getTableAvailability`, updates floor plan colors, renders suggestions
- Reservation modal: open/close/save lifecycle with loading state
- Customer modal: open/close/save lifecycle
- `showToast(message, type, duration)` — animated toast notifications with auto-dismiss
- `setGlobalLoading(bool)` — header spinner

### Phase 8 — n8n Workflows

All 4 workflows exported as importable JSON to `automations/n8n/`:

- **`reservation-confirmation.json`**: PocketBase webhook → filter for new reservations → prepare email content (plain + HTML) → send via SMTP → log `confirmation_sent` in PocketBase
- **`24h-reminder.json`**: Schedule trigger (every hour) → query PocketBase for confirmed reservations in 23–25h window → split into items → filter those with email → send reminder → log `reminder_sent`
- **`incoming-message-handler.json`**: Incoming message webhook → normalize across channels (email/SMS/WhatsApp) → call AI classifier → if `new_reservation` → create in PocketBase → respond to sender
- **`ai-classifier.json`**: Webhook → build system prompt with today's date → call OpenAI gpt-4o-mini with `json_object` response format → parse + validate response → return structured JSON

### Phase 9 — AI Integration

**`frontend/src/services/ai-classifier.js`**
- `classifyMessage(message, meta)` → calls n8n webhook → returns `ApiResult<ClassificationResult>`
- 30s timeout with AbortController; maps network errors and HTTP errors to consistent ApiResult
- `classificationToReservation(result)` → maps classifier output to `Partial<Reservation>` for form pre-filling

### Phase 10 — Tests (verified)

**`tests/table-assignment.test.js`** — 22 tests, all passing ✓
- Covers: empty returns, exact fit, spare seats, sort order, tie-breaking, area preference, inactive exclusion, unavailable exclusion
- `getBestTable`, `isTableAvailable`, `computeTableStatus` each fully covered

**`tests/api.test.js`** — fetch-mock integration tests
- URL construction, query params, auth header, JSON body, 200/204/400 responses
- Network error (status 0), timeout (status 408)
- Query param omission for undefined/null values
- `updateStatus` local validation + valid status values
- `findByPhone` not-found and found paths

**`tests/automations.test.js`**
- `classifyMessage`: empty guard, payload structure, HTTP error, network error
- `classificationToReservation`: full mapping, null field defaults
- Reservation hook logic: changed-field detection algorithm, event type determination (pure function tests)

### Project status at end of session

All 33 tasks DONE. Repository is complete at v1.0.

### Next steps (future sessions)

See `docs/DEVELOPMENT_ROADMAP.md` — Future Roadmap section.

---

## [2026-03-21] SaaS Pivot — Architecture Planning & Full Audit

**Agent:** Claude Sonnet 4.6
**Tasks completed:** SaaS audit + architecture documentation (no code changes)

### What was done

#### v1.0 Audit

Performed a complete audit of the v1.0 codebase covering security, UX, logic, and performance:

**Security gaps identified:**
- No authentication layer — any URL visitor can read/write all data
- PocketBase collection rules not configured (open by default)
- 3-hour gap validation is client-side only (race conditions possible)
- No server-side party_size vs table capacity validation

**UX issues identified:**
- Mixed Spanish/English UI (inconsistent language)
- `setGlobalLoading()` defined but never called (dead code)
- No mobile-responsive layout
- Reservation list has no pagination (hardcoded perPage: 50)

**Logic issues:**
- `duration_minutes` hardcoded to 90 — not configurable per restaurant
- Customer deduplication has race condition in concurrent creation
- Floor plan uses 60s polling instead of real-time SSE

All issues documented in `CLAUDE.md` under "Known Issues & Technical Debt".

#### Architecture Documentation (SaaS v2.0)

- **`docs/ARCHITECTURE.md`** — Fully rewritten with multi-tenant SaaS architecture:
  - v1.0 vs v2.0 comparison table
  - Multi-tenancy model (row-level via restaurant_id)
  - New collections: `users`, `restaurant_settings`, `subscription_plans`, `restaurant_subscriptions`
  - Data flow: reservation creation with SSE notification
  - Data flow: public booking widget
  - Security model with collection rule examples
  - Scalability path (1 → 1000+ restaurants)
  - Mermaid architecture diagram

- **`CLAUDE.md`** — Updated with:
  - SaaS strategic vision
  - v2.0 features list
  - Known issues & technical debt
  - SaaS architecture decisions table

- **`TASK_QUEUE.md`** — Added 45 new tasks across 9 new phases (12–20):
  - Phase 12: Authentication & Access Control (TASK-043 to TASK-048)
  - Phase 13: Restaurant Onboarding Wizard (TASK-049 to TASK-054)
  - Phase 14: Editable Floor Plan (TASK-055 to TASK-059)
  - Phase 15: Real-time SSE (TASK-060 to TASK-063)
  - Phase 16: Analytics Dashboard (TASK-064 to TASK-069)
  - Phase 17: Public Booking Widget (TASK-070 to TASK-074)
  - Phase 18: AI Predictions (TASK-075 to TASK-077)
  - Phase 19: Security Hardening (TASK-078 to TASK-082)
  - Phase 20: Billing & Subscriptions (TASK-083 to TASK-087)

- **`DECISIONS.md`** — Added 3 new architectural decisions:
  - Row-level multi-tenancy (vs schema-per-tenant)
  - Replace polling with PocketBase SSE
  - Per-restaurant settings collection

- **`docs/SAAS_ONBOARDING.md`** — New file: complete guide for restaurant self-service onboarding:
  - 5-step wizard flow
  - Default configuration values
  - PocketBase collection rule examples
  - Multi-tenant isolation guarantee

- **`PROJECT_STATUS.md`** — Updated to reflect v2.0 planning complete, TASK-043 is next.

### Decisions made

- **Multi-tenancy model:** Row-level via `restaurant_id` (no schema changes needed)
- **Auth:** PocketBase native users + JWT, `restaurant_id` field on users collection
- **Realtime:** PocketBase SSE replaces 60s polling
- **Business rules:** Must be moved to PocketBase hooks for server-side enforcement
- **UI language:** Standardize to Spanish (es-ES) — target market is Spanish-speaking restaurants

### Next session should start at

**TASK-043** — Add `users` collection to PocketBase with role field and restaurant_id relation

---

## [2026-03-22] Phase 21 — Floorplan 3D "Animal Crossing" (planificación)

**Agent:** Claude Sonnet 4.6
**Tasks completed:** Planificación y documentación del floorplan 3D (sin implementación de código)

### What was done

- **`docs/FLOORPLAN_3D.md`** — Nuevo documento de diseño técnico completo:
  - Visión y principios visuales estilo Animal Crossing
  - Paleta de colores completa (suelo, mesas, sillas, decoraciones, estados)
  - Arquitectura técnica: Three.js vía CDN ESM, clase FloorPlan3D con misma interfaz que FloorPlan SVG
  - Configuración de escena: cámara isométrica ortográfica, iluminación cálida, MeshLambertMaterial compartido
  - Catálogo de assets: mesa rect, mesa redonda, silla, planta, lámpara (con geometrías específicas)
  - Sistema de coordenadas: mapeo x/y PocketBase → unidades Three.js (SCALE=0.025)
  - Raycasting para click y hover
  - Animaciones: transición de color, pulso en mesas ocupadas, hover lift
  - Render loop bajo demanda (no continuo) para rendimiento
  - Fallback automático a SVG 2D si WebGL no disponible
  - Checklist de implementación en orden sugerido

- **`TASK_QUEUE.md`** — Phase 21 añadida (TASK-088 a TASK-121, 34 tareas):
  - Sub-fase A: Infraestructura y setup (TASK-088-092)
  - Sub-fase B: Assets 3D — geometrías y materiales (TASK-093-099)
  - Sub-fase C: Estados y animaciones (TASK-100-103)
  - Sub-fase D: Interactividad — raycasting, hover, drag-and-drop (TASK-104-107)
  - Sub-fase E: Integración con lógica existente (TASK-108-112)
  - Sub-fase F: Rendimiento y calidad (TASK-113-117)
  - Sub-fase G: UX y documentación visual (TASK-118-121)

- **`DECISIONS.md`** — Decisión añadida: Three.js para floorplan 3D (con comparativa de alternativas)

- **`CLAUDE.md`** — Sección "Floorplan 3D Animal Crossing" añadida con resumen de tecnología, estética e integración

- **`docs/SETUP.md`** — Sección añadida con instrucciones para activar el floorplan 3D

### Decisions made

- **Three.js** elegido sobre Babylon.js, Pixi.js y CSS 3D transforms (ver DECISIONS.md)
- **Interfaz idéntica** a FloorPlan SVG — drop-in replacement sin tocar app.js
- **Flag `USE_3D_FLOOR_PLAN`** en APP_CONFIG para transición gradual
- **MeshLambertMaterial** (no MeshStandardMaterial) para rendimiento con estética flat
- **Render loop bajo demanda** — no frame continuo
- **Sin build step** — Three.js vía CDN importmap, coherente con stack vanilla JS

### Next session should start at

**TASK-088** — Añadir Three.js CDN + importmap en index.html y crear estructura base de FloorPlan3D

---

## [2026-03-22] Phase 12 — Authentication & Access Control

**Agent:** Claude Sonnet 4.6
**Tasks completed:** TASK-043, TASK-044, TASK-045, TASK-046, TASK-047, TASK-048 + TASK-049 (restaurant_settings)

### What was done

#### Backend — Migraciones PocketBase

**`backend/pocketbase/migrations/1774300000_add_auth_fields_to_users.js`**
- Añade `role` (select: superadmin|restaurant_admin|staff) y `restaurant_id` (relation → restaurants) a la colección `users` nativa de PocketBase
- Idempotente: comprueba si los campos ya existen antes de añadirlos
- Configura auth collection rules: viewRule/updateRule restringido a `@request.auth.id = id`; listRule solo para superadmin o propio usuario

**`backend/pocketbase/migrations/1774300001_create_restaurant_settings.js`**
- Nueva colección `restaurant_settings` (uno por restaurante)
- Campos: timezone, default_duration_minutes (15-480), min_gap_minutes (0-480), opening_time, closing_time, logo_url, primary_color, booking_widget_enabled, booking_widget_token
- Índice único por restaurant_id
- Auth rules: lectura solo para usuarios del mismo restaurante; escritura solo para restaurant_admin/superadmin

**`backend/pocketbase/migrations/1774300002_enforce_collection_rules_auth.js`**
- Aplica reglas de aislamiento de tenant a TODAS las colecciones existentes:
  `restaurants`, `tables`, `customers`, `reservations`, `reservation_logs`
- Patrón READ: `@request.auth.id != "" && (superadmin || @request.auth.restaurant_id = restaurant_id)`
- Patrón CREATE: valida que restaurant_id del body === restaurant_id del token
- Patrón DELETE: solo restaurant_admin o superadmin
- `restaurants` tiene regla especial: el restaurant_id del usuario debe = id del registro

#### Frontend — Servicio de autenticación

**`frontend/src/services/auth.js`** (nuevo)
- `login(email, password)` → POST `/api/collections/users/auth-with-password`, guarda sesión en localStorage (`tf_auth`)
- `logout()` → limpia sesión, token y localStorage
- `restoreSession()` → lee `tf_auth` de localStorage, restaura token en api.js; retorna boolean
- `isAuthenticated()`, `getCurrentUser()`, `getCurrentRestaurantId()`

**`frontend/src/services/api.js`** (modificado)
- En respuesta 401: limpia `_authToken`, elimina `tf_auth` de localStorage, dispara `window.dispatchEvent(new CustomEvent("tf:sessionexpired"))`

#### Frontend — Página de login

**`frontend/src/pages/login.js`** (nuevo)
- Clase `LoginPage` con método `render(container)`
- Formulario: email + password, validación básica, loading state
- En éxito: dispara `CustomEvent("loginsuccess")` en el container
- Mensajes de error en español; 400 → "Email o contraseña incorrectos"

#### Frontend — Integración en app.js

- `boot()` reemplaza a `init()` como punto de entrada en `DOMContentLoaded`
- `restoreSession()` → si ok, llama `init()` directamente; si no, muestra login overlay
- `showLoginOverlay()` → oculta `#app`, muestra `#login-overlay`, instancia `LoginPage`, escucha `loginsuccess`
- `_showUserInHeader(user)` → muestra email del usuario y botón "Cerrar sesión" en el header
- Logout: `logout()` + `location.reload()`
- `window.addEventListener("tf:sessionexpired", ...)` → toast de sesión expirada + re-show login

#### Frontend — HTML y CSS

**`index.html`**: añadido `<div id="login-overlay" hidden>` antes del `#app` + botón "Cerrar sesión" y `#header-user-name` en el header

**`main.css`**: añadidos estilos `.login-overlay`, `.login-card`, `.login-form`, `.btn--full`, `.btn--sm`, `.app-header__user`

#### Tests

**`tests/auth.test.js`** (nuevo) — 15 tests:
- `login()` success/failure/network error
- `logout()` limpia sesión completa
- `restoreSession()` casos: valid, empty, corrupt JSON, missing token
- API 401: event fired, token cleared, localStorage cleared, fail result returned

### Decisions made

- `window` y `localStorage` usados directamente (sin abstracción) — el código solo corre en browser
- La contraseña nunca se almacena — solo el JWT token
- `location.reload()` en logout — forma más simple de reiniciar estado de la aplicación
- `restaurant_id` en `users` es nullable para que superadmin pueda existir sin restaurante

### Next session should start at

**TASK-050** — Crear página de registro de restaurante (restaurant_admin puede crear su cuenta y restaurante)

---

## [2026-03-22] Phase 13 — Restaurant Onboarding Wizard

**Agent:** Claude Sonnet 4.6
**Tasks completed:** TASK-050, TASK-051, TASK-052, TASK-053

### What was done

#### Backend

**`backend/pocketbase/hooks/registration-hooks.js`** (nuevo)
- Custom route `POST /api/custom/register` — corre como superadmin (bypasa collection rules)
- Acepta: email, password, restaurantName
- Valida: campos requeridos, longitud password, formato email, email duplicado
- Crea atómicamente: usuario (restaurant_admin) + restaurante (slug auto-generado) + restaurant_settings con defaults
- Devuelve: token JWT + record del usuario + record del restaurante
- Contraseña nunca persiste — solo el hash de PocketBase

#### Frontend — Servicios

**`frontend/src/services/settings.js`** (nuevo)
- `loadSettings(restaurantId, force?)` — fetch + cache en módulo; fallback a defaults si falla
- `saveSettings(settingsId, data)` — PATCH + actualiza cache
- `createDefaultSettings(restaurantId)` — POST para restaurantes recién creados
- Getters síncronos: `getDurationMinutes()`, `getGapMinutes()`, `getTimezone()`, `getOpeningTime()`, `getClosingTime()`, `getPrimaryColor()`
- Fallbacks: 90 min duración, 180 min gap, "Europe/Madrid", "13:00", "23:30", "#6366f1"

#### Frontend — Páginas

**`frontend/src/pages/register.js`** (nuevo)
- Clase `RegisterPage` — formulario: nombre restaurante + email + password
- Llama a `POST /api/custom/register` directamente (no via api.js — endpoint público)
- En éxito: guarda sesión en localStorage, setAuthToken, dispara `registersuccess`
- Enlace "Ya tienes cuenta → Iniciar sesión" despacha `showlogin`
- Mensajes de error en español (409 = email duplicado)

**`frontend/src/pages/onboarding.js`** (nuevo)
- Clase `OnboardingWizard(restaurantId)` con barra de progreso visual
- Paso 1: añadir mesas — formulario con número, capacidad, zona, forma; lista de mesas pendientes con opción de eliminar; botón "Añadir mesas después" para saltar
- Paso 2: configuración — horario apertura/cierre, duración reserva, gap entre reservas, color principal (color picker)
- Al completar: despacha `onboardingcomplete`
- Posiciones de mesas en grid automático (4 columnas, 120×100px separación)

#### Frontend — Integración en app.js

- `boot()` ahora llama `loadSettings()` + `_applyBranding()` antes de `init()` cuando hay sesión
- Si usuario autenticado pero sin `restaurant_id` → `showOnboarding(user)`
- Login exitoso → si sin restaurante, va a onboarding; si tiene restaurante, va a dashboard
- Registro exitoso → directamente a onboarding (sin pasar por login)
- `_applyBranding()` aplica `--color-brand` CSS variable con el color del restaurante
- Enlace "Registrarse" en login despacha `showregister`; "Iniciar sesión" en register despacha `showlogin`

#### TASK-053 — Hardcoded values eliminados

- `reservation-form.js`: `duration_minutes: 90` → `getDurationMinutes()`
- `reservation-form.js`: `GAP_MS = 3 * 60 * 60 * 1000` → `getGapMinutes() * 60_000`
- `reservation-form.js`: error message ahora muestra los minutos configurados
- `tables.js`: `in3hMs = nowMs + 3h` → `nowMs + getGapMinutes() * 60_000`
- `tables.js`: `duration_minutes ?? 90` → `duration_minutes ?? getDurationMinutes()`

#### CSS

`main.css` — añadidos estilos: `.onboarding-progress`, `.onboarding-progress__bar`, `.onboarding-table-list`, `.onboarding-table-row`, `.onboarding-add-table-form`, `.btn-icon`, `.btn-link`, `.form-hint`

### Decisions made

- El registro usa un hook PocketBase custom route en lugar de llamadas encadenadas desde el frontend — evita el chicken-and-egg problem de crear un restaurante antes de tener token
- `settings.js` usa fallbacks en todos los getters — la app funciona incluso si PocketBase no tiene un registro de settings (resiliencia)
- `_applyBranding()` modifica `--color-brand` en el `:root` — todo el CSS que usa `var(--color-brand)` refleja el color del restaurante automáticamente
- El onboarding es de 2 pasos (no 3) — el nombre del restaurante se recopila en el registro, no en el wizard

### Next session should start at

**TASK-055** — Floor plan editor mode toggle (Phase 14)

## [2026-03-22] Phase 14 — Editable Floor Plan

**Tasks:** TASK-055 to TASK-059

- Added edit mode toggle in the UI (view vs. edit); only visible to `restaurant_admin` and `superadmin`.
- Drag-and-drop repositioning now exposed in admin edit mode via `FloorPlan({ draggable, editMode })`.
- "New Table" form in edit mode: number, capacity, area, shape inputs; `createTable()` service call.
- Delete badge on each table in edit mode: dispatches `tabledelete` event, confirmed before deletion.
- Multi-area support: Todas / Interior / Terraza / Barra tabs using `fpActiveArea` state and `_rebuildFloorPlan()`.

---

## [2026-03-22] Phase 15 — Real-time SSE

**Tasks:** TASK-060 to TASK-063

- Created `frontend/src/services/realtime.js`: PocketBase SSE client.
  - Opens `EventSource` to `/api/realtime?token=<jwt>`.
  - Subscribes to topics via POST after `PB_CONNECT` handshake.
  - Per-topic handler registration with `subscribe(topic, handler)` → returns unsubscribe fn.
  - Exponential backoff reconnection (1s → 2s → 4s … capped at 30s).
  - `onStatusChange(cb)` for connection state callbacks.
- Replaced `setInterval(refreshFloorPlan, 60_000)` polling with SSE subscriptions:
  - `reservations` topic → `refreshFloorPlan()` + reload reservation list if active.
  - `tables` topic → `_rebuildFloorPlan()` for instant layout updates.
- Added SSE indicator dot in header: green (pulsing) when connected, grey when reconnecting.
- `destroyRealtime()` called on logout to cleanly close the SSE connection.
