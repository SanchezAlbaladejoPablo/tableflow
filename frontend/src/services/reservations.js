/**
 * reservations.js
 *
 * Service layer for the `reservations` PocketBase collection.
 * All functions return ApiResult — no exceptions are thrown.
 */

/** @import { ApiResult, Reservation, PbListResult } from '../types.js' */

import { get, post, patch, del } from "./api.js";

const COLLECTION = "/api/collections/reservations/records";

/** Reservation status enum values — used for local validation. */
const VALID_STATUSES = new Set([
    "pending", "confirmed", "seated", "completed", "cancelled", "no_show",
]);

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Build a PocketBase filter string from an array of clauses.
 * Undefined/empty clauses are ignored.
 *
 * @param {(string|undefined)[]} parts
 * @returns {string}
 */
function buildFilter(parts) {
    return parts.filter(Boolean).join(" && ");
}

/**
 * Build a day-range filter clause for reserved_at.
 *
 * @param {string} dateStr - YYYY-MM-DD in the caller's local context.
 * @returns {string}
 */
function dayRangeFilter(dateStr) {
    return `reserved_at >= "${dateStr} 00:00:00.000Z" && reserved_at <= "${dateStr} 23:59:59.999Z"`;
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * List reservations for a restaurant with optional filters.
 *
 * @param {string} restaurantId
 * @param {Object} [options]
 * @param {string}            [options.date]      - YYYY-MM-DD to filter to a single day.
 * @param {string|string[]}   [options.status]    - Status or array of statuses to include.
 * @param {string}            [options.tableId]   - Filter by specific table.
 * @param {number}            [options.page]      - Page number (default 1).
 * @param {number}            [options.perPage]   - Items per page (default 50).
 * @param {string}            [options.sort]      - PocketBase sort string (default "+reserved_at").
 * @param {string}            [options.expand]    - Relations to expand.
 * @returns {Promise<ApiResult<PbListResult<Reservation>>>}
 */
export function listReservations(restaurantId, options = {}) {
    const {
        date,
        status,
        tableId,
        page = 1,
        perPage = 50,
        sort = "+reserved_at",
        expand,
    } = options;

    const clauses = [`restaurant_id = "${restaurantId}"`];

    if (date) {
        clauses.push(dayRangeFilter(date));
    }

    if (status) {
        if (Array.isArray(status)) {
            const statusClauses = status.map((s) => `status = "${s}"`).join(" || ");
            clauses.push(`(${statusClauses})`);
        } else {
            clauses.push(`status = "${status}"`);
        }
    }

    if (tableId) {
        clauses.push(`table_id = "${tableId}"`);
    }

    const params = {
        filter: buildFilter(clauses),
        sort,
        page,
        perPage,
    };
    if (expand) params.expand = expand;

    return get(COLLECTION, params);
}

/**
 * Get a single reservation by ID.
 *
 * @param {string} id
 * @param {string} [expand] - Default: "table_id,customer_id"
 * @returns {Promise<ApiResult<Reservation>>}
 */
export function getReservation(id, expand = "table_id,customer_id") {
    const params = expand ? { expand } : undefined;
    return get(`${COLLECTION}/${id}`, params);
}

/**
 * Create a new reservation.
 *
 * @param {Partial<Reservation>} data
 * @returns {Promise<ApiResult<Reservation>>}
 */
export function createReservation(data) {
    return post(COLLECTION, data);
}

/**
 * Update a reservation (partial update).
 *
 * @param {string} id
 * @param {Partial<Reservation>} data
 * @returns {Promise<ApiResult<Reservation>>}
 */
export function updateReservation(id, data) {
    return patch(`${COLLECTION}/${id}`, data);
}

/**
 * Delete a reservation permanently.
 * Prefer `updateStatus(id, "cancelled")` for soft cancellation.
 *
 * @param {string} id
 * @returns {Promise<ApiResult<{}>>}
 */
export function deleteReservation(id) {
    return del(`${COLLECTION}/${id}`);
}

/**
 * Update only the status of a reservation.
 * Returns a validation error locally if the status value is unknown.
 *
 * @param {string} id
 * @param {import('../types.js').ReservationStatus} status
 * @returns {Promise<ApiResult<Reservation>>}
 */
export function updateStatus(id, status) {
    if (!VALID_STATUSES.has(status)) {
        return Promise.resolve({
            success: false,
            data: null,
            error: {
                status: 400,
                message: `Invalid status value: "${status}". Must be one of: ${[...VALID_STATUSES].join(", ")}`,
                raw: null,
            },
        });
    }
    return patch(`${COLLECTION}/${id}`, { status });
}

/**
 * Assign a table to a reservation.
 *
 * @param {string} reservationId
 * @param {string} tableId
 * @returns {Promise<ApiResult<Reservation>>}
 */
export function assignTable(reservationId, tableId) {
    return patch(`${COLLECTION}/${reservationId}`, { table_id: tableId });
}

/**
 * Fetch upcoming and active reservations for a specific table.
 * Returns reservations from today onwards (not cancelled, not completed).
 * Used by the table detail panel and the 3-hour gap validator.
 *
 * @param {string} tableId
 * @returns {Promise<ApiResult<PbListResult<Reservation>>>}
 */
export function getUpcomingTableReservations(tableId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // PocketBase uses space-separated format for datetime comparisons
    const todayPb = today.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ".000Z");

    return get(COLLECTION, {
        filter: `table_id = "${tableId}" && status != "cancelled" && status != "completed" && reserved_at >= "${todayPb}"`,
        sort: "+reserved_at",
        perPage: 100,
    });
}

/**
 * Fetch all non-cancelled reservations for a specific table within a datetime range.
 * Used by the availability checker to detect overlaps.
 *
 * @param {string} tableId
 * @param {string} from   - ISO-8601 datetime string (start of range, inclusive).
 * @param {string} to     - ISO-8601 datetime string (end of range, inclusive).
 * @returns {Promise<ApiResult<Reservation[]>>}
 */
export async function getReservationsForTable(tableId, from, to) {
    const filter = buildFilter([
        `table_id = "${tableId}"`,
        `reserved_at >= "${from}"`,
        `reserved_at <= "${to}"`,
        `status != "cancelled"`,
        `status != "no_show"`,
        `status != "completed"`,
    ]);

    const result = await get(COLLECTION, { filter, perPage: 200 });

    if (!result.success) return result;

    // Unwrap items from the paginated list result
    return { success: true, data: result.data.items ?? [], error: null };
}
