/**
 * settings.js
 *
 * Service layer for `restaurant_settings` PocketBase collection.
 *
 * Provides a module-level cache so settings are fetched once at startup
 * and then read synchronously throughout the app via getters.
 *
 * Usage:
 *   // At startup (after auth):
 *   await loadSettings(restaurantId);
 *
 *   // Anywhere in the app:
 *   import { getDurationMinutes, getGapMinutes } from "./settings.js";
 *   const gap = getGapMinutes(); // replaces hardcoded 180
 */

import { get, patch } from "./api.js";

const COLLECTION = "/api/collections/restaurant_settings/records";

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

/** @type {Object|null} */
let _settings = null;

/** Sensible defaults used when settings haven't been loaded yet. */
const DEFAULTS = {
    timezone:                 "Europe/Madrid",
    default_duration_minutes: 90,
    min_gap_minutes:          180,
    opening_time:             "13:00",
    closing_time:             "23:30",
    logo_url:                 "",
    primary_color:            "#6366f1",
    booking_widget_enabled:   false,
    booking_widget_token:     "",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch and cache the settings for the given restaurant.
 * Safe to call multiple times — only fetches once unless `force` is true.
 *
 * @param {string}  restaurantId
 * @param {boolean} [force] - Re-fetch even if already cached.
 * @returns {Promise<Object>} The settings record (or defaults on failure).
 */
export async function loadSettings(restaurantId, force = false) {
    if (_settings && !force) return _settings;

    const result = await get(COLLECTION, {
        filter:  `restaurant_id = "${restaurantId}"`,
        perPage: 1,
    });

    if (result.success && result.data.items?.length) {
        _settings = result.data.items[0];
    } else {
        // Fall back to defaults — app still works, just less configured
        _settings = { ...DEFAULTS, restaurant_id: restaurantId };
    }

    return _settings;
}

/**
 * Update cached settings and persist the change to PocketBase.
 *
 * @param {string} settingsId
 * @param {Object} data - Partial settings object.
 * @returns {Promise<import('../types.js').ApiResult<Object>>}
 */
export async function saveSettings(settingsId, data) {
    const result = await patch(`${COLLECTION}/${settingsId}`, data);
    if (result.success) {
        _settings = { ..._settings, ...result.data };
    }
    return result;
}

/**
 * Create initial settings for a new restaurant.
 *
 * @param {string} restaurantId
 * @returns {Promise<import('../types.js').ApiResult<Object>>}
 */
export async function createDefaultSettings(restaurantId) {
    const { post } = await import("./api.js");
    const result = await post(COLLECTION, {
        ...DEFAULTS,
        restaurant_id: restaurantId,
    });
    if (result.success) _settings = result.data;
    return result;
}

// ---------------------------------------------------------------------------
// Synchronous getters (read from cache — call loadSettings first)
// ---------------------------------------------------------------------------

/** @returns {Object|null} The full settings record, or null if not loaded. */
export function getSettings() {
    return _settings;
}

/** @returns {number} Default reservation duration in minutes (fallback: 90). */
export function getDurationMinutes() {
    return _settings?.default_duration_minutes ?? DEFAULTS.default_duration_minutes;
}

/** @returns {number} Minimum gap between reservations on same table, in minutes (fallback: 180 = 3h). */
export function getGapMinutes() {
    return _settings?.min_gap_minutes ?? DEFAULTS.min_gap_minutes;
}

/** @returns {string} Restaurant timezone (fallback: "Europe/Madrid"). */
export function getTimezone() {
    return _settings?.timezone ?? DEFAULTS.timezone;
}

/** @returns {string} Opening time "HH:MM" (fallback: "13:00"). */
export function getOpeningTime() {
    return _settings?.opening_time ?? DEFAULTS.opening_time;
}

/** @returns {string} Closing time "HH:MM" (fallback: "23:30"). */
export function getClosingTime() {
    return _settings?.closing_time ?? DEFAULTS.closing_time;
}

/** @returns {string} CSS hex color (fallback: "#6366f1"). */
export function getPrimaryColor() {
    return _settings?.primary_color ?? DEFAULTS.primary_color;
}
