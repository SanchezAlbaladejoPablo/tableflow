# tasks.md — Development Task List

Tasks are ordered by priority and grouped by area. Each task is self-contained and actionable.

---

## Security & Correctness (High Priority)

### ~~TASK-S01: Server-side gap validation hook~~ ✅ DONE (2026-03-24)
Hook `onRecordCreate` added to `reservation-hooks.js`. Queries active reservations for the same table, computes `[slotStart, slotEnd)` window including `min_gap_minutes` from `restaurant_settings`, throws `ApiError(422)` with structured payload on overlap.

### ~~TASK-S02: Server-side party size validation~~ ✅ DONE (2026-03-24)
Implemented in the same `onRecordCreate` hook (runs before gap check). Fetches table capacity via `findRecordById`, throws `ApiError(422, "PARTY_SIZE_EXCEEDS_CAPACITY")` if `party_size > capacity`.

### TASK-S03: Rate limiting on registration and reservation creation
Add a simple token-bucket rate limiter in the PocketBase hooks:
- Max 5 registration attempts per IP per minute
- Max 20 reservation creations per restaurant per minute
Use PocketBase's `$app.store()` (in-memory) or a SQLite auxiliary table.

**Files:** `backend/pocketbase/hooks/registration-hooks.js`, `reservation-hooks.js`

### TASK-S04: Customer deduplication with unique constraint
Add a unique composite index on `(restaurant_id, phone)` and `(restaurant_id, email)` in a new migration. Update `customers.js` to handle 409 Conflict responses by fetching and returning the existing customer.

**Files:** New migration file, `frontend/src/services/customers.js`

---

## UX Improvements

### TASK-U01: Mobile-responsive layout
Add CSS media queries for viewport widths ≤ 768px:
- Stack header navigation vertically
- Make floor plan canvas scroll horizontally
- Stack reservation list columns to card layout
- Full-width modals on mobile

**Files:** `frontend/styles/main.css`

### TASK-U02: Reservation list pagination
Replace hardcoded `perPage: 50` with a paginator component:
- "← Previous / Next →" controls
- Current page indicator
- Configurable page size (25 / 50 / 100)

**Files:** `frontend/src/components/reservation-list.js`, `frontend/src/services/reservations.js`

### TASK-U03: Empty state for floor plan
Show a friendly illustration + "Add your first table" CTA when `tables.length === 0` instead of a blank canvas.

**Files:** `frontend/src/components/floor-plan-2_5d.js`

### TASK-U04: Standardize UI language to Spanish
Audit all hardcoded strings in `components/` and `pages/`. Replace English strings with Spanish equivalents:
- Status values: "Pending" → "Pendiente", "Confirmed" → "Confirmada", etc.
- Button labels, column headers, placeholder text
- Error and success toast messages

**Files:** All `frontend/src/components/*.js`, `frontend/src/pages/*.js`

### TASK-U05: Dark mode toggle in UI
Add a sun/moon toggle button in the app header that:
1. Toggles `window.APP_CONFIG.NIGHT_MODE`
2. Calls `setNightMode(bool)` in `iso-palette.js`
3. Marks the floor plan `#dirty = true` to trigger a redraw
4. Persists the preference in `localStorage`

**Files:** `frontend/index.html`, `frontend/src/app.js`, `frontend/styles/main.css`

---

## Floor Plan Engine

### TASK-F01: Spritesheet-based animated characters
Replace `drawCharacter()` Canvas 2D primitives with a PNG spritesheet:
1. Load a single sprite sheet PNG with walk (4 frames) + sit (2 frames) animations
2. Update `CharacterManager` to track current animation state and frame index
3. `drawCharacter()` uses `ctx.drawImage(spritesheet, srcX, srcY, 32, 32, cx, cy, 32, 32)`
4. Add `SPRITE_FRAME_MS = 150` constant for animation speed

**Files:** `frontend/src/utils/iso-sprites.js`, `frontend/src/utils/characters.js`

### TASK-F02: Table label readability in night mode
In night mode, table number labels drawn by `drawTableLabel()` use white text with a subtle dark drop shadow instead of the current dark text — they become illegible on the dark table tops.

**Files:** `frontend/src/utils/iso-sprites.js`

### TASK-F03: Pinch-to-zoom on the floor plan canvas
Add touch event handlers for pinch gestures:
- `touchstart` — detect 2-finger touch, record initial distance
- `touchmove` — compute scale factor, apply CSS `transform: scale()` to the canvas container
- `touchend` — clamp scale to [0.5, 2.0]

**Files:** `frontend/src/components/floor-plan-2_5d.js`

---

## Analytics

### TASK-A01: Export reservations as CSV
The CSV export in `analytics.js` is implemented but verify it includes all fields (status, source, party_size, table_number, customer_name). Add a date range picker to scope the export.

**Files:** `frontend/src/components/analytics.js`

### TASK-A02: Real-time analytics refresh
Subscribe to SSE events in the analytics tab. When a reservation is created/updated, refresh only the affected metric widget instead of the full dashboard.

**Files:** `frontend/src/components/analytics.js`, `frontend/src/app.js`

---

## Infrastructure & Backend

### TASK-I01: Health check endpoint
Add a `GET /api/custom/health` PocketBase hook that returns:
```json
{ "status": "ok", "version": "2.0", "db": "connected", "timestamp": "..." }
```
Useful for uptime monitoring without exposing admin credentials.

**Files:** New hook file or addition to `registration-hooks.js`

### TASK-I02: PocketBase backup automation
Document and optionally script a daily SQLite backup:
```bash
sqlite3 pb_data/data.db ".backup pb_data/backups/$(date +%Y%m%d).db"
```
Add a retention policy (keep last 30 days).

**Files:** New `scripts/backup.sh`, update `docs/SETUP.md`

### TASK-I03: Docker Compose for local development
Create a `docker-compose.yml` that starts:
- PocketBase container (official image or custom build from binary)
- n8n container (official image)
- Volume mounts for `pb_data/` and n8n data

**Files:** New `docker-compose.yml`, update `docs/SETUP.md`

---

## AI & Automation

### TASK-AI01: No-show scoring (Phase 18)
For each confirmed reservation, compute a no-show probability score:
- Features: lead time, party size, source (widget vs. phone), customer no-show history
- Model: logistic regression (client-side via simple weights) or n8n + OpenAI function call
- Display score as a badge (🟢 < 20%, 🟡 20–50%, 🔴 > 50%) on the reservation list

**Files:** New `frontend/src/utils/noshowscore.js`, `frontend/src/components/reservation-list.js`

### TASK-AI02: Smart table suggestion in reservation form
When staff selects party size and date/time, auto-highlight the best table on the floor plan (smallest available table with sufficient capacity for the party, closest to the entrance). Uses `suggestTables()` already implemented in `table-assignment.js`.

**Files:** `frontend/src/components/reservation-form.js`, `frontend/src/components/floor-plan-2_5d.js`

---

## Billing (Phase 20)

### TASK-B01: Stripe Checkout integration
1. Add `subscription_plans` and `restaurant_subscriptions` PocketBase collections (migration)
2. Create a PocketBase hook for `POST /api/custom/create-checkout-session` that calls Stripe API
3. Add a "Billing" section to the settings panel showing current plan + upgrade CTA
4. Add a Stripe webhook handler (`POST /api/custom/stripe-webhook`) to update subscription status

**Files:** New migration, new hook file, `frontend/src/components/settings-panel.js`
