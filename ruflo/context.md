# context.md — Current Project State

## What is implemented

### Core application (v1.0 — complete)
- Reservation CRUD with status lifecycle (pending → confirmed → seated → completed / cancelled / no_show)
- Floor plan visualization (2.5D isometric Canvas engine active; SVG as fallback)
- Customer CRM with full-text search and visit history
- Best-fit table assignment algorithm (22 unit tests)
- n8n automation workflows: confirmation email, 24h reminder, incoming message handler, AI classifier

### SaaS features (v2.0 — Phases 12–17 complete)
- **Authentication:** JWT login/logout/session restore, role-based access (`superadmin`, `restaurant_admin`, `staff`)
- **Multi-tenancy:** `restaurant_id` row-level isolation enforced by PocketBase collection rules
- **Onboarding:** Self-service restaurant registration (custom `POST /api/custom/register` hook), 2-step wizard (add tables + configure settings)
- **Per-restaurant settings:** duration, gap, hours, timezone, branding colors, widget token
- **Editable floor plan:** admin edit mode, drag-and-drop repositioning, add/delete tables
- **Real-time SSE:** replaces 60s polling; exponential backoff reconnection; status indicator in header
- **Analytics dashboard:** occupancy rate, no-show rate, peak hours heatmap, customer retention chart, CSV export
- **Public booking widget:** standalone `widget.html`, scoped widget token, iframe embed snippet

### Floor plan engine (Phase 22 — complete)
- Canvas 2D isometric projection with 960×620 virtual canvas
- 6-layer painter's algorithm (floor tiles, decorations, tables+chairs, characters, status indicators, ceiling lamps)
- Animated characters (Tom Nook walkers: spawn at door, walk to reserved table at 60px/s, sit on arrival)
- Smooth 400ms color transitions on status changes
- Pulse effect on occupied tables
- Hover highlighting, floating tooltip, drag-and-drop in edit mode
- Hit-testing via AABB in world space

### Visual ambiance (Phase 23 — complete)
- Increased `ISO_SCALE` 0.45 → 0.58 and `VIRT_H` 520 → 620 for better table spacing
- Night mode color palette (dark blues) vs. day mode (warm pastels)
- Starfield background (45 pre-generated stars with sine-wave twinkle)
- Night sky gradient backdrop
- Animated candles on tables (wax cylinder + glow halo + two-layer flame with `Math.sin` animation)
- Ceiling lamps (suspended cable + trapezoidal shade + warm radial glow aperture)
- Per-table light halos using `globalCompositeOperation = 'lighter'` for additive blending

---

## What is unfinished or partial

### Security gaps (intentionally deferred — Phase 19 skipped)
- **3-hour gap validation is client-side only.** A concurrent POST from two tabs could double-book the same table. A PocketBase server-side hook enforcing the gap rule is not implemented.
- **No rate limiting** on reservation creation or registration endpoint.
- **Party size not validated against table capacity server-side.** Only client-side validation.
- **No HTTPS enforcement** — configuration left to a reverse proxy outside the repo.

### Features planned but not started
- **AI predictions** (Phase 18 skipped): no-show scoring, demand forecasting, smart table suggestions
- **Billing & subscriptions** (Phase 20 skipped): Stripe integration, plan enforcement, usage tracking
- **Mobile-responsive layout:** no media queries; the UI is desktop-only
- **Pagination on reservation list:** hardcoded `perPage: 50` — no infinite scroll or page controls
- **Spritesheet characters:** the current `drawCharacter()` uses Canvas 2D primitives (Tom Nook). Integration of a real PNG spritesheet with walk/sit animation frames is planned but awaiting asset delivery.

### Known dead code
- `setGlobalLoading()` is defined in `app.js` but never called (v1.0 audit finding, not fixed)
- SVG floor plan code (`floor-plan.js`) is retained as a fallback but untested since Phase 22

### Mixed UI language
- Most critical flows are in Spanish (`es-ES`)
- Some component labels remain in English (e.g., reservation status values `"pending"`, `"confirmed"`, reservation list column headers)
- No i18n framework — strings are hardcoded

### Customer deduplication race condition
- `customers.js` attempts to find an existing customer by phone/email before creating a new one
- Concurrent calls can both pass the "not found" check and create duplicates
- No unique constraint on `(restaurant_id, phone)` or `(restaurant_id, email)` in PocketBase schema

---

## Known TODOs (from codebase and CLAUDE.md)

| Area | Issue | Severity |
|---|---|---|
| Security | Gap validation client-side only | High |
| Security | No rate limiting | Medium |
| Security | Party size not server-validated | Low |
| Logic | Customer deduplication race condition | Medium |
| UX | No mobile layout | Medium |
| UX | Mixed ES/EN UI strings | Low |
| UX | No empty state for empty floor plan | Low |
| UX | No pagination on reservation list | Low |
| Performance | `getFloorPlanStatus` uses `perPage: 200` | Low |
| Dead code | `setGlobalLoading()` never called | Cosmetic |

---

## Database state (development)

A seed dataset has been inserted directly into `pb_data/data.db` via Python SQLite3:
- 1 restaurant (`mty6mwjyecw99lk`) — user `p@p.com`
- 12 tables: 7 indoor, 3 outdoor, 2 bar; rect and circle shapes
- 8 customers with names, emails, phones, notes
- 19 reservations across all statuses (seated, confirmed, pending, completed, no_show, cancelled)

---

## Test coverage

60+ tests passing across:
- `tests/table-assignment.test.js` — 22 unit tests (best-fit algorithm)
- `tests/api.test.js` — fetch-mock HTTP integration tests
- `tests/automations.test.js` — n8n workflow validation
- `tests/auth.test.js` — 15 authentication flow tests

**Not tested:**
- Floor plan Canvas 2D engine (visual rendering)
- Component DOM rendering
- PocketBase hook behavior (manual testing only)
- End-to-end flows
