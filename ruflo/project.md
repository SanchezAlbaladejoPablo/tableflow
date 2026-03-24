# project.md — TableFlow

## What the project does

TableFlow is a **SaaS restaurant reservation management system** that allows restaurants to manage their tables, reservations, customers, and staff from a single web dashboard. It combines real-time table availability tracking, an interactive isometric floor plan, customer CRM, automation workflows, and an AI-powered message classifier — all deployable without a build step or cloud vendor lock-in.

## The problem it solves

Small and mid-size restaurants rely on paper notebooks, spreadsheets, or expensive SaaS tools (OpenTable, Resy) to manage reservations. TableFlow offers:

- A self-hosted, open source alternative with no per-booking fees
- A visual, real-time floor plan so staff know at a glance which tables are free
- Automation of confirmation emails, reminders, and WhatsApp/email parsing via n8n + OpenAI
- Multi-tenant architecture so a single deployment can serve many restaurants independently

## Main features

| Feature | Status |
|---|---|
| Reservation CRUD (create, update, cancel, no-show) | ✅ Complete |
| Interactive 2.5D isometric floor plan (Canvas 2D) | ✅ Complete |
| Visual table states (available / reserved / occupied) | ✅ Complete |
| Drag-and-drop table editing (admin only) | ✅ Complete |
| Customer CRM (search, history, visit count) | ✅ Complete |
| Best-fit table assignment algorithm | ✅ Complete |
| Real-time updates via PocketBase SSE | ✅ Complete |
| User authentication (JWT, roles) | ✅ Complete |
| Multi-tenant isolation via `restaurant_id` | ✅ Complete |
| Self-service restaurant onboarding wizard | ✅ Complete |
| Per-restaurant settings (hours, gap, branding) | ✅ Complete |
| Analytics dashboard (occupancy, no-show, peak hours) | ✅ Complete |
| Public booking widget (embeddable iframe) | ✅ Complete |
| n8n automation workflows (confirmation, reminder) | ✅ Complete |
| AI message classification (OpenAI gpt-4o-mini) | ✅ Complete |
| Night-mode floor plan with candles, lamps, halos | ✅ Complete (Phase 23) |
| AI predictions (no-show score, demand forecast) | ⏭ Skipped |
| Billing & subscriptions (Stripe) | ⏭ Skipped |
| Server-side rate limiting & validation hardening | ⏭ Skipped |
| Mobile-responsive layout | ❌ Not started |

## Main users

| Role | Capabilities |
|---|---|
| **`superadmin`** | Manages all restaurants; no `restaurant_id` restriction; system administration |
| **`restaurant_admin`** | Full access to own restaurant: settings, tables, analytics, floor plan edit, widget config |
| **`staff`** | Reservations, floor plan view, customer CRM; cannot edit tables or change settings |
| **Guest (anonymous)** | Public booking widget only (scoped read/write via widget token) |

## Target market

Spanish-speaking restaurant operators (primary UI language: `es-ES`). The architecture supports any locale — only the UI strings need translation.
