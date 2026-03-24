# stack.md — Technology Stack

## Programming Languages

| Language | Where used |
|---|---|
| **JavaScript (ES2022)** | Frontend (ES Modules, no transpilation), seed scripts, tests |
| **Go** | PocketBase binary (pre-compiled, not modified) |
| **JavaScript (PocketBase JS runtime)** | Backend hooks and migrations (`.pb.js` and `.js` extensions) |
| **SQL** | Implied by SQLite; used directly in seed scripts via `better-sqlite3` |
| **CSS** | Frontend styling (`main.css`, `floor-plan.css`) |
| **HTML** | App shell `index.html` and `widget.html` |

---

## Frontend

| Technology | Version / Notes |
|---|---|
| **Vanilla JavaScript** | ES Modules, no bundler, no transpilation |
| **Canvas 2D API** | Floor plan isometric engine (Phase 22) |
| **SVG** | Legacy floor plan fallback (v1.0) |
| **CSS Custom Properties** | For theming and per-restaurant branding (`--primary-color`) |
| **BEM-adjacent CSS** | Class naming convention (`.block__element--modifier`) |
| **`fetch` API** | All HTTP calls via native `fetch` |
| **EventSource API** | Real-time SSE via native `EventSource` |
| **`CustomEvent`** | Inter-component communication (floor plan events) |
| **`localStorage`** | JWT session persistence (token, user, restaurantId) |

No frontend build step. No npm. No bundler. No framework. Runs directly in any modern browser.

---

## Backend

| Technology | Version / Notes |
|---|---|
| **PocketBase** | 0.36.7 — single Go binary: SQLite + REST + SSE + Auth + Admin UI |
| **SQLite** | Embedded via PocketBase; `pb_data/data.db` is the single database file |
| **PocketBase JS Hooks** | Server-side JavaScript executed by PocketBase's built-in JS runtime |
| **PocketBase Migrations** | JS migration files versioned by Unix timestamp prefix |

PocketBase exposes:
- REST API: `/api/collections/{name}/records`
- Auth: `/api/collections/users/auth-with-password`
- Custom routes: `/api/custom/*` (via JS hooks)
- SSE subscriptions: `/api/realtime`
- Admin UI: `/_/`

---

## Automation & AI

| Technology | Notes |
|---|---|
| **n8n** | Self-hosted workflow automation; 4 workflows (confirmation, reminder, AI, incoming-message) |
| **OpenAI API** | `gpt-4o-mini` model for free-text reservation message classification |
| **SMTP** | Email delivery via n8n SMTP node (provider-agnostic) |
| **SMS/WhatsApp** | Supported by n8n via Twilio node (provider-agnostic) |

---

## Testing

| Technology | Notes |
|---|---|
| **Node.js test runner** | Built-in `node:test` module (no Jest, no Mocha) |
| **`fetch-mock`** | HTTP mocking for service-layer tests |
| **`better-sqlite3`** | Direct SQLite access in seed script (`seed/seed.js`) |
| **PocketBase JS SDK** | `pocketbase` npm package in seed script |

Test runner invocation: `node --test tests/` from the `tests/` directory.

---

## Infrastructure

| Component | Technology | Notes |
|---|---|---|
| **Server** | Single VPS or local machine | One Go binary + SQLite file |
| **Process manager** | Any (systemd, Docker, PM2) | Not specified in repo |
| **Reverse proxy** | Nginx or Caddy (not in repo) | For HTTPS + custom domain |
| **PocketBase data** | File system: `pb_data/` | Includes `data.db` and `pb_public/` |

**No cloud provider dependencies.** Self-hostable on any Linux VPS.

---

## External Services

| Service | Purpose | Required? |
|---|---|---|
| **OpenAI API** | AI message classification | Optional (only for incoming-message automation) |
| **SMTP provider** | Confirmation + reminder emails | Optional (n8n workflow) |
| **Twilio (or equiv.)** | SMS/WhatsApp notifications | Optional (n8n workflow) |
| **Stripe** | Billing & subscriptions | Planned (Phase 20, skipped) |

---

## Configuration

All frontend configuration lives in `index.html`:

```js
window.APP_CONFIG = {
    POCKETBASE_URL:      "http://localhost:8090",
    RESTAURANT_ID:       "",         // set after auth
    USE_2_5D_FLOOR_PLAN: true,       // true = Canvas engine, false = SVG fallback
    NIGHT_MODE:          true,       // night palette + lighting effects
};
```

No `.env` file for the frontend (client-side, public config). Backend secrets (admin password, SMTP credentials) are stored in PocketBase admin UI settings, not in the repository.
