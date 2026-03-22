# TableFlow — QA Test Report

**Date:** 2026-03-21
**Tester:** Autonomous QA session (Claude Code)
**Scope:** Full system — unit tests, API integration, business rules, data integrity

---

## 1. Unit Test Results

| File | Tests | Pass | Fail | Status |
|------|-------|------|------|--------|
| `tests/table-assignment.test.js` | 22 | 22 | 0 | ✅ PASS |
| `tests/automations.test.js` | 11 | 11 | 0 | ✅ PASS |
| `tests/api.test.js` | 15 | 15 | 0 | ✅ PASS (after fix) |
| **TOTAL** | **48** | **48** | **0** | ✅ ALL PASS |

### Bug Fixed: `tests/api.test.js` SyntaxError

**Root cause:** `await import()` was called inside `describe()` callbacks, which are synchronous in Node.js 24's test runner. This caused `SyntaxError: Unexpected reserved word`.

**Fix:** Hoisted all `await import()` calls to module top-level scope (before any `describe` blocks). See commit for diff.

---

## 2. API Integration Tests (against live PocketBase at `localhost:8090`)

### 2.1 Reservation CRUD

| Test | Expected | Result |
|------|----------|--------|
| `POST /reservations` with all required fields | 200, record created | ✅ PASS |
| `POST /reservations` missing `guest_name` | 400 validation error | ✅ PASS |
| `POST /reservations` with invalid `status` value | 400 validation error | ✅ PASS |
| `GET /reservations` list | 200, paginated results | ✅ PASS |
| `PATCH /reservations/:id` status update | 200, record updated | ✅ PASS |
| `DELETE /reservations/:id` | 204 | ✅ PASS |

### 2.2 Status Lifecycle

Full status transition cycle validated via sequential PATCH requests:

```
pending → confirmed → seated → completed
```

All transitions accepted. No guard rails at the API level (transitions are not constrained server-side — any status can be set to any other status directly).

### 2.3 Table Assignment

Best Fit algorithm verified via unit tests (22 tests). Key behaviors confirmed:
- Tables with `capacity < partySize` are excluded
- Inactive tables (`is_active: false`) are excluded
- Occupied tables are excluded
- Lowest `capacity - partySize` score wins
- Area preference breaks ties without overriding capacity fit
- Ties in score resolved by `table.number` ascending

### 2.4 Customer Auto-link

`ReservationForm.save()` implements:
1. Look up customer by phone (if provided)
2. If found → link `customer_id`
3. If not found → create new customer, then link

Logic verified in code review. `findByPhone` returns `null` (not error) on miss — tested in unit tests.

---

## 3. Business Rule Verification

### 3.1 Availability Check ✅

`getTableAvailability(restaurantId, tableIds, slotStart, durationMinutes)`:
- Fetches reservations in conservative window: `slotStart - 480min` to `slotStart + duration + 480min`
- Applies precise JS-side overlap check: `reservedAt < slotEnd && reservedEnd > slotStart`
- Correctly excludes `cancelled` and `no_show` statuses from blocking

### 3.2 Duplicate Booking ⚠️ RISK

**Finding:** There is no database-level constraint preventing two confirmed reservations for the same table at the same time. Duplicate protection relies entirely on the frontend `getTableAvailability` check.

**Risk:** Race condition possible if two users submit simultaneously, or if records are created directly via the PocketBase Admin UI or API without going through the frontend.

**Recommendation:** Add a PocketBase hook (`onRecordBeforeCreateSuccess`, `onRecordBeforeUpdateSuccess`) that queries for conflicts and aborts if found.

### 3.3 Automatic Floor Plan Status ⚠️ SPEC DISCREPANCY

**Spec requirement (prompt):** Floor plan should show real-time table status based on current time (e.g., "mesa pending si hay reserva en próximas 3h").

**Implementation:** The floor plan only shows availability when the user explicitly clicks "Check Availability" with a manually selected datetime. There is no automatic current-time-based status computation on load.

