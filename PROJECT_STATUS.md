# PROJECT_STATUS.md — Current Development State

_Last updated: 2026-03-24_

---

## Current Phase

**v2.0 SaaS COMPLETE — Phase 24 (Animal Crossing Aesthetic) IN PROGRESS**

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
| Phase 22 — Floorplan 2.5D Isometric Engine | COMPLETE |
| Phase 23 — Visual Ambiance (night mode, candles, lamps) | COMPLETE |
| Phase 24 — Animal Crossing Aesthetic Rewrite | IN PROGRESS |

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

**Phase 24 — Animal Crossing Aesthetic Rewrite (TASK-164 to TASK-181)**

Infrastructure setup complete:
- [x] Blender 5.1.0 installed (`snap install blender --classic`)
- [x] blender-mcp addon downloaded and activated in Blender
- [x] `uvx blender-mcp` MCP server configured in `~/.claude/mcp.json`
- [x] Blender open with MCP Server running on port 9876
- [x] ruflo context files created in `/ruflo/` (9 files: project, architecture, stack, domain, conventions, decisions, context, tasks, roadmap)

Pending:
- [ ] TASK-164: Download Tom Nook 3D model (DAE) from The Models Resource
- [ ] TASK-165 to TASK-169: Blender MCP scene setup + render sprite sheet
- [ ] TASK-170 to TASK-181: Canvas 2D aesthetic rewrite (palette, sprites, floor, tables, chairs, plants)

---

## What Is Next

**Next immediate task: TASK-164**

Download Tom Nook (New Horizons) DAE model from The Models Resource and begin Blender MCP scene setup for isometric sprite rendering.

**Rendering pipeline:**
1. Blender orthographic camera (rot X=60°, Z=45°), cel-shading (Toon BSDF + Freestyle)
2. Render 6 frames: walk×4 (N/S/E/W), idle×1, seated×1 at 48×64px
3. Compose into 288×128px sprite sheet PNG (transparent background)
4. Integrate into `drawCharacter()` via `ctx.drawImage()`

**Then Canvas 2D aesthetic rewrite:**
1. New Animal Crossing day/night palette in `iso-palette.js`
2. Wood plank floors, rounded tablecloths, cushioned chairs, multi-circle plants
3. Day mode warm interior background (cream walls, wooden trim)

---

## Blockers

None. Blender MCP is running. Tom Nook model download is the first step.

---

## Health Indicators

| Area | Status |
|---|---|
| Documentation | Complete — ruflo context files added (9 files) |
| Architecture | Multi-tenant SaaS v2.0 complete |
| Database schema | Complete with seed data |
| Backend implementation | Migrations + hooks + custom routes complete |
| Frontend implementation | Full SaaS SPA with 2.5D floor plan complete |
| Automation workflows | 4 n8n workflows exported |
| AI integration | Classifier workflow + client service |
| Tests | 60+ tests passing |
| Seed data | 1 restaurant, 12 tables, 8 customers, 19 reservations |
| Authentication | JWT login/logout/session restore complete |
| Multi-tenancy | Row-level isolation via `restaurant_id`, collection rules configured |
| Floor plan | 2.5D isometric Canvas 2D engine complete; AC aesthetic rewrite in progress |
| Blender MCP | Configured and running — ready for sprite rendering |
