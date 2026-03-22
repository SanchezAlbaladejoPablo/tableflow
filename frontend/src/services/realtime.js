/**
 * realtime.js
 *
 * PocketBase Server-Sent Events (SSE) client for TableFlow.
 *
 * PocketBase SSE flow:
 *   1. Open EventSource to GET /api/realtime?token=<jwt>
 *   2. PocketBase sends PB_CONNECT event with { clientId }
 *   3. POST /api/realtime { clientId, subscriptions: ["collectionName", ...] }
 *   4. Changes arrive as SSE events:  event: <topic>  data: { action, record }
 *
 * Features:
 *   - Exponential backoff reconnection (TASK-063)
 *   - Status change callbacks for the connection indicator (TASK-062)
 *   - subscribe(topic, handler) returns an unsubscribe function
 */

import { getAuthToken } from "./api.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS     = 30_000;
const BACKOFF_FACTOR   = 2;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _baseUrl    = "";
let _es         = null;   // EventSource instance
let _clientId   = null;
let _retryMs    = INITIAL_RETRY_MS;
let _retryTimer = null;
let _destroyed  = false;
let _connected  = false;

/** @type {Map<string, Set<Function>>} topic → handler set */
const _handlers = new Map();

/** Topics already attached as EventSource event listeners on the current _es */
const _attached = new Set();

/** Status change callbacks: (connected: boolean) => void */
const _statusCbs = new Set();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise and open the SSE connection.
 * Call this once after auth is established.
 *
 * @param {string} baseUrl - e.g. "http://localhost:8090"
 */
export function initRealtime(baseUrl) {
    _baseUrl   = baseUrl.replace(/\/+$/, "");
    _destroyed = false;
    _retryMs   = INITIAL_RETRY_MS;
    _open();
}

/**
 * Close the connection permanently (e.g. on logout).
 */
export function destroyRealtime() {
    _destroyed = true;
    clearTimeout(_retryTimer);
    _es?.close();
    _es        = null;
    _clientId  = null;
    _handlers.clear();
    _attached.clear();
    _statusCbs.clear();
    _setConnected(false);
}

/**
 * Subscribe to a PocketBase collection topic.
 *
 * @param {string}   topic   - Collection name, e.g. "reservations" or "tables"
 * @param {Function} handler - Called with { action, record } on each change
 * @returns {Function} Unsubscribe function
 */
export function subscribe(topic, handler) {
    if (!_handlers.has(topic)) _handlers.set(topic, new Set());
    _handlers.get(topic).add(handler);

    // Attach the EventSource listener immediately if already connected
    _ensureTopicListener(topic);

    // Inform PocketBase of the new subscription
    if (_clientId) _sendSubscriptions();

    return () => _unsubscribe(topic, handler);
}

/**
 * Register a callback for connection status changes.
 *
 * @param {(connected: boolean) => void} cb
 * @returns {Function} Unregister function
 */
export function onStatusChange(cb) {
    _statusCbs.add(cb);
    // Immediately notify of current state
    cb(_connected);
    return () => _statusCbs.delete(cb);
}

/** @returns {boolean} */
export function isConnected() {
    return _connected;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _setConnected(val) {
    if (_connected === val) return;
    _connected = val;
    _statusCbs.forEach(cb => cb(val));
}

function _open() {
    if (_destroyed) return;

    const token = getAuthToken();
    const url   = `${_baseUrl}/api/realtime${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    try {
        _es = new EventSource(url);
    } catch {
        _scheduleReconnect();
        return;
    }

    _attached.clear();

    _es.addEventListener("PB_CONNECT", (e) => {
        try {
            _clientId = JSON.parse(e.data).clientId;
        } catch {
            return;
        }
        _retryMs = INITIAL_RETRY_MS; // reset backoff on successful connect
        _setConnected(true);

        // Attach listeners for all topics currently registered
        for (const topic of _handlers.keys()) {
            _ensureTopicListener(topic);
        }

        if (_handlers.size > 0) _sendSubscriptions();
    });

    _es.onerror = () => {
        _es?.close();
        _es       = null;
        _clientId = null;
        _attached.clear();
        _setConnected(false);
        if (!_destroyed) _scheduleReconnect();
    };
}

/**
 * Attach an EventSource listener for `topic` if not already attached.
 */
function _ensureTopicListener(topic) {
    if (!_es || _attached.has(topic)) return;
    _attached.add(topic);
    _es.addEventListener(topic, (e) => {
        try {
            const data = JSON.parse(e.data);
            _handlers.get(topic)?.forEach(h => h(data));
        } catch { /* malformed event — ignore */ }
    });
}

/**
 * POST the current subscription list to PocketBase.
 */
async function _sendSubscriptions() {
    if (!_clientId) return;
    const topics = [..._handlers.keys()];

    try {
        const token = getAuthToken();
        await fetch(`${_baseUrl}/api/realtime`, {
            method:  "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                clientId:      _clientId,
                subscriptions: topics.length ? topics : [""],
            }),
        });
    } catch { /* ignore — will retry on next reconnect */ }
}

function _unsubscribe(topic, handler) {
    const set = _handlers.get(topic);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
        _handlers.delete(topic);
        if (_clientId) _sendSubscriptions();
    }
}

function _scheduleReconnect() {
    clearTimeout(_retryTimer);
    _retryTimer = setTimeout(() => {
        _retryMs = Math.min(_retryMs * BACKOFF_FACTOR, MAX_RETRY_MS);
        _open();
    }, _retryMs);
}
