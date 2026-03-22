/**
 * table-assignment.test.js
 *
 * Unit tests for the table assignment algorithm.
 * Uses Node.js built-in test runner (node:test) — no extra dependencies.
 *
 * Run: node --test table-assignment.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
    suggestTables,
    getBestTable,
    isTableAvailable,
    computeTableStatus,
} from "../frontend/src/utils/table-assignment.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Build a minimal Table object.
 * @param {Partial<import('../frontend/src/types.js').Table>} overrides
 * @returns {import('../frontend/src/types.js').Table}
 */
function makeTable(overrides) {
    return {
        id:         "t1",
        created:    "2026-01-01T00:00:00Z",
        updated:    "2026-01-01T00:00:00Z",
        restaurant_id: "r1",
        number:     1,
        capacity:   4,
        shape:      "rectangle",
        area:       "indoor",
        pos_x:      100,
        pos_y:      100,
        width:      80,
        height:     60,
        is_active:  true,
        ...overrides,
    };
}

/**
 * Build a TableAvailability object.
 * @param {import('../frontend/src/types.js').Table} table
 * @param {boolean} isAvailable
 * @param {import('../frontend/src/types.js').Reservation[]} [reservations]
 * @returns {import('../frontend/src/types.js').TableAvailability}
 */
function makeAvail(table, isAvailable, reservations = []) {
    return { table, isAvailable, activeReservations: reservations };
}

/**
 * Build a minimal Reservation object.
 * @param {Partial<import('../frontend/src/types.js').Reservation>} overrides
 * @returns {import('../frontend/src/types.js').Reservation}
 */
