/**
 * api.test.js
 *
 * Integration-style tests for the frontend API service layer.
 * These tests mock the fetch API to verify request construction,
 * error handling, and response parsing without a real PocketBase instance.
 *
 * Run: node --test api.test.js
 */

import { test, describe, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Polyfill fetch for Node.js 18 (fetch is available in 18+ but we ensure it)
// ---------------------------------------------------------------------------

if (!globalThis.fetch) {
    // If running on Node.js 18 without --experimental-fetch, skip gracefully
    console.warn("fetch not available — skipping API tests. Use Node.js 18+ with built-in fetch.");
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock fetch Response.
 *
 * @param {any}    body
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
 * Mock fetch to return a specific response, then restore it.
 * Returns the captured request URL and options.
 *
 * @param {Response} response
 * @param {() => Promise<void>} fn
 */
async function withMockFetch(response, fn) {
    const calls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        return response;
    };
    try {
        await fn(calls);
    } finally {
        globalThis.fetch = original;
    }
}

// ---------------------------------------------------------------------------
// Import services after setting up globals
// ---------------------------------------------------------------------------

// We need to set APP_CONFIG before importing api.js
globalThis.window = { APP_CONFIG: { POCKETBASE_URL: "http://localhost:8090" } };

const { initClient, setAuthToken, get, post, patch, del, request } =
    await import("../frontend/src/services/api.js");

const { updateStatus } =
    await import("../frontend/src/services/reservations.js");

const { findByPhone } =
    await import("../frontend/src/services/customers.js");

initClient("http://localhost:8090");

// ---------------------------------------------------------------------------
// request() — core wrapper
// ---------------------------------------------------------------------------

describe("api.request()", () => {
    beforeEach(() => setAuthToken(null));

    test("constructs correct URL and method for GET", async () => {
        await withMockFetch(mockResponse({ items: [] }), async (calls) => {
            await get("/api/collections/tables/records");
            assert.equal(calls[0].url, "http://localhost:8090/api/collections/tables/records");
            assert.equal(calls[0].options.method, "GET");
        });
    });

    test("appends query parameters to GET URL", async () => {
        await withMockFetch(mockResponse({}), async (calls) => {
            await get("/api/collections/tables/records", { filter: 'restaurant_id = "abc"', perPage: 50 });
            const url = new URL(calls[0].url);
            assert.equal(url.searchParams.get("perPage"), "50");
            assert.ok(url.searchParams.get("filter").includes("abc"));
        });
    });

    test("sets Authorization header when token is set", async () => {
        setAuthToken("my-test-token");
        await withMockFetch(mockResponse({}), async (calls) => {
            await get("/api/collections/tables/records");
            assert.equal(calls[0].options.headers["Authorization"], "Bearer my-test-token");
        });
    });

    test("does not set Authorization header when no token", async () => {
        setAuthToken(null);
        await withMockFetch(mockResponse({}), async (calls) => {
            await get("/api/collections/tables/records");
            assert.equal(calls[0].options.headers["Authorization"], undefined);
        });
    });

    test("sends JSON body for POST requests", async () => {
        await withMockFetch(mockResponse({ id: "new-id" }, 200), async (calls) => {
            await post("/api/collections/reservations/records", { guest_name: "Alice" });
            assert.equal(calls[0].options.method, "POST");
            const body = JSON.parse(calls[0].options.body);
            assert.equal(body.guest_name, "Alice");
        });
    });

    test("returns success:true with data on 200", async () => {
        await withMockFetch(mockResponse({ id: "abc", name: "Test" }), async () => {
            const result = await get("/api/collections/restaurants/records/abc");
            assert.equal(result.success, true);
            assert.equal(result.data.id, "abc");
            assert.equal(result.error, null);
        });
    });

    test("returns success:true with empty object on 204", async () => {
        const emptyResponse = new Response(null, { status: 204 });
        await withMockFetch(emptyResponse, async () => {
            const result = await del("/api/collections/tables/records/abc");
            assert.equal(result.success, true);
            assert.deepEqual(result.data, {});
        });
    });

    test("returns success:false with ApiError on 400", async () => {
        const errBody = { code: 400, message: "Validation failed", data: { guest_name: { code: "required" } } };
        await withMockFetch(mockResponse(errBody, 400), async () => {
            const result = await post("/api/collections/reservations/records", {});
            assert.equal(result.success, false);
            assert.equal(result.data, null);
            assert.equal(result.error.status, 400);
            assert.equal(result.error.message, "Validation failed");
            assert.deepEqual(result.error.raw, errBody);
        });
    });

    test("returns success:false with status 0 on network error", async () => {
        const original = globalThis.fetch;
        globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
        try {
            const result = await get("/api/collections/tables/records");
            assert.equal(result.success, false);
            assert.equal(result.error.status, 0);
            assert.match(result.error.message, /network error/i);
        } finally {
            globalThis.fetch = original;
        }
    });

    test("returns success:false with status 408 on timeout", async () => {
        // This test verifies that AbortError is correctly mapped to 408
        const original = globalThis.fetch;
        globalThis.fetch = async (url, options) => {
            // Simulate abort by calling the signal's abort event
            return new Promise((_, reject) => {
                const err = new DOMException("Aborted", "AbortError");
                reject(err);
            });
        };
        try {
            const result = await get("/api/collections/tables/records");
            assert.equal(result.success, false);
            assert.equal(result.error.status, 408);
        } finally {
            globalThis.fetch = original;
        }
    });

    test("omits undefined and null values from query params", async () => {
        await withMockFetch(mockResponse({}), async (calls) => {
            await get("/api/collections/tables/records", { filter: undefined, perPage: null, sort: "+number" });
            const url = new URL(calls[0].url);
            assert.ok(!url.searchParams.has("filter"));
            assert.ok(!url.searchParams.has("perPage"));
            assert.equal(url.searchParams.get("sort"), "+number");
        });
    });
});

// ---------------------------------------------------------------------------
// updateStatus() — local validation
// ---------------------------------------------------------------------------

describe("reservations.updateStatus()", () => {
    test("returns error immediately for invalid status without hitting network", async () => {
        let fetchCalled = false;
        const original = globalThis.fetch;
        globalThis.fetch = async () => { fetchCalled = true; return mockResponse({}); };

        const result = await updateStatus("some-id", "invalid_status");

        globalThis.fetch = original;

        assert.equal(result.success, false);
        assert.equal(result.error.status, 400);
        assert.match(result.error.message, /invalid status/i);
        assert.equal(fetchCalled, false);
    });

    test("calls API for valid status values", async () => {
        const validStatuses = ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"];
        for (const status of validStatuses) {
            await withMockFetch(mockResponse({ id: "r1", status }), async (calls) => {
                const result = await updateStatus("r1", status);
                assert.equal(calls.length, 1, `Expected 1 fetch call for status "${status}"`);
                const body = JSON.parse(calls[0].options.body);
                assert.equal(body.status, status);
            });
        }
    });
});

// ---------------------------------------------------------------------------
// findByPhone — returns null when not found
// ---------------------------------------------------------------------------

describe("customers.findByPhone()", () => {
    test("returns success:true with data:null when no customer found", async () => {
        await withMockFetch(mockResponse({ items: [], totalItems: 0 }), async () => {
            const result = await findByPhone("restaurant-1", "+34 600 000 000");
            assert.equal(result.success, true);
            assert.equal(result.data, null);
        });
    });

    test("returns success:true with customer when found", async () => {
        const customer = { id: "c1", name: "Alice", phone: "+34 600 111 222" };
        await withMockFetch(mockResponse({ items: [customer], totalItems: 1 }), async () => {
            const result = await findByPhone("restaurant-1", "+34 600 111 222");
            assert.equal(result.success, true);
            assert.equal(result.data.id, "c1");
        });
    });
});
