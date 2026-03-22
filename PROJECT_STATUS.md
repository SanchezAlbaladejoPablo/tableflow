# PROJECT_STATUS.md — Current Development State

_Last updated: 2026-03-22_

---

## Current Phase

**v1.0 COMPLETE — SaaS v2.0 Architecture Defined, Implementation Starting**

| Phase | Status |
|---|---|
| Phase 1 — Documentation & Context System | COMPLETE |
| Phase 2 — System Architecture | COMPLETE |
| Phase 3 — Database Schema | COMPLETE |
| Phase 4 — PocketBase Configuration | COMPLETE |
| Phase 5 — Frontend Service Layer | COMPLETE |
| Phase 6 — Floor Plan Rendering | COMPLETE |
| Phase 7 — Dashboard UI | COMPLETE |
| Phase 8 — n8n Automation Workflows | COMPLETE |
| Phase 9 — AI Message Classification | COMPLETE |
| Phase 10 — Testing & Finalization | COMPLETE |
| Phase 11 — n8n Manual Setup | PENDING (manual steps) |
| Phase 12 — Auth & Access Control (SaaS) | COMPLETE |
| Phase 13 — Restaurant Onboarding (SaaS) | COMPLETE |
| Phase 14 — Editable Floor Plan (SaaS) | COMPLETE |
| Phase 15 — Real-time SSE (SaaS) | COMPLETE |
| Phase 16 — Analytics Dashboard (SaaS) | COMPLETE |
| Phase 17 — Public Booking Widget (SaaS) | COMPLETE |
| Phase 18 — AI Predictions (SaaS) | SKIP |
| Phase 19 — Security Hardening (SaaS) | SKIP |
| Phase 20 — Billing & Subscriptions (SaaS) | SKIP |
| Phase 21 — Floorplan 3D / Three.js | DEPRECATED |
| Phase 22 — Floorplan 2.5D Isometric Engine | PENDING |

---

## What Has Been Done

### v1.0 — Fully Complete

#### Documentation & Architecture
- [x] CLAUDE.md (updated with SaaS vision + audit results)
- [x] MEMORY.md, PROJECT_STATUS.md, TASK_QUEUE.md, PROGRESS_LOG.md, DECISIONS.md
- [x] docs/ARCHITECTURE.md — updated with multi-tenant SaaS architecture
- [x] docs/DATABASE_SCHEMA.md — all collections with fields and indexes
- [x] docs/DEVELOPMENT_ROADMAP.md, docs/SETUP.md, docs/AGENT_WORKFLOW.md
- [x] README.md, .env.example

#### Backend (PocketBase)
- [x] 5 migration files (restaurants, tables, customers, reservations, reservation_logs)
- [x] `reservation-hooks.js` — logging + visit_count increment

#### Seed Data
- [x] `seed/seed.js` — 1 restaurant, 10 tables, 5 customers, 8 reservations

#### Frontend — Service Layer
- [x] `api.js` — fetch client with timeout, error normalisation, auth token
- [x] `reservations.js` — CRUD + status + `getUpcomingTableReservations`
- [x] `tables.js` — CRUD + `getFloorPlanStatus` (live status, PocketBase date format fixed)
- [x] `customers.js` — CRM CRUD + search + findByPhone/Email
- [x] `ai-classifier.js` — n8n webhook client
- [x] `table-assignment.js` — Best Fit algorithm
- [x] `html.js` — escHtml, nowRounded (local time), toDateTimeInput (fixed timezone bug)

#### Frontend — UI
- [x] `index.html` — 3 tabs + 3 modals (table detail, reservation form, customer form)
- [x] `main.css` + `floor-plan.css`
- [x] `floor-plan.js` — SVG, live status colors, click events, drag-and-drop
- [x] `reservation-form.js` — create/edit + 3-hour gap validation + auto-link customer
- [x] `reservation-list.js` — table view with inline status transitions
- [x] `customer-form.js` — CRM form + list
- [x] `app.js` — orchestration + table detail modal + floor plan auto-refresh

#### Key Bugs Fixed (v1.0 QA)
- [x] PocketBase datetime filter format (space separator vs T separator)
- [x] Timezone bug in `nowRounded()` (UTC vs local time)
- [x] Table click → reservation detail modal (not direct new-reservation form)
- [x] 3-hour gap enforcement between reservations (client-side validation)
- [x] Node.js 24 test runner: `await import()` hoisted to module top-level

#### Automations
- [x] 4 n8n workflow JSON exports

#### Tests
- [x] 22 unit tests (table-assignment), integration tests (api), automation tests — all passing

### v2.0 SaaS — Architecture Defined
- [x] Full audit of v1.0 (security, UX, logic, performance issues documented in CLAUDE.md)
- [x] ARCHITECTURE.md rewritten with multi-tenant SaaS design
- [x] TASK_QUEUE.md updated with Phases 12–20 (45 new tasks, TASK-043 to TASK-087)
- [x] DECISIONS.md updated with SaaS pivot decisions
- [x] `restaurant_settings` collection design defined

---

## What Is In Progress

Nothing — SaaS architecture defined, ready to begin Phase 12 (Authentication).

---

## What Is Next

**Phase 12 — Authentication & Access Control (TASK-043)**

1. Add `users` collection to PocketBase with role field and restaurant_id relation
2. Configure PocketBase collection rules for all collections
3. Create login page in frontend
4. Update API client to send JWT and handle 401

**Recommended implementation order:**
1. Phase 12 (Auth) — blocking dependency for all other SaaS phases
2. Phase 13 (Onboarding) — needed before any restaurant can self-onboard
3. Phase 15 (Realtime SSE) — quick win, high user value
4. Phase 14 (Editable Floor Plan) — restaurant setup UX
5. Phase 16 (Analytics) — retention driver
6. Phase 17 (Booking Widget) — growth channel
7. Phase 19 (Security Hardening) — should be done alongside Phase 12-13
8. Phase 18 (AI Predictions) — differentiator
9. Phase 20 (Billing) — monetization

---

## Blockers

None. Phase 12 can start immediately.

---

## Health Indicators

| Area | Status |
|---|---|
| Documentation | Complete + SaaS architecture added |
| Architecture | Multi-tenant SaaS design defined |
| Database schema | v1.0 complete; v2.0 additions planned |
| Backend implementation | v1.0 migrations + hooks complete |
| Frontend implementation | v1.0 full SPA complete |
| Automation workflows | 4 n8n workflows exported |
| AI integration | Classifier workflow + client service |
| Tests | 22 unit tests passing |
| Seed data | Script complete |
| Authentication | Not yet implemented |
| Multi-tenancy | `restaurant_id` on all entities; collection rules not configured |
