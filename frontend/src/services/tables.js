/**
 * tables.js
 *
 * Service layer for the `tables` PocketBase collection.
 * Also provides the getTableAvailability query which combines tables
 * and reservations data into view-model objects for the floor plan.
 */

/** @import { ApiResult, Table, PbListResult, TableAvailability, Reservation } from '../types.js' */

import { get, post, patch, del } from "./api.js";
import { getGapMinutes, getDurationMinutes } from "./settings.js";

const COLLECTION = "/api/collections/tables/records";
const RESERVATIONS_COLLECTION = "/api/collections/reservations/records";

/**
 * Maximum reservation duration in minutes (matches schema constraint).
 * Used as the conservative lookback window when fetching overlapping reservations.
 */
const MAX_DURATION_MINUTES = 480;

/**
 * Parse a PocketBase datetime string to a timestamp in ms.
 * PocketBase returns datetimes with a space instead of T ("2026-03-21 19:00:00.000Z").
 * new Date() is not guaranteed to parse that format — this normalizes it first.
 *
 * @param {string} pbDateString
 * @returns {number} ms timestamp, or NaN if unparseable
 */
function parsePbDate(pbDateString) {
    if (!pbDateString) return NaN;
    return new Date(pbDateString.replace(" ", "T")).getTime();
}

/**
 * Convert a JS timestamp to PocketBase's storage format "YYYY-MM-DD HH:MM:SS.000Z".
 * PocketBase stores datetimes with a space separator (not T) and compares them
 * lexicographically in SQL, so filter values must use the same format.
 *
 * @param {number} ms
 * @returns {string}
 */
function toPbDate(ms) {
    return new Date(ms).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ".000Z");
}

// ---------------------------------------------------------------------------
// Exported service functions — CRUD
// ---------------------------------------------------------------------------

/**
 * List tables for a restaurant.
 *
 * @param {string} restaurantId
 * @param {Object} [options]
 * @param {boolean}                           [options.activeOnly] - Only return is_active tables.
 * @param {'indoor'|'outdoor'|'bar'|string}   [options.area]      - Filter by area.
 * @param {number}                            [options.page]
 * @param {number}                            [options.perPage]   - Default 200 (load all).
 * @returns {Promise<ApiResult<PbListResult<Table>>>}
 */
export function listTables(restaurantId, options = {}) {
    const { activeOnly, area, page = 1, perPage = 200 } = options;

    const clauses = [`restaurant_id = "${restaurantId}"`];
    if (activeOnly) clauses.push("is_active = true");
    if (area) clauses.push(`area = "${area}"`);

    return get(COLLECTION, {
        filter: clauses.join(" && "),
        sort: "+number",
        page,
        perPage,
    });
}

/**
 * Get a single table by ID.
 *
 * @param {string} id
 * @returns {Promise<ApiResult<Table>>}
 */
export function getTable(id) {
    return get(`${COLLECTION}/${id}`);
}

/**
 * Create a new table.
 *
 * @param {Partial<Table>} data
 * @returns {Promise<ApiResult<Table>>}
 */
export function createTable(data) {
    return post(COLLECTION, data);
}

/**
 * Update a table (partial update).
 *
 * @param {string} id
 * @param {Partial<Table>} data
 * @returns {Promise<ApiResult<Table>>}
 */
export function updateTable(id, data) {
    return patch(`${COLLECTION}/${id}`, data);
}

/**
 * Update a table's floor plan position.
 *
 * @param {string} id
 * @param {number} x
 * @param {number} y
 * @returns {Promise<ApiResult<Table>>}
 */
export function updateTablePosition(id, x, y) {
    return patch(`${COLLECTION}/${id}`, { pos_x: x, pos_y: y });
}

/**
 * Delete a table.
 *
 * @param {string} id
 * @returns {Promise<ApiResult<{}>>}
 */
export function deleteTable(id) {
    return del(`${COLLECTION}/${id}`);
}

// ---------------------------------------------------------------------------
// Availability query
// ---------------------------------------------------------------------------

/**
 * Get availability status for every active table at a given time slot.
 *
 * This function combines two API calls:
 *   1. Fetch all active tables for the restaurant.
 *   2. Fetch a conservative superset of overlapping reservations.
 * Then it computes precise slot overlaps in JavaScript.
 *
 * Overlap condition:
 *   A reservation R overlaps slot [slotStart, slotEnd) when:
 *     R.reserved_at < slotEnd
 *     AND (R.reserved_at + R.duration_minutes) > slotStart
 *
 * PocketBase cannot compute (R.reserved_at + duration) in filter syntax,
 * so we fetch reservations starting within [slotStart - MAX_DURATION, slotEnd]
 * as a conservative superset, then filter precisely in JS.
 *
 * @param {string} restaurantId
 * @param {string} slotStart  - ISO-8601 datetime string (slot start, inclusive).
 * @param {string} slotEnd    - ISO-8601 datetime string (slot end, exclusive).
 * @returns {Promise<ApiResult<TableAvailability[]>>}
 */
