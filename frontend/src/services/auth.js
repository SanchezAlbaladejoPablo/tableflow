/**
 * auth.js
 *
 * Authentication service for TableFlow.
 * Wraps PocketBase's users auth collection.
 *
 * Responsibilities:
 *   - Login / logout via PocketBase email+password auth
 *   - Persist the JWT token and user record in localStorage
 *   - Restore session on page load
 *   - Expose current user data (id, role, restaurant_id)
 *
 * Usage:
 *   import { login, logout, restoreSession, getCurrentUser, isAuthenticated } from "./auth.js";
 */

import { post, setAuthToken } from "./api.js";

const STORAGE_KEY = "tf_auth";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** @type {{ token: string, user: object } | null} */
let _session = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with email and password.
 * On success: stores session in localStorage, sets auth token in api.js.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('../types.js').ApiResult<{ token: string, record: object }>>}
 */
export async function login(email, password) {
    const result = await post(
        "/api/collections/users/auth-with-password",
        { identity: email, password }
    );

    if (result.success) {
        _session = {
            token: result.data.token,
            user:  result.data.record,
        };
        setAuthToken(_session.token);
        _persistSession();
    }

    return result;
}

/**
 * Clear the current session and remove it from localStorage.
 * The caller is responsible for redirecting to the login page.
 */
export function logout() {
    _session = null;
    setAuthToken(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* private browsing */ }
}

/**
 * Restore a previously persisted session from localStorage.
 * Call this once at application startup before calling any API.
 *
 * @returns {boolean} true if a valid session was restored
 */
export function restoreSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed?.token || !parsed?.user) return false;

        _session = parsed;
        setAuthToken(_session.token);
        return true;
    } catch {
        return false;
    }
}

/**
 * Returns true if there is an active session (token present).
 * Does NOT validate the token against the server.
 *
 * @returns {boolean}
 */
export function isAuthenticated() {
    return _session !== null && Boolean(_session.token);
}

/**
 * Returns the current user record or null if not authenticated.
 *
 * @returns {{ id: string, email: string, role: string, restaurant_id: string } | null}
 */
export function getCurrentUser() {
    return _session?.user ?? null;
}

/**
 * Returns the restaurant_id of the current user, or null.
 *
 * @returns {string | null}
 */
export function getCurrentRestaurantId() {
    return _session?.user?.restaurant_id ?? null;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function _persistSession() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_session));
    } catch { /* storage full or private browsing */ }
}
