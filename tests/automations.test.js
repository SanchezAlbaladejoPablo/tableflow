/**
 * automations.test.js
 *
 * Tests for automation trigger logic and AI classifier integration.
 * Uses Node.js built-in test runner. Mocks fetch to avoid real network calls.
 *
 * Run: node --test automations.test.js
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Setup globals needed by browser modules
// ---------------------------------------------------------------------------

globalThis.window = {
    APP_CONFIG: {
        POCKETBASE_URL: "http://localhost:8090",
        N8N_BASE_URL:   "http://localhost:5678",
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @param {any} body
 * @param {number} [status]
 * @returns {Response}
 */
function mockResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Replace globalThis.fetch for the duration of fn(), then restore.
 *
 * @param {(calls: Array<{url: string, options: RequestInit}>) => Promise<void>} fn
 * @param {Response|Error} mockValue
 */
async function withMockFetch(mockValue, fn) {
    const calls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        if (mockValue instanceof Error) throw mockValue;
        return mockValue;
    };
    try {
        await fn(calls);
    } finally {
        globalThis.fetch = original;
    }
}

// ---------------------------------------------------------------------------
// AI Classifier — classifyMessage()
// ---------------------------------------------------------------------------

const { classifyMessage, classificationToReservation } =
    await import("../frontend/src/services/ai-classifier.js");

describe("classifyMessage()", () => {
    test("returns error for empty message without hitting network", async () => {
        let fetchCalled = false;
        const original = globalThis.fetch;
        globalThis.fetch = async () => { fetchCalled = true; return mockResponse({}); };

        const result = await classifyMessage("");

        globalThis.fetch = original;

        assert.equal(result.success, false);
        assert.equal(result.error.status, 400);
        assert.equal(fetchCalled, false);
    });

    test("returns error for whitespace-only message", async () => {
        const result = await classifyMessage("   ");
        assert.equal(result.success, false);
    });

    test("calls n8n webhook with correct payload", async () => {
        const classified = {
            intent: "new_reservation",
            name: "Alice",
            phone: "+34 600 111 222",
            email: null,
            party_size: 4,
            datetime: "2026-06-15T20:00:00.000Z",
            notes: "Anniversary",
            confidence: 0.95,
        };

        await withMockFetch(mockResponse(classified), async (calls) => {
            const result = await classifyMessage("Hi, I'd like a table for 4 on June 15th at 8pm", {
                channel: "whatsapp",
                from: "+34 600 111 222",
            });

            assert.equal(calls.length, 1);
            assert.match(calls[0].url, /ai-classifier/);
            assert.equal(calls[0].options.method, "POST");

            const body = JSON.parse(calls[0].options.body);
            assert.match(body.message, /table for 4/);
            assert.equal(body.channel, "whatsapp");

            assert.equal(result.success, true);
            assert.equal(result.data.intent, "new_reservation");
            assert.equal(result.data.party_size, 4);
            assert.equal(result.data.confidence, 0.95);
        });
    });

    test("returns success:false on HTTP error from classifier", async () => {
        await withMockFetch(mockResponse({ error: "Internal" }, 500), async () => {
            const result = await classifyMessage("Table for 2 tonight");
            assert.equal(result.success, false);
            assert.equal(result.error.status, 500);
        });
    });

    test("returns success:false on network error", async () => {
        await withMockFetch(new TypeError("Failed to fetch"), async () => {
            const result = await classifyMessage("Table for 2 tonight");
            assert.equal(result.success, false);
            assert.equal(result.error.status, 0);
        });
    });
});

// ---------------------------------------------------------------------------
// classificationToReservation()
// ---------------------------------------------------------------------------

