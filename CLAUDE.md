# CLAUDE.md — AI Agent Context

This file is the primary entry point for any AI agent working in this repository.
Read this file first, every session, without exception.

---

## Project Overview

**Name:** TableFlow — AI-Powered Restaurant Reservation Management System (SaaS)
**Type:** Open source, production-quality SaaS web application
**Goal:** Help restaurants manage tables, reservations and customers through a modern dashboard with automation, AI capabilities, and per-restaurant multi-tenant architecture.
**Version:** v1.0 complete. Currently pivoting to v2.0 SaaS architecture.

---

## Strategic Vision (SaaS Pivot — 2026-03-21)

TableFlow is evolving from a single-restaurant deployment tool into a fully multi-tenant, scalable SaaS platform. The pivot addresses the following product goals:

- **Any restaurant can onboard in < 5 minutes** (self-service registration + guided setup wizard)
- **Full tenant isolation** — each restaurant's data is logically isolated via `restaurant_id` row-level security + PocketBase collection rules
- **Per-restaurant customization** — floor plan, branding, timezone, operating hours, reservation gap rules
- **Staff access control** — roles: `superadmin`, `restaurant_admin`, `staff`
- **Real-time collaboration** — multiple staff can use the dashboard simultaneously with live updates via SSE
- **Analytics** — occupancy, no-show rate, peak hours, customer retention
- **Public booking widget** — embeddable on restaurant websites
- **AI-enhanced operations** — no-show scoring, demand forecasting, smart table assignment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend / Database | PocketBase (SQLite, JWT auth, SSE) |
| Automation | n8n (self-hosted or cloud) |
| Frontend | Vanilla JavaScript (ES Modules) |
| Floor Plan | SVG interactive layout |
| AI Integration | OpenAI API (or compatible LLM via n8n) |
| Billing (v2) | Stripe |
| Realtime (v2) | PocketBase SSE subscriptions |

---

## Repository Structure

```
/
├── CLAUDE.md               # AI agent primary context (this file)
├── MEMORY.md               # Persistent project knowledge
├── PROJECT_STATUS.md       # Current development state
├── TASK_QUEUE.md           # Ordered list of pending tasks
├── PROGRESS_LOG.md         # Chronological development log
├── DECISIONS.md            # Architectural decisions record
├── README.md               # Public-facing project overview
├── docs/
│   ├── ARCHITECTURE.md     # System architecture detail (multi-tenant SaaS)
│   ├── DATABASE_SCHEMA.md  # PocketBase collections and fields
│   ├── DEVELOPMENT_ROADMAP.md
│   ├── SETUP.md            # How to run the project locally
│   ├── SAAS_ONBOARDING.md  # Per-restaurant onboarding guide (v2)
│   └── AGENT_WORKFLOW.md   # Rules for AI agents
├── frontend/               # Vanilla JS web application
│   ├── index.html
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── services/       # API call wrappers
│   │   └── utils/          # Shared utilities
│   └── styles/             # CSS
├── backend/
│   └── pocketbase/
│       ├── migrations/     # PocketBase schema migrations (JS hooks)
│       └── hooks/          # PocketBase server-side hooks
├── automations/
│   └── n8n/                # n8n workflow JSON exports
├── tests/                  # Test files
└── seed/                   # Seed data scripts and fixtures
```

---

## Naming Conventions

- **JavaScript variables/functions:** camelCase
- **Database fields:** snake_case
- **Files and folders:** kebab-case

---

## Agent Workflow (MANDATORY)

Every session must follow this sequence:

1. Read `CLAUDE.md` (this file)
2. Read `MEMORY.md`
3. Read `PROJECT_STATUS.md`
4. Read `TASK_QUEUE.md`
5. Identify the next task
6. Implement the task
7. Update `PROJECT_STATUS.md`
8. Update `TASK_QUEUE.md`
9. Append a new entry to `PROGRESS_LOG.md`
10. Record any architectural decisions in `DECISIONS.md`

Never skip these steps. See `docs/AGENT_WORKFLOW.md` for details.

---

## Core Features (v1.0 — Complete)

- Reservation management (create, update, cancel)
- Interactive restaurant floor plan (SVG)
- Table management with visual status indicators (live: green/yellow/red)
- Customer CRM
- Automation workflows via n8n
- AI classification of incoming reservation messages
- 3-hour gap enforcement between reservations on same table
- Table detail modal with upcoming reservations list

