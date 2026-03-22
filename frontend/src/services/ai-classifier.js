/**
 * ai-classifier.js
 *
 * Client for the AI message classification n8n workflow.
 * Sends a free-text message and receives structured reservation data.
 *
 * The actual AI call is made by n8n (which calls OpenAI).
 * This service only calls the n8n webhook endpoint.
 */

/** @import { ApiResult } from '../types.js' */

/**
 * @typedef {Object} ClassificationResult
 * @property {'new_reservation'|'cancellation'|'modification'|'inquiry'|'other'} intent
 * @property {string|null} name
 * @property {string|null} phone
 * @property {string|null} email
 * @property {number|null} party_size
 * @property {string|null} datetime   - ISO-8601 string or null
 * @property {string|null} notes
 * @property {number}      confidence - 0–1
 */

const CLASSIFIER_ENDPOINT =
    (window.APP_CONFIG?.N8N_BASE_URL ?? "http://localhost:5678") +
    "/webhook/ai-classifier";

const CLASSIFIER_TIMEOUT_MS = 30_000;

/**
 * Classify a free-text message using the AI classifier workflow.
 *
 * @param {string} message  - Raw message text from any channel.
 * @param {Object} [meta]
 * @param {string} [meta.channel] - "email" | "sms" | "whatsapp" | etc.
 * @param {string} [meta.from]    - Sender contact info.
 * @returns {Promise<ApiResult<ClassificationResult>>}
 */
export async function classifyMessage(message, meta = {}) {
    if (!message?.trim()) {
        return {
            success: false,
            data: null,
            error: { status: 400, message: "Message cannot be empty.", raw: null },
        };
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), CLASSIFIER_TIMEOUT_MS);

    try {
        const response = await fetch(CLASSIFIER_ENDPOINT, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ message, channel: meta.channel ?? "manual", from: meta.from ?? "" }),
            signal:  controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const raw = await response.json().catch(() => null);
            return {
                success: false,
                data: null,
                error: { status: response.status, message: `Classifier error: HTTP ${response.status}`, raw },
            };
        }

        /** @type {ClassificationResult} */
        const result = await response.json();

        return { success: true, data: result, error: null };

    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === "AbortError") {
            return {
                success: false,
                data: null,
                error: { status: 408, message: "Classification request timed out.", raw: err },
            };
        }

        return {
            success: false,
            data: null,
            error: { status: 0, message: "Network error reaching AI classifier.", raw: err },
        };
    }
}

/**
 * Convert a ClassificationResult into a partial Reservation object
 * ready to pre-fill the reservation form.
 *
 * @param {ClassificationResult} result
 * @returns {Partial<import('../types.js').Reservation>}
 */
export function classificationToReservation(result) {
    return {
        guest_name:       result.name       ?? "",
        guest_phone:      result.phone      ?? "",
        guest_email:      result.email      ?? "",
        party_size:       result.party_size ?? 2,
        reserved_at:      result.datetime   ?? "",
        notes:            result.notes      ?? "",
        source:           "ai_classified",
        ai_confidence:    result.confidence ?? 0,
    };
}
