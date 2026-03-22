# MEMORY.md — Persistent Project Knowledge

This file captures knowledge that is not obvious from reading the code:
design rationale, past decisions, lessons learned, and standing conventions.

---

## Project Identity

- Project name: **TableFlow**
- Started: 2026-03-21
- Target users: Restaurant owners and front-of-house staff

---

## Standing Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Backend | PocketBase | Zero-config, embedded SQLite, built-in auth, real-time subscriptions |
| Automation | n8n | Self-hostable, visual workflow builder, webhook support |
| Frontend framework | None (Vanilla JS ES Modules) | Minimal dependencies, fast load, easy onboarding |
| Floor plan rendering | SVG | Scalable, DOM-inspectable, easy to bind events |
| AI provider | OpenAI API (pluggable) | Best ecosystem; abstract behind a service layer so it can be swapped |
| Multi-tenancy | restaurant_id on all entities | Prepares for SaaS without complicating the current single-tenant scope |

---

## Architecture Insights

- PocketBase runs as a single binary; no separate database process needed.
- PocketBase collections are defined via its Admin UI or JSON migrations stored in `backend/pocketbase/migrations/`.
- n8n workflows are exported as JSON and stored in `automations/n8n/`. They can be imported via the n8n UI or API.
- The frontend communicates exclusively with PocketBase's REST API. There is no custom API server.
- AI classification happens via a dedicated n8n workflow that calls the OpenAI API and writes results back to PocketBase.

---

## Known Limitations / Future Work

- No real-time multi-user conflict detection yet (PocketBase subscriptions can enable this later).
- Drag-and-drop table positioning in the floor plan is marked as optional; a grid-snap approach may be simpler.
- n8n MCP server integration should be explored when a stable version is available.

---

## Environment Variables Required

```
POCKETBASE_URL=http://localhost:8090
OPENAI_API_KEY=sk-...
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=...
```

---

## Seed Data Summary

- 1 restaurant: "La Terraza"
- 10 tables (various capacities and shapes, spread across two areas)
- 5 sample customers
- 8 sample reservations covering different statuses
