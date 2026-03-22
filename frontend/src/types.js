/**
 * types.js
 *
 * JSDoc type definitions for TableFlow.
 * No runtime code — import this file only in JSDoc @import comments.
 *
 * Usage in other files:
 *   /** @import { ApiResult, Reservation } from './types.js' *\/
 */

// ---------------------------------------------------------------------------
// API envelope
// ---------------------------------------------------------------------------

/**
 * A normalised error returned by the HTTP client.
 *
 * @typedef {Object} ApiError
 * @property {number} status   - HTTP status code, or 0 for network/timeout errors.
 * @property {string} message  - Human-readable description.
 * @property {any}    raw      - Original PocketBase error body, or null.
 */

/**
 * Uniform result envelope returned by every service function.
 * Callers always check `success` before using `data`.
 *
 * @template T
 * @typedef {Object} ApiResult
 * @property {boolean}    success
 * @property {T|null}     data
 * @property {ApiError|null} error
 */

/**
 * PocketBase paginated list response.
 *
 * @template T
 * @typedef {Object} PbListResult
 * @property {number} page
 * @property {number} perPage
 * @property {number} totalItems
 * @property {number} totalPages
 * @property {T[]}    items
 */

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Restaurant
 * @property {string} id
 * @property {string} created
 * @property {string} updated
 * @property {string} name
 * @property {string} slug         - URL-friendly unique identifier.
 * @property {string} address
 * @property {string} phone
 * @property {string} email
 * @property {string} timezone     - IANA timezone string (e.g. "Europe/Madrid").
 * @property {Object.<string, string>} opening_hours - Keys are day abbreviations.
 */

/**
 * @typedef {'rectangle'|'circle'|'square'} TableShape
 * @typedef {'indoor'|'outdoor'|'bar'|''} TableArea
 * @typedef {'available'|'reserved'|'occupied'} TableStatus
 */

/**
 * @typedef {Object} Table
 * @property {string}     id
 * @property {string}     created
 * @property {string}     updated
 * @property {string}     restaurant_id
 * @property {number}     number       - Human-readable table number.
 * @property {number}     capacity     - Maximum guests.
 * @property {TableShape} shape
 * @property {TableArea}  area
 * @property {number}     pos_x        - X coordinate on the floor plan canvas.
 * @property {number}     pos_y        - Y coordinate on the floor plan canvas.
 * @property {number}     width        - Width in floor plan units (default 80).
 * @property {number}     height       - Height in floor plan units (default 60).
 * @property {boolean}    is_active
 */

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} created
 * @property {string} updated
 * @property {string} restaurant_id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {string} notes
 * @property {number} visit_count
 */

/**
 * @typedef {'pending'|'confirmed'|'seated'|'completed'|'cancelled'|'no_show'} ReservationStatus
 * @typedef {'manual'|'phone'|'email'|'whatsapp'|'ai_classified'|''} ReservationSource
 */

/**
 * @typedef {Object} Reservation
 * @property {string}            id
 * @property {string}            created
 * @property {string}            updated
 * @property {string}            restaurant_id
 * @property {string}            table_id      - Empty string when unassigned.
 * @property {string}            customer_id   - Empty string when no linked customer.
 * @property {string}            guest_name
 * @property {string}            guest_email
 * @property {string}            guest_phone
 * @property {number}            party_size
 * @property {string}            reserved_at   - ISO-8601 datetime string (UTC).
 * @property {number}            duration_minutes - Default 90.
 * @property {ReservationStatus} status
 * @property {string}            notes
 * @property {ReservationSource} source
 * @property {number}            ai_confidence - 0–1 score from AI classifier.
 * @property {Object}            [expand]      - Optional expanded relations.
 */

/**
 * @typedef {'created'|'updated'|'cancelled'|'table_assigned'|'reminder_sent'|'confirmation_sent'} LogEvent
 */

/**
 * @typedef {Object} ReservationLog
 * @property {string}   id
 * @property {string}   created
 * @property {string}   reservation_id
 * @property {string}   restaurant_id
 * @property {LogEvent} event
 * @property {any}      details
 */

// ---------------------------------------------------------------------------
// View-model types (used by floor plan and table assignment)
// ---------------------------------------------------------------------------

/**
 * Availability state for a single table at a specific time slot.
 *
 * @typedef {Object} TableAvailability
 * @property {Table}         table
 * @property {boolean}       isAvailable
 * @property {Reservation[]} activeReservations
 */

/**
 * A ranked table suggestion produced by the assignment algorithm.
 *
 * @typedef {Object} TableSuggestion
 * @property {Table}  table
 * @property {number} score   - Lower is better (excess capacity = capacity - partySize).
 * @property {string} reason  - Human-readable explanation e.g. "Exact fit".
 */
