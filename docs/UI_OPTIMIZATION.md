# TableFlow — UI Optimization

**Date:** 2026-03-21

## Objective

Reduce friction in daily restaurant operations. Staff need to create reservations quickly without understanding technical fields. The primary workflow is: open app → see who's in tonight → seat a new table → done.

---

## Changes Made

### 1. Floor Plan — Auto-Availability on Load

**Before:** Staff had to set a date, duration, party size, then click "Check Availability". Tables showed no color until that sequence was completed.

**After:** Floor plan loads and immediately colors tables based on the current time. Staff see live status the moment the app opens. Changing the date/time or party size re-checks automatically (debounced 400ms).

**Why:** A restaurant opening at 7pm wants to see which tables are free *right now*, not after navigating 4 fields and clicking a button.

**Removed:** "Check Availability" button (implicit via auto-check).

---

### 2. Floor Plan — Removed "Duration (minutes)" Field

**Before:** A "Duration (min)" number input exposed a technical parameter to front-of-house staff.

**After:** Duration is silently defaulted to 90 minutes (standard table turn). Not visible in the UI.

**Why:** Restaurant hosts think in "table turns", not minutes. 90 minutes is a reasonable universal default. If needed, this can be made configurable in settings.

---

### 3. Floor Plan — Removed Sidebar with Text Suggestions

**Before:** A sidebar panel appeared with "Table Suggestions" cards listing table number, capacity, and a reason string. The floor plan already used colors (green/yellow/red) to communicate availability.

**After:** The floor plan now occupies the full width. A small legend (Available / Reserved / Occupied) replaces the sidebar. The color coding on the floor plan SVG is the suggestion — green tables are available.

**Why:** Duplicate information. The floor plan is already a visual representation of availability. The sidebar added cognitive load without adding value.

---

### 4. Reservation Form — Field Order Redesigned

**Before:** Fields in order: Guest name → Email → Phone → Party size → Duration → Date → Table → Status → Source → Notes. The most important fields (name, phone, party size) were not grouped together. Duration and Source added noise.

**After:** Fields in order:
- Row 1: **Name** (wide) + **Guests** (narrow) — the two most critical fields, side by side
- Row 2: **Phone** + **Email** — contact details together; phone first (most commonly used for lookup)
- Row 3: **Date & Time** + **Table** — when and where, side by side
- Status (edit mode only)
- Notes (optional, last)

**Why:** Eye tracking follows a Z-pattern. Critical data first, optional data last. A fast reservation entry takes: name → guests → phone → date → save. Five fields, no scrolling.

---

### 5. Reservation Form — Removed "Duration (minutes)" Field

**Before:** A "Duration (minutes)" input was shown in the form.

**After:** Duration is always set to 90 in `#collectFormData()`. Not visible to staff.

**Why:** Same as floor plan — this is a technical detail staff don't manage during booking.

---

### 6. Reservation Form — Removed "Source" Field

**Before:** A dropdown "Source" (manual / phone / email / whatsapp) appeared in every new reservation form.

**After:** Source is silently set to `"manual"` for new reservations. For edits, the original source value is preserved.

**Why:** This field exists for analytics and AI classification. When a staff member manually enters a reservation, the source is always "manual". The dropdown added a required mental step with a single obvious answer.

---

### 7. Reservations List — Removed "Source" Column

**Before:** The reservations table had 7 columns including "Source".

**After:** 6 columns: Guest, Party, Date & Time, Table, Status, Actions.

**Why:** Source is not actionable information during daily operations. It can be visible in detailed views or reports if needed.

---

### 8. Reservations List — Quick Filters + Auto-Filter

**Before:** Staff had to type a date in a date field, select a status, then click "Apply" to filter reservations.

**After:**
- Three quick filter buttons: **Today** / **Tomorrow** / **All** — one click to see tonight's reservations
- Date and status filters auto-apply on change (no Apply button needed)
- Default filter = **Today** when opening the tab

**Why:** The most common view is "tonight's reservations". Making it one click instead of three-clicks-and-a-button eliminates the most repeated daily action.

---

## What Was NOT Changed

- All backend API calls and services are unchanged
- PocketBase schema and hooks are unchanged
- n8n automation workflows are unchanged
- All data still flows correctly: customer auto-link, availability check, status transitions
- All unit tests continue to pass (48/48)

---

## Files Modified

| File | Change |
|------|--------|
| `frontend/index.html` | Floor plan controls simplified; quick filter buttons added; sidebar removed |
| `frontend/styles/main.css` | Quick filter styles; floor plan legend; removed sidebar/suggestion card styles |
| `frontend/src/app.js` | Auto-check on load; debounced auto-check; quick filter logic; auto-filter on change; removed `suggestTables` import and `renderSuggestions` function |
| `frontend/src/components/reservation-form.js` | Field order redesigned; duration and source removed from form; silent defaults in `#collectFormData` |
| `frontend/src/components/reservation-list.js` | Source column removed from header and rows |