export async function getTableAvailability(restaurantId, slotStart, slotEnd) {
    // Step 1: Fetch all active tables
    const tablesResult = await listTables(restaurantId, { activeOnly: true });
    if (!tablesResult.success) return tablesResult;

    const tables = tablesResult.data.items;
    if (tables.length === 0) {
        return { success: true, data: [], error: null };
    }

    // Step 2: Fetch a conservative superset of overlapping reservations.
    // Start of window = slotStart minus maximum possible duration.
    const windowStart = toPbDate(new Date(slotStart).getTime() - MAX_DURATION_MINUTES * 60_000);
    const slotEndPb   = toPbDate(new Date(slotEnd).getTime());

    const filter = [
        `restaurant_id = "${restaurantId}"`,
        `status != "cancelled"`,
        `status != "no_show"`,
        `status != "completed"`,
        `reserved_at >= "${windowStart}"`,
        `reserved_at < "${slotEndPb}"`,
    ].join(" && ");

    const reservationsResult = await get(RESERVATIONS_COLLECTION, {
        filter,
        perPage: 500,
    });

    if (!reservationsResult.success) return reservationsResult;

    /** @type {Reservation[]} */
    const reservations = reservationsResult.data.items ?? [];

    // Step 3: Precise overlap check in JavaScript.
    const slotStartMs = new Date(slotStart).getTime();
    const slotEndMs = new Date(slotEnd).getTime();

    /** @type {Map<string, Reservation[]>} */
    const overlapsByTable = new Map();

    for (const res of reservations) {
        const resStart = parsePbDate(res.reserved_at);
        if (isNaN(resStart)) continue;
        const duration = (res.duration_minutes ?? 90) * 60_000;
        const resEnd = resStart + duration;

        // Precise overlap: res starts before slot ends AND res ends after slot starts
        if (resStart < slotEndMs && resEnd > slotStartMs) {
            const list = overlapsByTable.get(res.table_id) ?? [];
            list.push(res);
            overlapsByTable.set(res.table_id, list);
        }
    }

    // Step 4: Build TableAvailability for each table.
    /** @type {TableAvailability[]} */
    const availability = tables.map((table) => {
        const activeReservations = overlapsByTable.get(table.id) ?? [];
        return {
            table,
            isAvailable: activeReservations.length === 0,
            activeReservations,
        };
    });

    return { success: true, data: availability, error: null };
}

// ---------------------------------------------------------------------------
// Real-time floor plan status
// ---------------------------------------------------------------------------

/**
 * Get real-time table status for the floor plan.
 *
 * Rules (evaluated in priority order):
 *   1. "occupied"  → table has a reservation with status "seated"
 *   2. "reserved"  → table has an ongoing reservation (started but not finished)
 *                    OR a reservation starting within the next 3 hours
 *   3. "available" → neither
 *
 * Unlike getTableAvailability(), this function uses the current time and does NOT
 * depend on a user-selected datetime. It is designed for the live floor plan view.
 *
 * @param {string} restaurantId
 * @returns {Promise<ApiResult<TableAvailability[]>>}
 */
export async function getFloorPlanStatus(restaurantId) {
    // Fetch all active tables
    const tablesResult = await listTables(restaurantId, { activeOnly: true });
    if (!tablesResult.success) return tablesResult;

    const tables = tablesResult.data.items;
    if (tables.length === 0) return { success: true, data: [], error: null };

    const nowMs  = Date.now();
    const in3hMs = nowMs + getGapMinutes() * 60_000;

    // Fetch a conservative superset:
    //   - reservations that might still be ongoing (started up to MAX_DURATION ago)
    //   - reservations starting within the next 3 hours
    const lookbackStart = toPbDate(nowMs - MAX_DURATION_MINUTES * 60_000);
    const lookaheadEnd  = toPbDate(in3hMs);

    // Always include "seated" (regardless of time) — someone is physically at the table.
    // For other statuses, filter by the 3-hour lookahead window.
    const filter =
        `restaurant_id = "${restaurantId}" && status != "cancelled" && status != "no_show" && status != "completed" && ` +
        `(status = "seated" || (reserved_at >= "${lookbackStart}" && reserved_at <= "${lookaheadEnd}"))`;

    const reservationsResult = await get(RESERVATIONS_COLLECTION, { filter, perPage: 500 });
    if (!reservationsResult.success) return reservationsResult;

    const reservations = reservationsResult.data.items ?? [];

    // Build per-table active reservation lists with precise JS-side classification
    /** @type {Map<string, Reservation[]>} */
    const activeByTable = new Map();

    for (const res of reservations) {
        if (!res.table_id) continue;

        // Normalize PocketBase space-format: "2026-03-21 19:00:00.000Z" → "2026-03-21T19:00:00.000Z"
        const resStartMs = parsePbDate(res.reserved_at);
        if (isNaN(resStartMs)) continue; // skip unparseable dates

        const resEndMs = resStartMs + (res.duration_minutes ?? getDurationMinutes()) * 60_000;

        const isSeated   = res.status === "seated";                        // already at table
        const isOngoing  = resStartMs <= nowMs  && resEndMs > nowMs;       // started, not finished
        const isUpcoming = resStartMs >  nowMs  && resStartMs <= in3hMs;   // starts within 3h

        if (isSeated || isOngoing || isUpcoming) {
            const list = activeByTable.get(res.table_id) ?? [];
            list.push(res);
            activeByTable.set(res.table_id, list);
        }
    }

    /** @type {TableAvailability[]} */
    const availability = tables.map((table) => {
        const activeReservations = activeByTable.get(table.id) ?? [];
        return {
            table,
            isAvailable: activeReservations.length === 0,
            activeReservations,
        };
    });

    return { success: true, data: availability, error: null };
}