function makeReservation(overrides) {
    return {
        id: "res1",
        created: "2026-01-01T00:00:00Z",
        updated: "2026-01-01T00:00:00Z",
        restaurant_id: "r1",
        table_id: "t1",
        customer_id: "",
        guest_name: "Test Guest",
        guest_email: "",
        guest_phone: "",
        party_size: 2,
        reserved_at: "2026-01-01T20:00:00Z",
        duration_minutes: 90,
        status: "confirmed",
        notes: "",
        source: "manual",
        ai_confidence: 0,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// suggestTables
// ---------------------------------------------------------------------------

describe("suggestTables", () => {
    test("returns empty array when no tables are available", () => {
        const table = makeTable({ id: "t1", capacity: 4 });
        const avail = [makeAvail(table, false)];
        const result = suggestTables([table], avail, 2);
        assert.equal(result.length, 0);
    });

    test("returns empty array when party size exceeds all table capacities", () => {
        const table = makeTable({ id: "t1", capacity: 2 });
        const avail = [makeAvail(table, true)];
        const result = suggestTables([table], avail, 6);
        assert.equal(result.length, 0);
    });

    test("exact fit scores 0", () => {
        const table = makeTable({ id: "t1", capacity: 4 });
        const avail = [makeAvail(table, true)];
        const [suggestion] = suggestTables([table], avail, 4);
        assert.equal(suggestion.score, 0);
        assert.equal(suggestion.reason, "Exact fit");
    });

    test("1 spare seat scores 1", () => {
        const table = makeTable({ id: "t1", capacity: 4 });
        const avail = [makeAvail(table, true)];
        const [suggestion] = suggestTables([table], avail, 3);
        assert.equal(suggestion.score, 1);
        assert.equal(suggestion.reason, "1 spare seat");
    });

    test("multiple spare seats score correctly", () => {
        const table = makeTable({ id: "t1", capacity: 8 });
        const avail = [makeAvail(table, true)];
        const [suggestion] = suggestTables([table], avail, 2);
        assert.equal(suggestion.score, 6);
        assert.equal(suggestion.reason, "6 spare seats");
    });

    test("sorts by score ascending (best fit first)", () => {
        const t2 = makeTable({ id: "t2", number: 2, capacity: 2 });
        const t4 = makeTable({ id: "t4", number: 4, capacity: 4 });
        const t6 = makeTable({ id: "t6", number: 6, capacity: 6 });
        const avail = [makeAvail(t2, true), makeAvail(t4, true), makeAvail(t6, true)];
        const result = suggestTables([t2, t4, t6], avail, 2);
        assert.equal(result[0].table.id, "t2"); // exact fit
        assert.equal(result[1].table.id, "t4"); // 2 spare
        assert.equal(result[2].table.id, "t6"); // 4 spare
    });

    test("ties broken by table number ascending", () => {
        const t3 = makeTable({ id: "t3", number: 3, capacity: 4 });
        const t1 = makeTable({ id: "t1", number: 1, capacity: 4 });
        const t2 = makeTable({ id: "t2", number: 2, capacity: 4 });
        const avail = [makeAvail(t3, true), makeAvail(t1, true), makeAvail(t2, true)];
        const result = suggestTables([t3, t1, t2], avail, 2);
        // All have same score (2), sorted by table number
        assert.equal(result[0].table.number, 1);
        assert.equal(result[1].table.number, 2);
        assert.equal(result[2].table.number, 3);
    });

    test("area preference breaks ties but does not override fit", () => {
        const indoor  = makeTable({ id: "i1", number: 1, capacity: 4, area: "indoor" });
        const outdoor = makeTable({ id: "o1", number: 2, capacity: 4, area: "outdoor" });
        const avail   = [makeAvail(indoor, true), makeAvail(outdoor, true)];
        const result  = suggestTables([indoor, outdoor], avail, 2, { preferArea: "outdoor" });
        // Both have score 2, but outdoor gets -0.5 bonus → comes first
        assert.equal(result[0].table.id, "o1");
        assert.match(result[0].reason, /preferred area/);
    });

    test("area preference does NOT override capacity fit", () => {
        const exact   = makeTable({ id: "e1", number: 1, capacity: 4, area: "indoor" });   // score 0
        const outdoor = makeTable({ id: "o1", number: 2, capacity: 6, area: "outdoor" });  // score 2 - 0.5 = 1.5
        const avail   = [makeAvail(exact, true), makeAvail(outdoor, true)];
        const result  = suggestTables([exact, outdoor], avail, 4, { preferArea: "outdoor" });
        // Exact fit should still win despite not being the preferred area
        assert.equal(result[0].table.id, "e1");
    });

    test("inactive tables are excluded", () => {
        const active   = makeTable({ id: "a1", capacity: 4, is_active: true });
        const inactive = makeTable({ id: "i1", capacity: 4, is_active: false });
        const avail    = [makeAvail(active, true), makeAvail(inactive, true)];
        const result   = suggestTables([active, inactive], avail, 2);
        assert.equal(result.length, 1);
        assert.equal(result[0].table.id, "a1");
    });

    test("unavailable tables are excluded", () => {
        const t1 = makeTable({ id: "t1", capacity: 4 });
        const t2 = makeTable({ id: "t2", capacity: 4 });
        const avail = [makeAvail(t1, false), makeAvail(t2, true)];
        const result = suggestTables([t1, t2], avail, 2);
        assert.equal(result.length, 1);
        assert.equal(result[0].table.id, "t2");
    });
});

// ---------------------------------------------------------------------------
// getBestTable
// ---------------------------------------------------------------------------

describe("getBestTable", () => {
    test("returns null when no tables available", () => {
        const result = getBestTable([], [], 2);
        assert.equal(result, null);
    });

    test("returns the top suggestion", () => {
        const table = makeTable({ id: "t1", capacity: 2 });
        const avail = [makeAvail(table, true)];
        const result = getBestTable([table], avail, 2);
        assert.equal(result?.table.id, "t1");
    });
});

// ---------------------------------------------------------------------------
// isTableAvailable
// ---------------------------------------------------------------------------

describe("isTableAvailable", () => {
    test("returns true when table is available", () => {
        const table = makeTable({ id: "t1" });
        const avail = [makeAvail(table, true)];
        assert.equal(isTableAvailable("t1", avail), true);
    });

    test("returns false when table is not available", () => {
        const table = makeTable({ id: "t1" });
        const avail = [makeAvail(table, false)];
        assert.equal(isTableAvailable("t1", avail), false);
    });

    test("returns false when table not in availability list", () => {
        assert.equal(isTableAvailable("unknown", []), false);
    });
});

// ---------------------------------------------------------------------------
// computeTableStatus
// ---------------------------------------------------------------------------

describe("computeTableStatus", () => {
    test("returns 'available' when no reservations", () => {
        const table = makeTable({ id: "t1" });
        const avail = [makeAvail(table, true, [])];
        assert.equal(computeTableStatus("t1", avail), "available");
    });

    test("returns 'available' when not in availability list", () => {
        assert.equal(computeTableStatus("unknown", []), "available");
    });

    test("returns 'reserved' when has confirmed reservation", () => {
        const table = makeTable({ id: "t1" });
        const res   = makeReservation({ table_id: "t1", status: "confirmed" });
        const avail = [makeAvail(table, false, [res])];
        assert.equal(computeTableStatus("t1", avail), "reserved");
    });

    test("returns 'reserved' when has pending reservation", () => {
        const table = makeTable({ id: "t1" });
        const res   = makeReservation({ table_id: "t1", status: "pending" });
        const avail = [makeAvail(table, false, [res])];
        assert.equal(computeTableStatus("t1", avail), "reserved");
    });

    test("returns 'occupied' when has seated reservation", () => {
        const table = makeTable({ id: "t1" });
        const res   = makeReservation({ table_id: "t1", status: "seated" });
        const avail = [makeAvail(table, false, [res])];
        assert.equal(computeTableStatus("t1", avail), "occupied");
    });

    test("'occupied' takes priority over 'reserved'", () => {
        const table = makeTable({ id: "t1" });
        const seated    = makeReservation({ id: "r1", status: "seated" });
        const confirmed = makeReservation({ id: "r2", status: "confirmed" });
        const avail = [makeAvail(table, false, [confirmed, seated])];
        assert.equal(computeTableStatus("t1", avail), "occupied");
    });
});