describe("classificationToReservation()", () => {
    test("maps all fields correctly", () => {
        const input = {
            intent: "new_reservation",
            name: "Bob",
            phone: "+34 600 999 888",
            email: "bob@test.com",
            party_size: 3,
            datetime: "2026-06-15T20:00:00.000Z",
            notes: "Birthday",
            confidence: 0.88,
        };

        const reservation = classificationToReservation(input);

        assert.equal(reservation.guest_name,    "Bob");
        assert.equal(reservation.guest_phone,   "+34 600 999 888");
        assert.equal(reservation.guest_email,   "bob@test.com");
        assert.equal(reservation.party_size,    3);
        assert.equal(reservation.reserved_at,   "2026-06-15T20:00:00.000Z");
        assert.equal(reservation.notes,         "Birthday");
        assert.equal(reservation.source,        "ai_classified");
        assert.equal(reservation.ai_confidence, 0.88);
    });

    test("falls back to empty strings and defaults for null fields", () => {
        const input = {
            intent: "new_reservation",
            name: null,
            phone: null,
            email: null,
            party_size: null,
            datetime: null,
            notes: null,
            confidence: 0,
        };

        const reservation = classificationToReservation(input);

        assert.equal(reservation.guest_name,   "");
        assert.equal(reservation.guest_phone,  "");
        assert.equal(reservation.guest_email,  "");
        assert.equal(reservation.party_size,   2);  // default
        assert.equal(reservation.reserved_at,  "");
        assert.equal(reservation.source,       "ai_classified");
    });
});

// ---------------------------------------------------------------------------
// Reservation log events — hook logic verification
// ---------------------------------------------------------------------------

describe("Reservation hook logic (pure functions)", () => {
    /**
     * Simulate the hook's changed-fields detection logic inline
     * without requiring PocketBase. Tests the algorithm, not the hook binding.
     */
    function detectChangedFields(original, updated, trackedFields) {
        const changed = {};
        for (const field of trackedFields) {
            const oldVal = original[field];
            const newVal = updated[field];
            if (String(oldVal) !== String(newVal)) {
                changed[field] = { from: oldVal, to: newVal };
            }
        }
        return changed;
    }

    const TRACKED = ["status", "table_id", "reserved_at", "party_size", "guest_name"];

    test("detects status change", () => {
        const original = { status: "pending", table_id: "", party_size: 2, reserved_at: "2026-01-01", guest_name: "A" };
        const updated  = { ...original, status: "confirmed" };
        const changed = detectChangedFields(original, updated, TRACKED);
        assert.ok("status" in changed);
        assert.equal(changed.status.from, "pending");
        assert.equal(changed.status.to,   "confirmed");
    });

    test("detects table assignment", () => {
        const original = { status: "pending", table_id: "", party_size: 2, reserved_at: "2026-01-01", guest_name: "A" };
        const updated  = { ...original, table_id: "t123" };
        const changed = detectChangedFields(original, updated, TRACKED);
        assert.ok("table_id" in changed);
        assert.equal(changed.table_id.to, "t123");
    });

    test("returns empty object when nothing changes", () => {
        const record = { status: "confirmed", table_id: "t1", party_size: 4, reserved_at: "2026-01-01", guest_name: "B" };
        const changed = detectChangedFields(record, { ...record }, TRACKED);
        assert.equal(Object.keys(changed).length, 0);
    });

    test("determines event type from changed fields", () => {
        function determineEvent(changedFields) {
            let event = "updated";
            if (changedFields.status?.to === "cancelled") event = "cancelled";
            if (changedFields.table_id?.to) event = "table_assigned";
            return event;
        }

        assert.equal(determineEvent({ status: { from: "pending", to: "cancelled" } }), "cancelled");
        assert.equal(determineEvent({ table_id: { from: "", to: "t123" } }), "table_assigned");
        assert.equal(determineEvent({ party_size: { from: 2, to: 4 } }), "updated");
        // table_assigned takes priority over cancelled if both fields change
        assert.equal(determineEvent({ status: { to: "cancelled" }, table_id: { to: "t1" } }), "table_assigned");
    });
});
