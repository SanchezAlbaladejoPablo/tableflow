# domain.md — Domain Model

## Core Entities

### Restaurant

The root tenant entity. Every other entity belongs to exactly one restaurant.

```
Restaurant {
    id:            string (PocketBase auto-ID)
    name:          string
    slug:          string (unique, URL-safe)
    address:       string
    phone:         string
    email:         string
    timezone:      string (IANA, e.g. "Europe/Madrid")
    opening_hours: JSON  { mon: { open, close }, tue: ..., ... }
    created:       datetime
    updated:       datetime
}
```

### Table

A physical table inside a restaurant. Carries floor plan position metadata.

```
Table {
    id:            string
    restaurant_id: → Restaurant
    number:        int (1–999, unique per restaurant)
    capacity:      int (1–50 persons)
    shape:         enum { rect | circle | square }
    area:          enum { indoor | outdoor | bar }
    pos_x:         float  (world-space X, 0–800)
    pos_y:         float  (world-space Y, 0–500)
    width:         float  (world-space units)
    height:        float  (world-space units)
    is_active:     bool
    created:       datetime
    updated:       datetime
}
```

### Customer

CRM record. Can be linked to reservations for history and loyalty tracking.

```
Customer {
    id:            string
    restaurant_id: → Restaurant
    name:          string
    email:         string (optional)
    phone:         string (optional)
    notes:         string (VIP notes, allergies, etc.)
    visit_count:   int   (auto-incremented by PocketBase hook on reservation completion)
    last_visit:    datetime (nullable)
    created:       datetime
    updated:       datetime
}
```

### Reservation

Central entity. Represents a booking slot on a table.

```
Reservation {
    id:               string
    restaurant_id:    → Restaurant
    table_id:         → Table (nullable: unassigned at creation)
    customer_id:      → Customer (nullable: walk-in or guest)
    guest_name:       string (denormalized from Customer for fast display)
    guest_email:      string (denormalized)
    guest_phone:      string (denormalized)
    party_size:       int
    reserved_at:      datetime  (start of slot)
    duration_minutes: int       (default: per-restaurant setting, typically 90)
    status:           enum { pending | confirmed | seated | completed | cancelled | no_show }
    notes:            string
    source:           enum { manual | phone | email | whatsapp | ai_classified | widget }
    ai_confidence:    float  (0.0–1.0, set when source = ai_classified)
    created:          datetime
    updated:          datetime
}
```

**Derived field:** slot end = `reserved_at + duration_minutes`

### ReservationLog

Immutable audit trail. One row per event on a reservation.

```
ReservationLog {
    id:             string
    reservation_id: → Reservation
    restaurant_id:  → Restaurant (denormalized for fast queries)
    event:          enum { created | updated | cancelled | table_assigned | reminder_sent | confirmation_sent }
    details:        JSON (arbitrary event payload)
    created:        datetime
}
```

### User

Authentication entity extended with role and restaurant association.

```
User {
    id:            string (PocketBase auth collection)
    email:         string (unique)
    name:          string
    role:          enum { superadmin | restaurant_admin | staff }
    restaurant_id: → Restaurant (nullable for superadmin)
    active:        bool
    created:       datetime
    updated:       datetime
}
```

### RestaurantSettings

One-to-one extension of Restaurant with configurable operational parameters.

```
RestaurantSettings {
    id:                      string
    restaurant_id:           → Restaurant (unique relation)
    timezone:                string (IANA)
    default_duration_minutes: int   (15–480)
    min_gap_minutes:         int   (0–480, gap enforced between consecutive bookings on same table)
    opening_time:            string (HH:MM)
    closing_time:            string (HH:MM)
    logo_url:                string
    primary_color:           string (CSS hex e.g. "#C0392B")
    booking_widget_enabled:  bool
    booking_widget_token:    string (random secret for scoped widget access)
    created:                 datetime
    updated:                 datetime
}
```

---

## Entity Relationships

```
Restaurant ──< Table
Restaurant ──< Customer
Restaurant ──< Reservation
Restaurant ──< ReservationLog
Restaurant ──1 RestaurantSettings
Restaurant ──< User (staff/admin)

Reservation >── Table (nullable)
Reservation >── Customer (nullable)
ReservationLog >── Reservation
```

All entities are **hard-deleted** (no soft-delete). `reservation_logs` provides the audit trail.

---

## Key Domain Concepts

### Table Availability

A table is **available** for a slot `[start, end)` if:
1. `table.is_active = true`
2. No overlapping `Reservation` with `status NOT IN (cancelled, no_show)` exists, where overlap is:
   `existing.reserved_at < end AND (existing.reserved_at + existing.duration_minutes * 60s) > start`
3. Gap rule: additionally, `min_gap_minutes` is applied to both sides of the slot (configurable per restaurant)

Availability is computed **in the browser** after fetching relevant reservations and tables. No SQL overlap query.

### Reservation Status Lifecycle

```
pending → confirmed → seated → completed
         ↘              ↘
          cancelled    no_show
```

- `pending`: just created (e.g. via widget, unconfirmed call)
- `confirmed`: staff or system confirmed the booking
- `seated`: guests arrived and are at the table
- `completed`: guests left, table freed
- `cancelled`: booking cancelled by guest or staff
- `no_show`: guest did not arrive

### Table Status (Visual)

Derived from reservations, not stored. Computed by `computeTableStatus()`:

```
available  ← no reservation in next 3 hours
reserved   ← confirmed/pending reservation within next 3 hours
occupied   ← currently seated (status = "seated")
pending    ← reservation exists but not yet confirmed (subset of reserved)
```

Color mapping (iso-palette): available=`#4ADE80`, reserved=`#FCD34D`, occupied=`#F87171`, pending=`#93C5FD`

### Floor Plan Coordinate System

Tables store position in **world space** (0–800 x, 0–500 y, inherited from the v1.0 SVG viewBox). The 2.5D engine projects to **screen space** via isometric transformation:

```
ISO_SCALE = 0.58
ix = world_x × ISO_SCALE
iy = world_y × ISO_SCALE
screen_x = (ix - iy) + OFFSET_X   // diagonal left-right axis
screen_y = (ix + iy) × 0.5 + OFFSET_Y  // diagonal up-down axis
```

### AI Classification

When a WhatsApp/email message arrives via n8n:
1. Raw text is sent to `gpt-4o-mini` with a structured extraction prompt
2. Response includes: `intent` (new/cancel/modify), `date`, `time`, `party_size`, `guest_name`, `guest_phone`
3. If `intent = new`, a reservation is pre-filled in the form with `source = "ai_classified"` and `ai_confidence` (0–1)
4. Staff reviews and confirms or adjusts before saving

---

## Data Integrity Notes

- `restaurant_id` is set by the server (from JWT) on create; client cannot inject a different value (enforced by PocketBase rules)
- `customer_id` on reservations is nullable; deduplication on `phone` or `email` is attempted at create time but has a known race condition in concurrent creates
- `visit_count` is maintained by a PocketBase server-side hook, not by frontend logic
- `reservation_logs` rows are never updated or deleted — append-only audit trail
- PocketBase datetime format uses a **space separator** (not ISO 8601 `T`): `"2026-03-21 19:00:00.000Z"`. The utility `toPbDate()` converts JS `Date` to this format; `parsePbDate()` normalizes PocketBase dates before `new Date()`.
