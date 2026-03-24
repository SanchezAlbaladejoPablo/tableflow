# architecture.md — TableFlow System Architecture

## Overview

TableFlow is a **three-tier web application** with no build pipeline:

```
Browser (ES Modules)  ←→  PocketBase (Go binary)  ←→  SQLite
                            ↑                          ↑
                       n8n workflows              migrations/
                       (automation)               hooks (.pb.js)
```

All tiers communicate over HTTP/SSE on the local network (or a single VPS). No microservices, no CDN, no message broker.

---

## Components

### 1. Frontend — `frontend/`

Single-page application written in Vanilla JavaScript ES Modules. No bundler, no framework.

```
frontend/
├── index.html              App shell: config, modals, script entry point
├── src/
│   ├── app.js              Orchestrator: boot, tab routing, init, SSE
│   ├── pages/
│   │   ├── login.js        Login overlay
│   │   ├── register.js     New restaurant registration
│   │   └── onboarding.js   2-step wizard (tables + settings)
│   ├── components/
│   │   ├── floor-plan-2_5d.js    Canvas 2D isometric engine (active)
│   │   ├── floor-plan.js         SVG fallback (v1.0 legacy)
│   │   ├── reservation-form.js   Create/edit reservation modal
│   │   ├── reservation-list.js   Filterable reservations table
│   │   ├── customer-form.js      CRM form + customer list
│   │   ├── analytics.js          Occupancy, no-show, peak hours charts
│   │   └── settings-panel.js     Restaurant settings UI
│   ├── services/
│   │   ├── api.js          Base fetch wrapper (auth header, error norm)
│   │   ├── auth.js         Login, logout, session, user/restaurant getters
│   │   ├── reservations.js CRUD + filters + status transitions
│   │   ├── tables.js       Table CRUD + 2-step availability queries
│   │   ├── customers.js    CRM CRUD + full-text search
│   │   ├── settings.js     Per-restaurant config load + cache
│   │   ├── realtime.js     PocketBase SSE client + reconnect
│   │   └── ai-classifier.js  n8n webhook client
│   └── utils/
│       ├── table-assignment.js  Best-fit algorithm (pure, testable)
│       ├── iso-sprites.js       Canvas 2D primitive drawing functions
│       ├── iso-palette.js       Color palette (day / night modes)
│       ├── characters.js        Animated character manager
│       └── html.js              HTML escape, date formatting
└── styles/
    ├── main.css            Component library (BEM-adjacent)
    └── floor-plan.css      SVG floor plan overrides
```

**Key design:**
- Components receive dependencies via constructor arguments (no global mutable state except `app.js`)
- All API calls are in `services/` — components never call `fetch` directly
- `app.js` is the single orchestrator: manages tab routing, global loading state, SSE lifecycle

### 2. Backend — PocketBase

PocketBase is a single Go binary exposing:
- REST API for all collections
- JWT authentication (email/password)
- Server-Sent Events (SSE) for real-time collection subscriptions
- Admin UI at `:8090/_/`
- JS migration runner + JS hooks execution engine

```
backend/pocketbase/
├── migrations/   Schema setup (15 files, versioned, idempotent)
└── hooks/
    ├── reservation-hooks.js    Post-save: write audit log, increment visit_count
    └── registration-hooks.js  Custom POST /api/custom/register (atomic)
```

**Custom endpoint:** `POST /api/custom/register` — atomically creates `user` + `restaurant` + `restaurant_settings` in a single transaction. Implemented as a PocketBase JS hook.

### 3. Database — SQLite (managed by PocketBase)

All data in one SQLite file (`pb_data/data.db`). Row-level multi-tenancy via `restaurant_id` discriminator on all collections.

### 4. Automation — n8n

Four self-hosted n8n workflows:

| Workflow | Trigger | Action |
|---|---|---|
| `reservation-confirmation.json` | PocketBase webhook on new reservation | Send confirmation email/SMS |
| `24h-reminder.json` | Scheduled (every hour) | Query upcoming reservations → send reminder |
| `incoming-message-handler.json` | Webhook (WhatsApp/email inbound) | Parse → AI classifier → create reservation |
| `ai-classifier.json` | Sub-workflow | OpenAI gpt-4o-mini → extract intent + reservation fields |

---

## Data Flow

### Boot sequence

