/**
 * customers.js
 *
 * Service layer for the `customers` PocketBase collection.
 * Also exposes reservation history queries as a CRM concern.
 */

/** @import { ApiResult, Customer, Reservation, PbListResult } from '../types.js' */

import { get, post, patch, del } from "./api.js";

const COLLECTION = "/api/collections/customers/records";
const RESERVATIONS_COLLECTION = "/api/collections/reservations/records";

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * List customers for a restaurant.
 *
 * @param {string} restaurantId
 * @param {Object} [options]
 * @param {string} [options.search]   - Case-insensitive search across name, email, phone.
 * @param {number} [options.page]
 * @param {number} [options.perPage]  - Default 50.
 * @param {string} [options.sort]     - PocketBase sort string (default "+name").
 * @returns {Promise<ApiResult<PbListResult<Customer>>>}
 */
export function listCustomers(restaurantId, options = {}) {
    const { search, page = 1, perPage = 50, sort = "+name" } = options;

    const clauses = [`restaurant_id = "${restaurantId}"`];

    if (search) {
        // PocketBase ~ operator: case-insensitive contains match.
        // Values must be double-quoted; escape any literal " in the search string.
        const safe = search.replace(/"/g, '\\"');
        clauses.push(
            `(name ~ "${safe}" || email ~ "${safe}" || phone ~ "${safe}")`
        );
    }

    return get(COLLECTION, {
        filter: clauses.join(" && "),
        sort,
        page,
        perPage,
    });
}

/**
 * Get a single customer by ID.
 *
 * @param {string} id
 * @returns {Promise<ApiResult<Customer>>}
 */
export function getCustomer(id) {
    return get(`${COLLECTION}/${id}`);
}

/**
 * Find a customer by phone number.
 * Returns `{ success: true, data: null }` when no match is found (not an error).
 *
 * @param {string} restaurantId
 * @param {string} phone
 * @returns {Promise<ApiResult<Customer|null>>}
 */
export async function findByPhone(restaurantId, phone) {
    const result = await get(COLLECTION, {
        filter: `restaurant_id = "${restaurantId}" && phone = "${phone}"`,
        perPage: 1,
    });

    if (!result.success) return result;

    const match = result.data.items?.[0] ?? null;
    return { success: true, data: match, error: null };
}

/**
 * Find a customer by email address.
 * Returns `{ success: true, data: null }` when no match is found (not an error).
 *
 * @param {string} restaurantId
 * @param {string} email
 * @returns {Promise<ApiResult<Customer|null>>}
 */
export async function findByEmail(restaurantId, email) {
    const result = await get(COLLECTION, {
        filter: `restaurant_id = "${restaurantId}" && email = "${email}"`,
        perPage: 1,
    });

    if (!result.success) return result;

    const match = result.data.items?.[0] ?? null;
    return { success: true, data: match, error: null };
}

/**
 * Create a new customer. Automatically injects restaurant_id.
 *
 * @param {string} restaurantId
 * @param {Partial<Customer>} data
 * @returns {Promise<ApiResult<Customer>>}
 */
export function createCustomer(restaurantId, data) {
    return post(COLLECTION, { ...data, restaurant_id: restaurantId });
}

/**
 * Update a customer (partial update).
 *
 * @param {string} id
 * @param {Partial<Customer>} data
 * @returns {Promise<ApiResult<Customer>>}
 */
export function updateCustomer(id, data) {
    return patch(`${COLLECTION}/${id}`, data);
}

/**
 * Delete a customer.
 *
 * @param {string} id
 * @returns {Promise<ApiResult<{}>>}
 */
export function deleteCustomer(id) {
    return del(`${COLLECTION}/${id}`);
}

// ---------------------------------------------------------------------------
// CRM — reservation history
// ---------------------------------------------------------------------------

/**
 * Get the reservation history for a specific customer.
 * Sorted newest first.
 *
 * @param {string} customerId
 * @param {Object} [options]
 * @param {number} [options.page]
 * @param {number} [options.perPage] - Default 20.
 * @param {string} [options.expand]  - Default "table_id".
 * @returns {Promise<ApiResult<PbListResult<Reservation>>>}
 */
export function getReservationHistory(customerId, options = {}) {
    const { page = 1, perPage = 20, expand = "table_id" } = options;

    return get(RESERVATIONS_COLLECTION, {
        filter: `customer_id = "${customerId}"`,
        sort: "-reserved_at",
        page,
        perPage,
        expand,
    });
}
