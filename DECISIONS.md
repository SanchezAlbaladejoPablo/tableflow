# DECISIONS.md — Architectural Decisions Record

Every significant architectural decision must be recorded here.
Format: `## [YYYY-MM-DD] Decision title`

---

## [2026-03-21] Use PocketBase as backend and database

**Context:** The project needs a backend with a database, authentication, and a REST API without requiring a complex deployment setup.

**Decision:** Use PocketBase — a single Go binary that provides SQLite storage, a built-in Admin UI, real-time subscriptions, and authentication out of the box.

**Consequences:**
- No separate database process required.
- Schema is defined via PocketBase's Admin UI or JS migration files.
- Limited to SQLite; not suitable for very high write throughput at scale.
- Simplifies deployment: `./pocketbase serve` is all that's needed.

---

## [2026-03-21] Use Vanilla JavaScript with ES Modules for the frontend

**Context:** The project should be lightweight, easy to understand, and not locked into a specific framework version.

**Decision:** Use vanilla JavaScript with native ES Modules. No build step required for development.

**Consequences:**
- No npm dependencies required for the frontend runtime.
- Developers can open `index.html` in a browser or serve with any static file server.
- No JSX, no framework-specific patterns. Lower barrier to contribution.
- For production, a simple bundler (Vite or esbuild) can be added later if needed.

---

## [2026-03-21] Use SVG for floor plan rendering

**Context:** The floor plan needs to be interactive (click tables, show status), scalable, and inspectable for debugging.

**Decision:** Use inline SVG rendered dynamically by JavaScript.

**Consequences:**
- Tables are rendered as SVG shapes (`<rect>`, `<circle>`) with data attributes.
- Click events and color changes are handled via standard DOM APIs.
- Scales cleanly to any screen size.
- Drag-and-drop repositioning is optional and can be added via mouse event listeners.

---

## [2026-03-21] Prefix all entities with restaurant_id

**Context:** The system targets single-restaurant deployments today but should support multi-tenant SaaS in the future.

**Decision:** Add `restaurant_id` as a required relation field on `tables`, `reservations`, and `customers`.

**Consequences:**
- All queries will filter by `restaurant_id`.
- Adding a second restaurant requires no schema changes.
- Slight overhead in single-tenant queries (negligible with SQLite index).

---

## [2026-03-21] Abstract AI provider behind a service layer

**Context:** OpenAI is the default AI provider but the user may want to switch to a local LLM or another provider.

**Decision:** All AI calls go through `frontend/src/services/ai-classifier.js` (or equivalent) which calls an n8n webhook. The n8n workflow makes the actual API call. Swapping providers only requires updating the n8n workflow.

**Consequences:**
- AI provider is fully decoupled from the frontend code.
- n8n handles retries, rate limiting, and provider-specific auth.
- Requires n8n to be running for AI features.

---

## [2026-03-21] Store n8n workflows as JSON exports in the repository

**Context:** n8n workflows need to be version-controlled and shareable.

**Decision:** Export all n8n workflows as JSON files in `automations/n8n/`. Document import steps in `docs/SETUP.md`.

**Consequences:**
- Workflows can be reviewed in pull requests.
- Import is a manual step (or scriptable via n8n API).
- If the n8n MCP server becomes available, this can be automated.

---

## [2026-03-21] PocketBase datetime format: use space separator in filter values

**Context:** PocketBase/SQLite stores datetimes as `"2026-03-21 19:00:00.000Z"` (space separator). SQLite compares datetime strings lexicographically. Filter values with ISO-8601 T separator (`"2026-03-21T19:00:00.000Z"`) always fail because space (ASCII 32) < T (ASCII 84).

**Decision:** All PocketBase filter values that include datetimes must use the space separator format. Use `toPbDate(ms)` utility (`new Date(ms).toISOString().replace("T", " ")`). All response datetimes must be normalized before passing to `new Date()` using `parsePbDate(str)` (`str.replace(" ", "T")`).

**Consequences:**
- Correct filter matching in SQLite.
- All date-handling code must use these utility functions; raw ISO strings in filters will silently return no results.

---

## [2026-03-21] Use local time components for datetime-local inputs

**Context:** `new Date().toISOString()` returns UTC. `<input type="datetime-local">` expects local time. On a machine in UTC+1, this caused reservation times to be off by 1 hour.

**Decision:** Never use `.toISOString()` to populate a `datetime-local` input. Use `getHours()`, `getMinutes()`, `getFullYear()`, etc. (which return local time). The `nowRounded()` and `toDateTimeInput()` functions in `html.js` implement this correctly.

**Consequences:**
- All datetime inputs show correct local time to the user.
- When submitting the form, `new Date(inputValue)` correctly parses the local datetime.

---

## [2026-03-21] SaaS Pivot: row-level multi-tenancy

**Context:** The product is pivoting from a single-tenant self-hosted tool to a multi-tenant SaaS platform. The decision is whether to use separate databases per tenant (schema isolation) or a shared database with a `restaurant_id` discriminator (row-level isolation).

**Decision:** Use row-level multi-tenancy. All tables already have `restaurant_id`. PocketBase collection rules enforce `@request.auth.restaurant_id = restaurant_id` at the API level. No per-tenant databases needed.

**Rationale:**
- `restaurant_id` is already on all existing tables — zero migration cost.
- PocketBase's collection rules provide server-enforced isolation without custom middleware.
- SQLite with indexed `restaurant_id` queries is fast enough for 1000+ restaurants.
- Schema isolation would require one PocketBase instance per tenant — operationally complex.
- If a single tenant reaches 10M+ rows, they can be migrated to a dedicated instance.