```
Browser loads index.html
→ app.js boot()
  → auth.js restoreSession()
    → [no session] → showLoginOverlay()
    → [session OK] → loadRestaurantSettings(restaurantId)
      → initFloorPlan()
      → initReservationList()
      → subscribeSSE()          ← PocketBase SSE connection
      → renderFloorPlan()
```

### Reservation creation

```
Staff clicks "+ Nueva Reserva"
→ ReservationForm opens
→ User selects datetime + party_size
  → tables.getAvailability() → PocketBase GET /collections/reservations + /tables
  → suggestTables() (in-browser best-fit algorithm)
→ User submits form
  → reservations.create() → PocketBase POST /collections/reservations
    → PocketBase hook: write reservation_log, increment customer.visit_count (if completed)
    → PocketBase SSE broadcast to all subscribed clients
  → realtime.js receives event → refreshFloorPlan() + reloadList()
  → n8n webhook receives event → send confirmation email
```

### Real-time floor plan update

```
PocketBase SSE event: { action:"update", record: { ...reservation } }
→ realtime.js onMessage()
  → app.js refreshFloorPlan()
    → tables.getFloorPlanStatus() (lightweight batch query)
    → floorPlan.update(availability)
      → colorTransitions.set(tableId, ...) for changed tables
      → dirty = true → next rAF redraws canvas
```

---

## Module Interaction Map

```
app.js
  ├── auth.js            ← session management
  ├── settings.js        ← restaurant config
  ├── realtime.js        ← SSE subscriptions + callbacks
  ├── FloorPlan2_5D      ← renders Canvas 2D
  │     ├── iso-sprites.js   ← drawing primitives
  │     ├── iso-palette.js   ← color management (day/night)
  │     └── characters.js    ← animated character state
  ├── ReservationForm    ← modal form
  │     ├── reservations.js  ← CRUD
  │     ├── tables.js        ← availability
  │     └── customers.js     ← CRM
  ├── ReservationList    ← filterable table
  │     └── reservations.js
  ├── CustomerForm       ← CRM UI
  │     └── customers.js
  ├── Analytics          ← charts
  │     └── reservations.js
  └── SettingsPanel      ← restaurant config UI
        └── settings.js
```

---

## Multi-tenancy Architecture

Every collection row has `restaurant_id`. PocketBase collection rules enforce isolation:

```
listRule:   "@request.auth.restaurant_id = restaurant_id"
viewRule:   "@request.auth.restaurant_id = restaurant_id"
createRule: "@request.auth.restaurant_id = :data.restaurant_id && @request.auth.restaurant_id != ''"
updateRule: "@request.auth.restaurant_id = restaurant_id"
deleteRule: "@request.auth.role = 'restaurant_admin' && @request.auth.restaurant_id = restaurant_id"
```

A `staff` user can only read/write records for their own restaurant. A `superadmin` user (no `restaurant_id` restriction) can access all restaurants.

---

## Floor Plan Engine Architecture (Phase 22)

```
FloorPlan2_5D (class)
│
├── #buildCanvas()          Creates <canvas> 960×620 virtual resolution
├── #startLoop()            requestAnimationFrame loop + dirty-flag
├── #draw()                 Painter's algorithm (6 layers)
│   ├── #drawBackground()   Night sky gradient + stars (NIGHT_MODE only)
│   ├── #drawFloor()        Isometric checkerboard tiles
│   ├── #drawDecorations()  Plants (corners) + door
│   ├── #drawLightHalos()   Additive glow per table (NIGHT_MODE only)
│   ├── #drawTables()       Rect/round tables + chairs + candles + labels
│   ├── #drawCharacters()   Animated characters (Tom Nook walkers)
│   ├── #drawStatusIndicators() Floating diamonds per table
│   └── #drawCeilingLamps() Suspended lamps (NIGHT_MODE only)
│
├── #worldToScreen(wx, wy)  Isometric projection formula
├── #screenToWorld(sx, sy)  Inverse projection (for drag, hit-test)
├── #hitTest(px, py)        Returns hovered table (AABB in world space)
│
└── Public API
    ├── render(tables, availability)  Full redraw, sort by depth
    ├── update(availability)          Incremental state update
    ├── highlight(tableId)            Border highlight
    └── destroy()                     Remove canvas + listeners
```
