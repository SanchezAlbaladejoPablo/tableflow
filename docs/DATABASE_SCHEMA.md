# docs/DATABASE_SCHEMA.md — Database Schema

All collections are PocketBase collections backed by SQLite.
PocketBase automatically adds `id`, `created`, and `updated` fields to every collection.

---

## Collection: `restaurants`

Stores restaurant profiles. Root entity for multi-tenant support.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string (auto) | yes | PocketBase auto-generated CUID |
| name | text | yes | Restaurant display name |
| slug | text | yes | URL-friendly identifier, unique |
| address | text | no | Street address |
| phone | text | no | Contact phone number |
| email | text | no | Contact email |
| timezone | text | yes | IANA timezone string (e.g., "Europe/Madrid") |
| opening_hours | json | no | `{"mon": "12:00-23:00", ...}` |
| created | datetime (auto) | yes | |
| updated | datetime (auto) | yes | |

---

## Collection: `tables`

Stores individual tables and their floor plan metadata.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string (auto) | yes | |
| restaurant_id | relation → restaurants | yes | |
| number | number | yes | Human-readable table number |
| capacity | number | yes | Maximum guests |
| shape | select | yes | `rectangle` \| `circle` \| `square` |
| area | select | no | `indoor` \| `outdoor` \| `bar` |
| pos_x | number | yes | X coordinate on floor plan (pixels or %) |
| pos_y | number | yes | Y coordinate on floor plan (pixels or %) |
| width | number | no | Width in floor plan units (default 80) |
| height | number | no | Height in floor plan units (default 60) |
| is_active | bool | yes | Whether the table is available for assignment |
| created | datetime (auto) | yes | |
| updated | datetime (auto) | yes | |

---

## Collection: `customers`

CRM: stores customer profiles linked to a restaurant.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string (auto) | yes | |
| restaurant_id | relation → restaurants | yes | |
| name | text | yes | Full name |
| email | text | no | |
| phone | text | no | |
| notes | text | no | Internal notes about the customer |
| visit_count | number | no | Maintained via PocketBase hooks |
| created | datetime (auto) | yes | |
| updated | datetime (auto) | yes | |

---

## Collection: `reservations`

Core reservation records.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string (auto) | yes | |
| restaurant_id | relation → restaurants | yes | |
| table_id | relation → tables | no | Assigned table (null until assigned) |
| customer_id | relation → customers | no | Linked customer (null for walk-ins) |
| guest_name | text | yes | Name for the reservation (may differ from customer.name) |
| guest_email | text | no | Contact email for this reservation |
| guest_phone | text | no | Contact phone for this reservation |
| party_size | number | yes | Number of guests |
| reserved_at | datetime | yes | Date and time of the reservation |
| duration_minutes | number | no | Expected duration (default 90) |
| status | select | yes | `pending` \| `confirmed` \| `seated` \| `completed` \| `cancelled` \| `no_show` |
| notes | text | no | Special requests, allergies, etc. |
| source | select | no | `manual` \| `phone` \| `email` \| `whatsapp` \| `ai_classified` |
| ai_confidence | number | no | 0–1 confidence score from AI classification |
| created | datetime (auto) | yes | |
| updated | datetime (auto) | yes | |

---

## Collection: `reservation_logs`

Immutable event log for audit and debugging.

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string (auto) | yes | |
| reservation_id | relation → reservations | yes | |
| restaurant_id | relation → restaurants | yes | |
| event | select | yes | `created` \| `updated` \| `cancelled` \| `table_assigned` \| `reminder_sent` \| `confirmation_sent` |
| details | json | no | Additional context for the event |
| created | datetime (auto) | yes | |

---

## Indexes

PocketBase creates indexes automatically for relation fields.
Additional recommended indexes:

- `reservations.reserved_at` — range queries for daily view
- `reservations.status` — filter by status
- `reservations.restaurant_id + reserved_at` — compound index for restaurant schedule queries
- `tables.restaurant_id + is_active` — filter active tables per restaurant
- `customers.restaurant_id + phone` — CRM lookup by phone

---

## Entity Relationship Diagram

```
restaurants
    │
    ├──< tables
    │       │
    │       └──< reservations >──── customers
    │                   │
    │                   └──< reservation_logs
    └──< customers
```

---

## Status Values Reference

### reservations.status

| Value | Meaning |
|---|---|
| pending | Created but not yet confirmed |
| confirmed | Confirmed with the customer |
| seated | Customer has arrived and is seated |
| completed | Reservation finished |
| cancelled | Cancelled by customer or restaurant |
| no_show | Customer did not arrive |

### tables — derived status (not stored, computed at query time)

| Color | Condition |
|---|---|
| Green (available) | No active reservation at the current time slot |
| Yellow (reserved) | Has a `confirmed` or `pending` reservation for current slot |
| Red (occupied) | Status is `seated` |