**Consequences:**
- Simpler deployment — one PocketBase instance.
- All queries MUST include `restaurant_id` filter or they will be rejected by collection rules.
- If a PocketBase collection rule is misconfigured, cross-tenant data leak is possible — security audit required (TASK-082).

---

## [2026-03-21] SaaS Pivot: replace polling with PocketBase SSE

**Context:** The floor plan currently refreshes every 60 seconds via `setInterval`. Multiple staff members working simultaneously see stale data.

**Decision:** Replace polling with PocketBase's built-in SSE (Server-Sent Events) real-time subscriptions. Subscribe to `reservations` and `tables` collections filtered by `restaurant_id`.

**Rationale:**
- PocketBase SSE is already available — no extra infrastructure.
- Instant updates improve staff coordination in busy restaurants.
- Reduces server load (SSE is push vs. periodic pull).

**Consequences:**
- Requires the frontend to manage an SSE connection lifecycle.
- Must implement reconnection logic with exponential backoff.
- Auth token must be passed as query parameter in SSE URL (PocketBase requirement).

---

## [2026-03-22] Floorplan 3D isométrico estilo "Animal Crossing"

**Context:** El floorplan SVG 2D actual es funcional pero visualmente plano y sin carácter. Se quiere mejorar la experiencia visual del staff del restaurante y diferenciarse de la competencia con una interfaz acogedora y memorable.

**Decision:** Reemplazar el floorplan SVG 2D por un floorplan 3D isométrico implementado con **Three.js**, con estética caricaturesca cálida inspirada en Animal Crossing. El SVG se mantiene como fallback.

**Rationale:**
- Three.js es la librería 3D para web más madura y documentada, disponible como ESM sin build step (coherente con el stack vanilla JS actual).
- La perspectiva isométrica ortográfica (sin distorsión de perspectiva) maximiza la legibilidad del estado de las mesas — el objetivo principal del floorplan.
- El estilo "flat shading" con `MeshLambertMaterial` es eficiente y suficiente para la estética deseada; no requiere PBR ni sombras.
- La clase `FloorPlan3D` expone **exactamente la misma interfaz pública** que `FloorPlan` SVG (`render`, `update`, mismos custom events `tableselect` y `tablemove`). El resto del código no cambia.
- Un flag `APP_CONFIG.USE_3D_FLOOR_PLAN` permite alternar entre 2D y 3D sin eliminar código — útil durante la transición y para dispositivos sin WebGL.

**Consequences:**
- Three.js añade ~700KB (minificado) cargado vía CDN — aceptable para una app de escritorio interna.
- Se requiere WebGL — prácticamente universal en escritorio; hay fallback a SVG 2D si no está disponible.
- La lógica de negocio (reservas, estados, gap de 3h, servicios, n8n, AI) no cambia en absoluto.
- Las coordenadas `x, y` de PocketBase (píxeles SVG) se mapean a unidades Three.js con un factor de escala `SCALE = 0.025`.
- Ver `docs/FLOORPLAN_3D.md` para arquitectura completa, catálogo de assets y paleta de colores.

---

## [2026-03-21] SaaS Pivot: per-restaurant settings collection

**Context:** Currently, business rules like reservation duration (90 min) and gap between reservations (3 hours) are hardcoded in the frontend. Different restaurants have different operating models.

**Decision:** Create a `restaurant_settings` PocketBase collection with one record per restaurant. Fields include: `default_duration_minutes`, `min_gap_minutes`, `timezone`, `opening_time`, `closing_time`, `logo_url`, `primary_color`, `booking_widget_enabled`, `booking_widget_token`.

**Consequences:**
- App startup must fetch settings before rendering anything.
- `reservation-form.js` and `tables.js` must read settings instead of hardcoded values.
- Existing seed data must be updated to create a settings record.

---

## [2026-03-22] Abandon Three.js in favor of Canvas 2D + sprites for the 2.5D floorplan

**Context:** Phase 21 planificó un floorplan 3D isométrico usando Three.js/WebGL. Antes de comenzar la implementación se revisaron los trade-offs.

**Decision:** Descartar Three.js y construir un motor 2.5D isométrico con **Canvas 2D API** y sprites dibujados por código (sin imágenes externas, sin librerías adicionales).

**Reasons:**
- Three.js añade ~600 KB de dependencia para un caso de uso que no necesita geometría 3D real.
- WebGL no está disponible en todos los tablets de restaurante (algunos usan Android WebView antiguo).
- Canvas 2D es suficiente para perspectiva isométrica 2.5D con sprites; menor superficie de bugs.
- Los sprites "pixel art simplificado" dibujados con primitivos Canvas son más fáciles de mantener y extender que geometrías Three.js.
- El sistema de personajes animados (Tom Nook) es mucho más sencillo de implementar con Canvas que con Three.js AnimationMixer.
- La interfaz pública (`render`, `update`, `tableselect`, `tablemove`) no cambia — `app.js` no se toca.

**Consequences:**
- Phase 21 (Three.js) queda DEPRECATED — las tareas TASK-088 a TASK-121 no se implementarán.
- Nueva Phase 22 con TASK-122 a TASK-157 (36 tareas) usando Canvas 2D.
- No hay requisito de WebGL — el floorplan 2.5D funciona en cualquier navegador moderno.
- El fallback al SVG 2D original sigue siendo posible si Canvas falla.
