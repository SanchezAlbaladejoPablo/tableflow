/**
 * api.js
 *
 * Central HTTP client for the TableFlow frontend.
 * Thin abstraction over PocketBase's REST API using native fetch.
 *
 * All exported service functions return an ApiResult envelope:
 *   { success: true,  data: <T>,   error: null }
 *   { success: false, data: null,  error: ApiError }
 *
 * Callers never need to catch exceptions — errors are returned as values.
 */

/** @import { ApiResult, ApiError } from '../types.js' */

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** @type {string} */
let _baseUrl = "";

/** @type {string|null} */
let _authToken = null;

const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Initialise the client with the PocketBase base URL.
 * Must be called once at application startup before any service functions.
 *
 * @param {string} baseUrl - e.g. "http://localhost:8090"
 */
export function initClient(baseUrl) {
    _baseUrl = baseUrl.replace(/\/+$/, "");
}

/**
 * Store or clear the Bearer auth token.
 * Call this after a successful login / on logout.
 *
 * @param {string|null} token
 */
export function setAuthToken(token) {
    _authToken = token;
}

/**
 * Read the current auth token.
 *
 * @returns {string|null}
 */
export function getAuthToken() {
    return _authToken;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a normalised ApiError from various failure sources.
 *
 * @param {number} status
 * @param {string} message
 * @param {any}    [raw]
 * @returns {ApiError}
 */
function makeError(status, message, raw = null) {
    return { status, message, raw };
}

/**
 * Wrap a value in a successful ApiResult.
 *
 * @template T
 * @param {T} data
 * @returns {ApiResult<T>}
 */
function ok(data) {
    return { success: true, data, error: null };
}

/**
 * Wrap an ApiError in a failed ApiResult.
 *
 * @param {ApiError} error
 * @returns {ApiResult<never>}
 */
function fail(error) {
    return { success: false, data: null, error };
}

/**
 * Serialize an options object into a URLSearchParams query string.
 * Undefined and null values are omitted.
 *
 * @param {Record<string, any>} params
 * @returns {string} - Leading "?" included if non-empty, otherwise "".
 */
function buildQueryString(params) {
    if (!params) return "";
    const entries = Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
    );
    if (entries.length === 0) return "";
    return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

/**
 * Execute an HTTP request against the PocketBase API.
 *
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path       - Path relative to base URL, e.g. "/api/collections/reservations/records"
 * @param {Object} [options]
 * @param {any}    [options.body]    - Request body (will be JSON-serialised).
 * @param {Record<string, any>} [options.params] - Query string parameters.
 * @returns {Promise<ApiResult<any>>}
 */
export async function request(method, path, options = {}) {
    const { body, params } = options;
    const url = _baseUrl + path + buildQueryString(params);

    const headers = { "Content-Type": "application/json" };
    if (_authToken) {
        headers["Authorization"] = `Bearer ${_authToken}`;
    }

    const fetchOptions = { method, headers };
    if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
    }

    // Timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    fetchOptions.signal = controller.signal;

    let response;
    try {
        response = await fetch(url, fetchOptions);
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
            return fail(makeError(408, "Request timeout", err));
        }
        return fail(makeError(0, "Network error", err));
    } finally {
        clearTimeout(timeoutId);
    }

    // 204 No Content (PocketBase DELETE responses)
    if (response.status === 204) {
        return ok({});
    }

    let parsed;
    try {
        parsed = await response.json();
    } catch {
        return fail(makeError(response.status, "Invalid JSON response from server"));
    }

    if (!response.ok) {
        // PocketBase error shape: { code, message, data }
        const message = parsed?.message ?? `HTTP ${response.status}`;

        // 401 → session expired or invalid — notify the app to show login
        if (response.status === 401) {
            _authToken = null;
            try { localStorage.removeItem("tf_auth"); } catch { /* ignore */ }
            window.dispatchEvent(new CustomEvent("tf:sessionexpired"));
        }

        return fail(makeError(response.status, message, parsed));
    }

    return ok(parsed);
}

// ---------------------------------------------------------------------------
// HTTP verb helpers
// ---------------------------------------------------------------------------

/**
 * GET request.
 *
 * @param {string} path
 * @param {Record<string, any>} [params]
 * @returns {Promise<ApiResult<any>>}
 */
export function get(path, params) {
    return request("GET", path, { params });
}

/**
 * POST request.
 *
 * @param {string} path
 * @param {any} body
 * @returns {Promise<ApiResult<any>>}
 */
export function post(path, body) {
    return request("POST", path, { body });
}

/**
 * PATCH request.
 *
 * @param {string} path
 * @param {any} body
 * @returns {Promise<ApiResult<any>>}
 */
export function patch(path, body) {
    return request("PATCH", path, { body });
}

/**
 * DELETE request.
 *
 * @param {string} path
 * @returns {Promise<ApiResult<any>>}
 */
export function del(path) {
    return request("DELETE", path);
}
