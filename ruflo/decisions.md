# decisions.md — Architectural Decisions

## ADR-001: Multi-tenancy via row-level isolation (not schema-per-tenant)

**Decision:** All collections share a single schema. Every row has a `restaurant_id` discriminator. PocketBase collection rules enforce tenant isolation at the query level.

**Reasoning:** PocketBase does not support dynamic schema creation per tenant. Row-level isolation with SQLite indexes is performant for hundreds of restaurants. No deployment complexity (one binary, one database file). Scaling to thousands of restaurants would require migrating to PostgreSQL, which PocketBase supports as a backend.

---

## ADR-002: Vanilla JavaScript ES Modules (no build step)

**Decision:** The frontend is written in plain JavaScript ES Modules. No bundler, no transpiler, no npm for the frontend. Libraries loaded via CDN or importmap.

**Reasoning:** Eliminates build pipeline complexity and toolchain maintenance. Works on tablets without Node.js. Deployable by serving the `frontend/` directory from any static file server. Type safety provided via JSDoc annotations + IDE inference (no TypeScript compilation needed). Acceptable trade-off for a team where AI agents write most of the code.

---

## ADR-003: PocketBase as the only backend dependency

**Decision:** PocketBase (single Go binary) replaces a separate database server, authentication service, REST API framework, webhook system, and admin UI.

**Reasoning:** Zero infrastructure overhead for self-hosted restaurants. SQLite scales sufficiently for restaurant-scale data (< 100k reservations/year per location). Built-in JWT auth, SSE, and JS migration runner removes entire categories of dependencies. JS hooks allow server-side business logic without a separate runtime.

---

## ADR-004: Canvas 2D over WebGL/Three.js for the floor plan

**Decision:** The 2.5D isometric floor plan engine is built with Canvas 2D API. The Three.js implementation (planned in Phase 21) was abandoned.

**Reasoning:** Three.js requires WebGL, which is unavailable or unreliable on restaurant POS tablets. Canvas 2D works everywhere. Sprite-based isometric rendering is sufficient for the visual quality target ("Animal Crossing" warm aesthetic). Eliminates a large external dependency. The Canvas 2D implementation is ~1200 LOC vs. the estimated Three.js approach at ~3000 LOC. The `drawIsoBox` primitive covers all sprite needs.

---

## ADR-005: SVG floor plan retained as fallback

**Decision:** The original SVG floor plan (`floor-plan.js`) is kept and auto-selected when Canvas 2D is unavailable or `USE_2_5D_FLOOR_PLAN = false`.

**Reasoning:** The public interface of both implementations is identical. Fallback costs nothing at runtime. Provides a safety net for legacy browsers and a simpler debugging surface.

---

## ADR-006: n8n for automation and AI (decoupled from frontend)

**Decision:** All notification, reminder, and AI classification logic runs in n8n workflows triggered by PocketBase webhooks. The frontend has a thin `ai-classifier.js` service that calls an n8n webhook endpoint.

**Reasoning:** Decouples AI provider from the frontend and backend. n8n supports retries, error handling, and provider switching (OpenAI → Anthropic, SMTP → SendGrid) without code changes. Workflows are version-controlled as JSON. AI costs are isolated in n8n (no OpenAI key in the frontend).

---

## ADR-007: Per-restaurant settings collection (not hardcoded config)

**Decision:** Each restaurant has a `restaurant_settings` row with its own `default_duration_minutes`, `min_gap_minutes`, `opening_time`, `closing_time`, `timezone`, branding colors, and widget token.

**Reasoning:** Eliminates the v1.0 `duration_minutes: 90` hardcode. Different restaurants have different operating models. Settings are loaded at startup and cached in the `settings.js` module. Fallback defaults are provided for resilience if settings are missing.

---

## ADR-008: Real-time via SSE (replacing 60-second polling)

**Decision:** The floor plan and reservation list refresh via PocketBase SSE subscriptions. The v1.0 `setInterval(refreshFloorPlan, 60000)` was removed in Phase 15.

**Reasoning:** 60-second polling creates a poor UX when multiple staff members are using the system simultaneously. SSE is built into PocketBase at zero additional cost. Exponential backoff reconnection handles transient network failures.

---

## ADR-009: Atomic restaurant registration via custom PocketBase hook

**Decision:** `POST /api/custom/register` is a custom PocketBase JS hook that atomically creates a `user` record, a `restaurants` record, and a `restaurant_settings` record in a single transaction.

**Reasoning:** A multi-step registration via separate API calls would leave the system in a partial state if any step fails. A single atomic hook guarantees consistency. The endpoint bypasses PocketBase's default auth collection creation flow to inject `role = "restaurant_admin"` and the `restaurant_id` link.

---

## ADR-010: Client-side availability computation (not server-side SQL query)

**Decision:** Table availability is computed in the browser by fetching all reservations in a time window and running an overlap-detection loop in `table-assignment.js`.

**Reasoning:** PocketBase's filter language does not support complex datetime overlap expressions efficiently. The JavaScript overlap algorithm is simple, deterministic, and fully unit-testable. The data volume for a single restaurant's daily reservations fits comfortably in memory.

**Known risk:** Under high concurrency, two simultaneous bookings could pass the overlap check before either is committed. A server-side hook enforcing the gap rule is planned (Phase 19, currently skipped).

---

## ADR-011: Mutable PALETTE singleton for night mode

**Decision:** `iso-palette.js` exports a mutable `PALETTE` object. `setNightMode(bool)` mutates it in-place via `Object.assign`.

**Reasoning:** All sprite functions import `PALETTE` by reference at module load time. Mutating the object in-place means all modules see the update immediately without re-importing. An immutable approach would require passing the palette as a parameter to every sprite function (high churn). The trade-off (implicit global state) is acceptable for a color palette that changes at most once (at boot).

---

## ADR-012: PocketBase datetime format (space separator)

**Decision:** All datetime filter values must use PocketBase's format: `"YYYY-MM-DD HH:MM:SS.000Z"` (space, not `T`). Utility functions `toPbDate()` and `parsePbDate()` handle conversion.

**Reasoning:** PocketBase stores and compares datetimes using its own format. Using ISO 8601 `T` separator in filter strings causes silent filter failures. This was discovered during Phase 5 debugging and formalized as a utility function.

---

## ADR-013: Phases 18–20 skipped (AI predictions, security hardening, billing)

**Decision:** Phase 18 (AI no-show scoring), Phase 19 (server-side validation + rate limiting), and Phase 20 (Stripe billing) were explicitly deferred to focus on the 2.5D floor plan visual quality.

**Reasoning (inferred):** The product is pre-revenue, and visual polish drives demos and onboarding more effectively than backend hardening. The known security gaps (client-side-only gap validation, no rate limiting) are acceptable at the current scale. Billing is not needed until the product has paying customers.
