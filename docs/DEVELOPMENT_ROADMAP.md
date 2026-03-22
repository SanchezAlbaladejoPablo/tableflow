# docs/DEVELOPMENT_ROADMAP.md — Development Roadmap

---

## Vision

TableFlow is an open source restaurant reservation management system that demonstrates
modern architecture, AI-assisted development, and automation integration.
The long-term goal is to become a self-hostable SaaS foundation that any restaurant can deploy.

---

## Phase 1 — Documentation & Persistent Context System
**Goal:** Establish the AI-persistent development infrastructure.

- [x] Create all persistent context files (CLAUDE.md, MEMORY.md, etc.)
- [x] Define project structure and naming conventions
- [x] Initialize TASK_QUEUE.md with full task breakdown

---

## Phase 2 — System Architecture
**Goal:** Define how components interact before writing code.

- [x] Write `docs/ARCHITECTURE.md`
- [x] Define data flows for core scenarios
- [x] Document security model and scalability notes

---

## Phase 3 — Database Schema
**Goal:** Define all data structures before touching PocketBase.

- [x] Write `docs/DATABASE_SCHEMA.md`
- [x] Define all collections, fields, and types
- [x] Define indexes and status value references

---

## Phase 4 — PocketBase Configuration
**Goal:** Make the backend runnable with correct schema and seed data.

- [ ] Write PocketBase JS migration files for each collection
- [ ] Write PocketBase hooks for logging reservation events
- [ ] Write seed data script

---

## Phase 5 — Reservation API Layer
**Goal:** Create a clean JavaScript service layer for all API calls.

- [ ] Base HTTP client
- [ ] Reservation service
- [ ] Tables service
- [ ] Customers service
- [ ] Table assignment algorithm (best-fit)

---

## Phase 6 — Floor Plan Rendering
**Goal:** Interactive SVG floor plan with live table status.

- [ ] SVG floor plan component
- [ ] Table status color coding
- [ ] Click-to-assign interaction
- [ ] (Optional) Drag-and-drop repositioning

---

## Phase 7 — Dashboard UI
**Goal:** Complete the frontend application.

- [ ] App shell (HTML)
- [ ] Reservation form modal
- [ ] Reservations list view
- [ ] Customer CRM form
- [ ] Global CSS
- [ ] Wire up all components

---

## Phase 8 — n8n Automation Workflows
**Goal:** Automate confirmations, reminders, and incoming message handling.

- [ ] Reservation confirmation workflow
- [ ] 24-hour reminder workflow
- [ ] Incoming message handler workflow
- [ ] Document import steps

---

## Phase 9 — AI Message Classification
**Goal:** Automatically parse free-text reservation requests into structured data.

- [ ] AI classifier service (client side)
- [ ] n8n AI classification workflow (OpenAI integration)
- [ ] Integration with reservation creation flow

---

## Phase 10 — Testing & Finalization
**Goal:** Ensure reliability and make the project demo-ready.

- [ ] Unit tests for table assignment logic
- [ ] Integration tests for PocketBase API
- [ ] Automation trigger tests
- [ ] README polish with screenshots/diagrams

---

## Future Roadmap (Post v1.0)

| Feature | Description |
|---|---|
| Multi-restaurant support | Allow multiple restaurants per deployment via admin panel |
| Real-time sync | Use PocketBase SSE subscriptions for live floor plan updates |
| Mobile app | PWA or React Native wrapper for front-of-house staff |
| Waitlist management | Queue guests when no tables are available |
| Analytics dashboard | Occupancy rates, peak hours, no-show rates |
| Payment integration | Pre-authorization or deposit for reservations |
| Third-party integrations | Google Reserve, OpenTable, Resy sync |
| Two-way SMS/WhatsApp | Automated conversation to confirm reservations via messaging |
| Staff management | Assign waitstaff to tables |
| POS integration | Sync with point-of-sale systems |
