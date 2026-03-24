# conventions.md — Coding Conventions

## Naming

| Scope | Convention | Example |
|---|---|---|
| JS variables & functions | camelCase | `restaurantId`, `getTableAvailability()` |
| JS classes | PascalCase | `FloorPlan2_5D`, `CharacterManager` |
| JS constants (module-level) | SCREAMING_SNAKE_CASE | `ISO_SCALE`, `VIRT_W`, `DOOR_WORLD` |
| Database fields | snake_case | `restaurant_id`, `reserved_at`, `visit_count` |
| Files & folders | kebab-case | `floor-plan-2_5d.js`, `iso-sprites.js`, `reservation-form.js` |
| CSS classes | BEM-adjacent | `.app-header__logo`, `.btn--primary`, `.modal__footer` |
| PocketBase migration files | `{unix_timestamp}_{description}.js` | `1711018203_create_reservations.js` |
| PocketBase hook files | `{domain}-hooks.js` | `reservation-hooks.js` |

---

## File Organization

```
services/       API wrappers only — no DOM manipulation
components/     DOM components — render to a container element, no fetch calls
utils/          Pure functions — no DOM, no fetch, fully testable
pages/          Full-page views (login, register, onboarding)
styles/         CSS only
```

**Rule:** Components receive a container element and dependencies via constructor. They never import services directly — they receive them as arguments or rely on the orchestrator (`app.js`) to pass data in.

*Exception:* In practice, some components (`reservation-form.js`, `analytics.js`) do import services directly. The pattern is aspirational rather than strictly enforced.

---

## Service Layer Pattern

All services return a consistent **result envelope** (inferred from `api.js`):

```js
// Success
{ ok: true, data: {...} }

// Failure
{ ok: false, error: { message: string, status: number, raw: any } }
```

Components check `result.ok` before using `result.data`. No exceptions are thrown for API errors.

---

## Error Handling

- Services never `throw` for API errors — they return `{ ok: false, error }`.
- Components show user-facing toast notifications via `showToast(message, type)`.
- Unhandled `Promise` rejections and `window.onerror` both surface as diagnostic banners overlaid on the page (appended `<pre>` element, not replacing the body).
- Try-catch in async event handlers (e.g. `loginsuccess` in `app.js`) with recovery path.

---

## Async Patterns

- All API calls use `async/await`.
- No Promise chains (`.then()/.catch()`).
- Module-level `await` is not used; init is triggered from `app.js boot()`.
- `await` must not be forgotten on async function calls — omitting it was a source of a production bug (silently swallowed rejections in `loginsuccess` handler).

---

## Component Interface Pattern (Floor Plan)

Both floor plan implementations expose the identical public interface:

```js
class FloorPlanXxx {
    constructor(containerEl, options = {})
    render(tables, availability)   // full redraw
    update(availability)           // state-only update (cheap)
    highlight(tableId)             // border highlight
    destroy()                      // cleanup
}
```

They dispatch the same `CustomEvent` types on the container element:
- `tableselect` → `{ detail: { table, status } }`
- `tablemove`   → `{ detail: { tableId, x, y } }`
- `tabledelete` → `{ detail: { tableId, table } }`

`app.js` never checks which implementation is active. The flag `APP_CONFIG.USE_2_5D_FLOOR_PLAN` selects the class at boot.

---

## Canvas Sprite Conventions (iso-sprites.js)

- Each sprite function signature: `drawXxx(ctx, cx, cy, ...params)`
  - `cx`, `cy` are the screen-space center of the sprite
  - Additional params are layout-specific (e.g. `capacity`, `animFrame`)
- Sprites use only Canvas 2D primitives — no external images, no SVG
- All colors come from `PALETTE` (imported from `iso-palette.js`) — no hardcoded hex strings in sprite functions
- Sprites are stateless — they do not store any data; all state is passed as parameters

---

## Color Management

All colors are defined in `iso-palette.js`:

```js
export const PALETTE = { ...DAY };          // mutable singleton
export function setNightMode(night) { ... } // mutates PALETTE in-place
export function getStatusColor(status) { ... }
export function getTableClothColor(tableNumber) { ... }
```

`Object.assign(PALETTE, src)` is used intentionally so all modules that imported `PALETTE` see the update without re-importing. This is a deliberate side-effect pattern for the night mode switch.

---

## PocketBase Date Handling

PocketBase uses a **space-separated datetime** format, not ISO 8601:

```js
// Correct (PocketBase filter value)
"2026-03-21 19:00:00.000Z"

// Utilities (utils/html.js or services)
toPbDate(jsDate)    // → "YYYY-MM-DD HH:MM:SS.000Z"
parsePbDate(str)    // → normalizes to ISO before new Date()
```

Always use these utilities when constructing PocketBase filter strings or parsing response `datetime` fields.

---

## CSS Conventions

- **Global utility classes:** `.hidden`, `.sr-only`, `.ml-auto`, `.flex`, `.items-center`, `.gap-2`
- **Button variants:** `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--sm`, `.btn--danger`
- **Form elements:** `.form-input`, `.form-input--sm`, `.form-select`, `.form-select--sm`
- **Modal structure:** `.modal-backdrop`, `.modal`, `.modal__header`, `.modal__body`, `.modal__footer`
- **Responsive:** Not implemented — no media queries. Mobile support is a known gap.

The `[hidden]` attribute is used for visibility toggling. **Critical:** any element with a CSS `display` rule must also define:
```css
.element[hidden] { display: none; }
```
Otherwise the CSS rule overrides the browser UA `[hidden] { display: none }` and the element stays visible. This was the root cause of the blank-page bug in the login overlay.

---

## Multi-tenancy Convention

- Every `createXxx()` service call includes `restaurant_id` in the payload — taken from `getCurrentRestaurantId()` (reads from JWT claims via `auth.js`).
- Components never receive `restaurant_id` as a prop — they call `getCurrentRestaurantId()` from `auth.js`.
- All PocketBase collection rules enforce server-side: `@request.auth.restaurant_id = restaurant_id`.

---

## Documentation & Task Tracking

The project uses a structured AI-agent context system (see `docs/AGENT_WORKFLOW.md`):

- `CLAUDE.md` — Project overview, read first every session
- `TASK_QUEUE.md` — Ordered tasks; format: `| TASK-NNN | Description | PENDING/IN_PROGRESS/DONE |`
- `PROJECT_STATUS.md` — Current phase, health, blockers
- `PROGRESS_LOG.md` — Append-only session log
- `DECISIONS.md` — Architecture decision records

Phase numbering: sequential (Phase 1 = docs, Phase 22 = 2.5D engine, Phase 23 = visual ambiance). Task IDs within phases are sequential (TASK-122 through TASK-163 for Phases 22–23).
