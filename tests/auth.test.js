/**
 * auth.test.js
 *
 * TASK-048 — Tests for the authentication service and API 401 handling.
 *
 * Tests:
 *   - login() success path: token and user stored, auth token set in api.js
 *   - login() failure path: wrong credentials, returns error
 *   - logout(): clears session and token
 *   - restoreSession(): reads localStorage and restores token
 *   - restoreSession(): gracefully handles missing/corrupt localStorage data
 *   - isAuthenticated(): returns correct boolean
 *   - getCurrentUser() / getCurrentRestaurantId(): return correct data
 *   - api.js 401 handling: fires "tf:sessionexpired" event, clears token
 *
 * Run: node --test auth.test.js
 */

import { test, describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Polyfills for Node.js
// ---------------------------------------------------------------------------

if (!globalThis.fetch) {
    console.warn("fetch not available — skipping auth tests. Use Node.js 18+.");
    process.exit(0);
}

// Minimal localStorage polyfill for Node.js
const _store = new Map();
globalThis.localStorage = {
    getItem:    (k) => _store.get(k) ?? null,
    setItem:    (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
    clear:      () => _store.clear(),
};

// Minimal CustomEvent polyfill for Node.js
if (!globalThis.CustomEvent) {
    globalThis.CustomEvent = class CustomEvent extends Event {
        constructor(type, init = {}) { super(type); this.detail = init.detail ?? null; }
    };
}

// ---------------------------------------------------------------------------
// Module imports (hoisted — Node.js 24 requirement)
// ---------------------------------------------------------------------------

const { login, logout, restoreSession, isAuthenticated, getCurrentUser, getCurrentRestaurantId } =
    await import("../frontend/src/services/auth.js");

const { initClient, setAuthToken, getAuthToken, request } =
    await import("../frontend/src/services/api.js");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const FAKE_TOKEN = "eyJfakeJWT.payload.signature";
const FAKE_USER  = {
    id:            "usr_abc123",
    email:         "manager@laTerraza.com",
    role:          "restaurant_admin",
    restaurant_id: "rest_xyz789",
};

function mockFetch(status, body) {
    globalThis.fetch = async () => ({
        ok:     status >= 200 && status < 300,
        status,
        json:   async () => body,
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("login()", () => {
    beforeEach(() => {
        localStorage.clear();
        logout(); // reset module state
        initClient("http://localhost:8090");
    });

    test("success: stores token in module state and localStorage", async () => {
        mockFetch(200, { token: FAKE_TOKEN, record: FAKE_USER });

        const result = await login("manager@laTerraza.com", "secret123");

        assert.equal(result.success, true);
        assert.equal(getAuthToken(), FAKE_TOKEN);
        assert.equal(isAuthenticated(), true);

        // Verify localStorage persistence
        const stored = JSON.parse(localStorage.getItem("tf_auth"));
        assert.equal(stored.token, FAKE_TOKEN);
        assert.equal(stored.user.email, FAKE_USER.email);
    });

    test("success: getCurrentUser returns user record", async () => {
        mockFetch(200, { token: FAKE_TOKEN, record: FAKE_USER });
        await login("manager@laTerraza.com", "secret123");

        const user = getCurrentUser();
        assert.equal(user.role, "restaurant_admin");
        assert.equal(user.restaurant_id, "rest_xyz789");
    });

    test("success: getCurrentRestaurantId returns correct ID", async () => {
        mockFetch(200, { token: FAKE_TOKEN, record: FAKE_USER });
        await login("manager@laTerraza.com", "secret123");

        assert.equal(getCurrentRestaurantId(), "rest_xyz789");
    });

    test("failure 400: returns error, does not set token", async () => {
        mockFetch(400, { code: 400, message: "Failed to authenticate." });

        const result = await login("wrong@email.com", "badpass");

        assert.equal(result.success, false);
        assert.equal(result.error.status, 400);
        assert.equal(getAuthToken(), null);
        assert.equal(isAuthenticated(), false);
    });

    test("network error: returns error with status 0", async () => {
        globalThis.fetch = async () => { throw new TypeError("Network error"); };

        const result = await login("manager@laTerraza.com", "secret123");

        assert.equal(result.success, false);
        assert.equal(result.error.status, 0);
    });
});

describe("logout()", () => {
    beforeEach(() => {
        localStorage.clear();
        logout();
        initClient("http://localhost:8090");
    });

    test("clears session, token, and localStorage", async () => {
        mockFetch(200, { token: FAKE_TOKEN, record: FAKE_USER });
        await login("manager@laTerraza.com", "secret123");

        // Confirm logged in
        assert.equal(isAuthenticated(), true);

        logout();

        assert.equal(isAuthenticated(), false);
        assert.equal(getAuthToken(), null);
        assert.equal(getCurrentUser(), null);
        assert.equal(localStorage.getItem("tf_auth"), null);
    });
});

describe("restoreSession()", () => {
    beforeEach(() => {
        localStorage.clear();
        logout();
        initClient("http://localhost:8090");
    });

    test("restores valid session from localStorage", () => {
        localStorage.setItem("tf_auth", JSON.stringify({
            token: FAKE_TOKEN,
            user:  FAKE_USER,
        }));

        const restored = restoreSession();

        assert.equal(restored, true);
        assert.equal(isAuthenticated(), true);
        assert.equal(getAuthToken(), FAKE_TOKEN);
        assert.equal(getCurrentUser().email, FAKE_USER.email);
        assert.equal(getCurrentRestaurantId(), FAKE_USER.restaurant_id);
    });

    test("returns false when localStorage is empty", () => {
        const restored = restoreSession();
        assert.equal(restored, false);
        assert.equal(isAuthenticated(), false);
    });

    test("returns false for corrupt localStorage data", () => {
        localStorage.setItem("tf_auth", "not-valid-json{{{");
        const restored = restoreSession();
        assert.equal(restored, false);
        assert.equal(isAuthenticated(), false);
    });

    test("returns false when token is missing from stored data", () => {
        localStorage.setItem("tf_auth", JSON.stringify({ user: FAKE_USER }));
        const restored = restoreSession();
        assert.equal(restored, false);
    });
});

describe("api.js 401 handling", () => {
    beforeEach(() => {
        localStorage.clear();
        setAuthToken(FAKE_TOKEN);
        localStorage.setItem("tf_auth", JSON.stringify({ token: FAKE_TOKEN, user: FAKE_USER }));
        initClient("http://localhost:8090");
    });

    test("401 response fires tf:sessionexpired event", async () => {
        mockFetch(401, { code: 401, message: "The request requires valid record authorization token to be set." });

        let eventFired = false;
        globalThis.window = globalThis; // ensure window === globalThis in Node
        globalThis.addEventListener("tf:sessionexpired", () => { eventFired = true; }, { once: true });

        await request("GET", "/api/collections/reservations/records");

        assert.equal(eventFired, true);
    });

    test("401 response clears auth token", async () => {
        mockFetch(401, { code: 401, message: "Unauthorized" });

        await request("GET", "/api/collections/reservations/records");

        assert.equal(getAuthToken(), null);
    });

    test("401 response removes tf_auth from localStorage", async () => {
        mockFetch(401, { code: 401, message: "Unauthorized" });

        await request("GET", "/api/collections/reservations/records");

        assert.equal(localStorage.getItem("tf_auth"), null);
    });

    test("401 response returns fail result", async () => {
        mockFetch(401, { code: 401, message: "Unauthorized" });

        const result = await request("GET", "/api/collections/reservations/records");

        assert.equal(result.success, false);
        assert.equal(result.error.status, 401);
    });
});
