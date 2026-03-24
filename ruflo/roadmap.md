# roadmap.md — Development Roadmap

Based on the current architecture, the existing `docs/DEVELOPMENT_ROADMAP.md`, and the skipped phases in `TASK_QUEUE.md`.

---

## Current state (v2.0 — March 2026)

The core product is **feature-complete for early adopters**: multi-tenant auth, real-time floor plan, onboarding wizard, analytics, booking widget, and AI-powered message handling. The 2.5D isometric floor plan with night mode and animated characters differentiates TableFlow visually.

**Gap:** Phases 18–20 were skipped (AI predictions, security hardening, billing). The product is not yet monetizable or hardened for production at scale.

---

## Phase 24 — Security Hardening (near-term)

*Goal: Make the product safe for production use with paying customers.*

- Server-side gap validation hook (no concurrent double-bookings)
- Server-side party size enforcement
- Rate limiting on registration and reservation creation
- Customer deduplication with unique constraint
- HTTPS configuration guide + reverse proxy examples
- Penetration testing checklist (OWASP Top 10 for PocketBase)
- Input sanitization audit on all form fields

**Deliverable:** Security report + all critical gaps closed.

---

## Phase 25 — Mobile & UX Polish (near-term)

*Goal: Usable on tablet / phone, fully in Spanish.*

- Mobile-responsive layout (CSS media queries, breakpoints at 768px and 480px)
- Pinch-to-zoom on floor plan canvas
- Dark mode toggle in header (persisted in localStorage)
- Full Spanish UI (no English strings in components)
- Empty state illustrations (no tables, no reservations, no customers)
- Reservation list pagination
- Accessible keyboard navigation for modals and floor plan

**Deliverable:** App fully usable on an iPad in a real restaurant.

---

## Phase 26 — AI Predictions (medium-term)

*Goal: Help staff proactively manage no-shows and capacity.*

- **No-show scoring:** Per-reservation probability badge based on lead time, source, customer history, and party size. Logistic regression model with weights tuned on aggregated (anonymous) data.
- **Demand forecasting:** Show next 7 days' expected occupancy per time slot, based on historical reservations. Displayed as a heatmap in the analytics tab.
- **Smart table suggestions:** Auto-highlight the best available table on the floor plan when staff opens the reservation form.
- **Overbooking guard:** When no-show score is high, suggest accepting 1–2 extra reservations to maintain target occupancy.

**Deliverable:** AI features integrated into the existing analytics tab + reservation form.

---

## Phase 27 — Billing & Subscriptions (medium-term)

*Goal: Monetize the SaaS product.*

- Stripe Checkout integration for plan upgrades
- `subscription_plans` + `restaurant_subscriptions` collections
- Plan enforcement: max tables, max reservations/month, booking widget availability
- Billing section in settings panel (current plan, invoice history, upgrade/downgrade)
- Stripe webhook handler for subscription lifecycle events (created, updated, cancelled)
- Free tier: 1 restaurant, 5 tables, 50 reservations/month (no card required)
- Paid tiers: Standard (20 tables, 500 res/month) and Pro (unlimited)
- Superadmin billing dashboard: all restaurant subscriptions, MRR widget

**Deliverable:** Stripe-integrated SaaS billing with plan enforcement.

---

## Phase 28 — Spritesheet Characters (visual, near-term)

*Goal: Replace procedural Tom Nook sprites with high-quality animated characters.*

- PNG spritesheet loader (single image, transparent background)
- `CharacterManager` extended with animation frame tracking (walk: 4 frames, sit: 2 frames)
- `drawCharacter()` updated to use `ctx.drawImage()` with source rect from spritesheet
- Multiple character types (randomized per table on spawn)
- Character customization in restaurant settings (choose character set)

**Deliverable:** Visually polished characters matching the restaurant's theme.

---

## Phase 29 — POS & External Integrations (long-term)

*Goal: Reduce manual data entry by connecting to point-of-sale systems.*

- **Square POS:** Webhook on table close → auto-complete reservation
- **Toast POS:** Reservation sync → Toast floor plan
- **Google Calendar:** Export reservations as calendar events
- **WhatsApp Business API:** Direct integration (replace n8n Twilio node)
- **Zapier/Make connector:** Generic webhook output for third-party automation

**Deliverable:** At least one POS integration (Square or Toast) + calendar export.

---

## Phase 30 — Multi-restaurant Superadmin Console (long-term)

*Goal: Give superadmins visibility and control over all tenants.*

- Superadmin dashboard: all restaurants, user count, reservation volume, subscription status
- Tenant management: suspend, delete, impersonate (for support)
- System health: SSE connection stats, hook error log, slow query log
- Usage analytics: active restaurants, feature adoption rates
- Broadcast announcements: send in-app notifications to all restaurant_admins

**Deliverable:** Full superadmin console for managing the multi-tenant platform.

---

## Phase 31 — Scalability (long-term, if needed)

*Goal: Support 1000+ active restaurants on a single deployment.*

- **PostgreSQL backend** for PocketBase (supported via `--database` flag)
- Database connection pooling
- Read replicas for analytics queries
- CDN for static assets (`frontend/` directory)
- Horizontal PocketBase scaling with sticky SSE sessions
- Per-tenant SQLite sharding (advanced: one `.db` file per restaurant)

**Deliverable:** Architecture guide + migration script for PostgreSQL.

---

## Summary Timeline (inferred)

| Phase | Focus | Effort |
|---|---|---|
| 24 | Security hardening | 1–2 weeks |
| 25 | Mobile + UX polish | 2–3 weeks |
| 28 | Spritesheet characters | 3–5 days |
| 26 | AI predictions | 2–3 weeks |
| 27 | Billing (Stripe) | 3–4 weeks |
| 29 | POS integrations | 4–6 weeks |
| 30 | Superadmin console | 2–3 weeks |
| 31 | Scalability | Ongoing |

Phases 24, 25, and 28 are the most actionable next steps. Phase 27 (billing) is a prerequisite for commercialization but depends on having a stable, secure product (Phase 24) and a polished UX (Phase 25).