---

## Floorplan 3D "Animal Crossing" (v2.0 — Planned, Phase 21)

El floorplan SVG 2D será reemplazado por un **floorplan 3D isométrico** con estética caricaturesca cálida:

- **Tecnología:** Three.js (CDN ESM, sin build step)
- **Estética:** Perspectiva isométrica ortográfica, colores pastel cálidos, formas redondeadas, sin fotorrealismo
- **Assets:** Mesas rect/redondas + sillas según capacidad + decoraciones (plantas, lámparas)
- **Estados visuales:** Indicador cilíndrico sobre cada mesa — verde (libre) / amarillo (reserva <3h) / rojo (ocupada) — con animación de pulso en mesas ocupadas
- **Interactividad:** Click → `tableselect` event (igual que SVG), hover lift, drag-and-drop en modo edición
- **Integración:** `FloorPlan3D` expone la **misma interfaz** que `FloorPlan` — `app.js` no cambia
- **Fallback:** Si WebGL no disponible → SVG 2D automáticamente
- **Flag:** `APP_CONFIG.USE_3D_FLOOR_PLAN = true` para activar
- **Documentación:** `docs/FLOORPLAN_3D.md` — arquitectura completa, paleta de colores, catálogo de assets
- **Tareas:** Phase 21, TASK-088 a TASK-121 (34 tareas)

---

## SaaS Features (v2.0 — In Progress)

- Multi-tenant architecture with full restaurant isolation
- User authentication (login/logout, JWT, role-based access)
- Restaurant self-service onboarding wizard
- Per-restaurant settings (timezone, gap rules, operating hours, branding)
- Editable floor plan (add/remove/move tables from admin UI)
- Real-time floor plan updates via PocketBase SSE
- Analytics dashboard (occupancy, no-shows, peak hours)
- Public booking widget (embeddable iframe)
- AI predictions: no-show scoring, demand forecasting
- Billing & subscription tiers (Stripe)
- POS integrations (Square, Toast)

---

## Key Constraints

- Never store secrets in the repository — use environment variables
- All APIs follow REST principles with a consistent response format
- All entities include `restaurant_id` for multi-tenant isolation
- Never implement features without updating project documentation
- Architectural changes must be recorded in `DECISIONS.md`
- All PocketBase collection rules must enforce `restaurant_id` checks (no cross-tenant data leaks)
- Client-side validation is UX-only — all business rules must have server-side enforcement
- UI language: Spanish (es-ES) — the target market is Spanish-speaking restaurants

---

## Known Issues & Technical Debt (v1.0 Audit — 2026-03-21)

### Security
- [ ] No authentication layer — any user with the URL can access all data
- [ ] PocketBase API collection rules not configured (open to public by default)
- [ ] `restaurant_id` from URL param relies on client-side enforcement only
- [ ] No rate limiting on reservation creation

### Logic
- [ ] 3-hour gap validation is client-side only — race conditions possible
- [ ] `duration_minutes` hardcoded to 90 — not configurable per restaurant
- [ ] Party size not validated against table capacity server-side
- [ ] Customer deduplication has race condition in concurrent creation

### UX
- [ ] Mixed Spanish/English UI — standardize to Spanish
- [ ] `setGlobalLoading()` defined but never called (dead code)
- [ ] No mobile-responsive layout
- [ ] No empty state when no tables are configured
- [ ] Reservation list has no pagination (hardcoded perPage: 50)

### Performance
- [ ] Floor plan uses 60s polling instead of SSE
- [ ] No data caching between tab switches
- [ ] `getFloorPlanStatus` uses perPage: 200 — could miss reservations in very busy restaurants

---

## SaaS Architecture Decisions (see DECISIONS.md for full records)

| Decision | Choice | Reason |
|---|---|---|
| Multi-tenancy model | Row-level via `restaurant_id` | No schema changes required; SQLite index makes it performant |
| Auth | PocketBase native auth + user→restaurant relation | Avoids external auth service; built-in JWT support |
| Realtime | PocketBase SSE (replace polling) | Already in PocketBase; zero extra deps |
| Billing | Stripe (Phase 20) | Industry standard; good webhook support |
| Booking widget | Iframe + same PocketBase API | No separate backend needed |