**Impact:** On opening the app, all tables appear with no status color. Staff must manually trigger the check.

**Recommendation:** On `FloorPlan.render()` / app init, automatically call `checkAvailability` with `now` as the slot time to show a live snapshot. This requires a small change in `frontend/src/app.js`.

---

## 4. Infrastructure Issues

### 4.1 Hooks Not Active ❌

**Finding:** `backend/pocketbase/hooks/reservation-hooks.js` exists and is correctly implemented, but **hooks are never loaded** unless PocketBase is started with the `--hooksDir` flag.

**Current start command:**
```
./pocketbase serve --http 127.0.0.1:8090
```

**Required start command:**
```
./pocketbase serve --http 127.0.0.1:8090 --hooksDir backend/pocketbase/hooks
```

**Consequence:** The `reservation_logs` collection remains empty. No events are recorded. The `visit_count` increment on completion is also not executed.

**Fix:** Update startup command. See also `docs/SETUP.md` — this flag is missing from the documented start command.

### 4.2 n8n Workflows Not Configured (Pending)

The following tasks are documented in `TASK_QUEUE.md` as PENDING (Phase 11):

| Task | Description |
|------|-------------|
| TASK-034 | Install n8n |
| TASK-035 | Start n8n and verify UI |
| TASK-036 | Import 4 workflow JSONs from `automations/n8n/` |
| TASK-037 | Configure SMTP credentials |
| TASK-038 | Configure OpenAI API Key |
| TASK-039 | Update PocketBase URL variable in each workflow |
| TASK-040 | Activate all workflows |
| TASK-041 | Add PocketBase webhook → n8n confirmation endpoint |
| TASK-042 | End-to-end: create reservation → verify email |

**Consequence:** AI classification, confirmation emails, and 24h reminders are non-functional until n8n is set up.

---

## 5. Security Review

| Area | Finding | Severity |
|------|---------|----------|
| XSS | `escHtml()` used consistently in all DOM writes | ✅ OK |
| API rules | All collections have `listRule/viewRule/createRule/updateRule/deleteRule: ""` (open) | ⚠️ DEVELOPMENT ONLY — tighten before production |
| Auth | No user authentication implemented (open API) | ⚠️ Expected for current scope — add before production |
| SQL injection | PocketBase handles all SQL; no raw queries in custom code | ✅ OK |
| Race condition | Duplicate booking possible (see §3.2) | ⚠️ MEDIUM |

---

## 6. Final Status Matrix

| Area | Status | Notes |
|------|--------|-------|
| Unit tests (48 tests) | ✅ ALL PASS | Fixed `api.test.js` import syntax |
| Reservation CRUD API | ✅ PASS | Full lifecycle working |
| Table Best Fit algorithm | ✅ PASS | 22 unit tests |
| Customer auto-link | ✅ PASS | Code review + unit tests |
| Overlap detection | ✅ PASS | JS-side workaround for PocketBase filter limit |
| Floor plan rendering | ✅ PASS | SVG + status colors |
| Reservation logs (hooks) | ❌ NOT ACTIVE | Requires `--hooksDir` flag at startup |
| Automatic floor plan status | ⚠️ DISCREPANCY | Manual trigger only, not auto on load |
| Duplicate booking guard | ⚠️ RISK | Frontend-only check; race condition possible |
| n8n workflows | ⏳ PENDING | Phase 11 tasks not yet executed |
| Production security | ⚠️ NOT READY | Open API rules, no auth — development config |

---

## 7. Recommended Fixes (Priority Order)

1. **[HIGH]** Start PocketBase with `--hooksDir backend/pocketbase/hooks` — update `docs/SETUP.md`
2. **[MEDIUM]** Auto-trigger availability check on app load with current time
3. **[MEDIUM]** Add server-side duplicate booking guard in a PocketBase hook
4. **[LOW]** Complete n8n setup (Phase 11, TASK-034 to TASK-042)
5. **[PRE-PROD]** Tighten PocketBase API rules and add authentication
