/**
 * table-assignment.js
 *
 * Pure, synchronous table suggestion algorithm.
 * No API calls, no DOM access — fully testable without mocking.
 *
 * Algorithm: Best Fit
 *   Among all available tables that can seat the party:
 *     1. Filter: active AND available AND capacity >= partySize
 *     2. Score:  capacity - partySize  (lower = better; 0 = exact fit)
 *     3. Break ties by table number (lower first)
 *     4. Apply optional area preference (breaks ties only, never overrides fit)
 */

/** @import { Table, TableAvailability, TableSuggestion, TableStatus } from '../types.js' */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fractional score bonus for matching the preferred area. Must be < 1. */
const AREA_PREFERENCE_BONUS = 0.5;

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Return a ranked list of table suggestions for a given party size.
 *
 * @param {Table[]}            tables       - All tables for the restaurant.
 * @param {TableAvailability[]} availability - Availability state from `getTableAvailability`.
 * @param {number}             partySize    - Number of guests to seat.
 * @param {Object}             [options]
 * @param {string}             [options.preferArea] - Preferred area ("indoor"|"outdoor"|"bar").
 * @returns {TableSuggestion[]} Sorted array, best match first. Empty if no suitable table.
 */
export function suggestTables(tables, availability, partySize, options = {}) {
    const { preferArea } = options;

    // Build a lookup map: tableId → TableAvailability
    /** @type {Map<string, TableAvailability>} */
    const availMap = new Map(availability.map((a) => [a.table.id, a]));

    /** @type {TableSuggestion[]} */
    const suggestions = [];

    for (const table of tables) {
        // Must be active
        if (!table.is_active) continue;

        // Must be in the availability data and marked available
        const avail = availMap.get(table.id);
        if (!avail || !avail.isAvailable) continue;

        // Must fit the party
        if (table.capacity < partySize) continue;

        const excess = table.capacity - partySize;
        let score = excess;

        // Area preference: subtract a fractional bonus to break ties
        if (preferArea && table.area === preferArea) {
            score -= AREA_PREFERENCE_BONUS;
        }

        suggestions.push({
            table,
            score,
            reason: buildReason(excess, preferArea, table.area),
        });
    }

    // Sort: primary by score ascending, secondary by table number ascending
    suggestions.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.table.number - b.table.number;
    });

    return suggestions;
}

/**
 * Return the single best table suggestion, or null if none is available.
 *
 * @param {Table[]}            tables
 * @param {TableAvailability[]} availability
 * @param {number}             partySize
 * @param {Object}             [options]
 * @param {string}             [options.preferArea]
 * @returns {TableSuggestion|null}
 */
export function getBestTable(tables, availability, partySize, options = {}) {
    const results = suggestTables(tables, availability, partySize, options);
    return results.length > 0 ? results[0] : null;
}

/**
 * Check whether a specific table is currently available.
 *
 * @param {string}             tableId
 * @param {TableAvailability[]} availability
 * @returns {boolean}
 */
export function isTableAvailable(tableId, availability) {
    const entry = availability.find((a) => a.table.id === tableId);
    return entry ? entry.isAvailable : false;
}

/**
 * Compute the visual status of a table for floor plan rendering.
 *
 * Status rules:
 *   - "occupied"  → table has a reservation with status "seated"
 *   - "reserved"  → table has pending or confirmed reservations
 *   - "available" → no active reservations at this time slot
 *
 * @param {string}             tableId
 * @param {TableAvailability[]} availability
 * @returns {TableStatus}
 */
export function computeTableStatus(tableId, availability) {
    const entry = availability.find((a) => a.table.id === tableId);

    if (!entry || entry.activeReservations.length === 0) {
        return "available";
    }

    const hasSeated = entry.activeReservations.some((r) => r.status === "seated");
    if (hasSeated) return "occupied";

    return "reserved";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable reason string for a suggestion.
 *
 * @param {number}          excess
 * @param {string|undefined} preferArea
 * @param {string}          tableArea
 * @returns {string}
 */
function buildReason(excess, preferArea, tableArea) {
    let reason;

    if (excess === 0) {
        reason = "Exact fit";
    } else if (excess === 1) {
        reason = "1 spare seat";
    } else {
        reason = `${excess} spare seats`;
    }

    if (preferArea && tableArea === preferArea) {
        reason += ` · preferred area`;
    }

    return reason;
}
