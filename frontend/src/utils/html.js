/**
 * html.js
 *
 * Utilities for safe HTML generation in vanilla JS components.
 */

/**
 * Escape a string for safe insertion into HTML content.
 * Prevents XSS when rendering user-supplied data.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Format an ISO datetime string for display.
 *
 * @param {string} isoString
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDateTime(isoString, options = {}) {
    if (!isoString) return "—";
    try {
        return new Intl.DateTimeFormat("default", {
            dateStyle: "medium",
            timeStyle: "short",
            ...options,
        }).format(new Date(isoString));
    } catch {
        return isoString;
    }
}

/**
 * Format an ISO datetime string to a date-only string (YYYY-MM-DD).
 * Used to populate <input type="date"> values.
 *
 * @param {string} isoString
 * @returns {string}
 */
export function toDateInput(isoString) {
    if (!isoString) return "";
    return new Date(isoString).toISOString().slice(0, 10);
}

/**
 * Format a Date object as a local datetime string for <input type="datetime-local">.
 * Uses local timezone components, not UTC.
 *
 * @param {Date} d
 * @returns {string} "YYYY-MM-DDTHH:mm"
 */
function toLocalDateTimeString(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
           `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Format an ISO datetime string to datetime-local input value (YYYY-MM-DDTHH:mm).
 * Returns LOCAL time so the input shows the correct time in the user's timezone.
 *
 * @param {string} isoString
 * @returns {string}
 */
export function toDateTimeInput(isoString) {
    if (!isoString) return "";
    return toLocalDateTimeString(new Date(isoString));
}

/**
 * Return the current local datetime formatted for a datetime-local input.
 * Rounds up to the next 30-minute mark.
 *
 * @returns {string}
 */
export function nowRounded() {
    const d = new Date();
    const minutes = d.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    d.setMinutes(roundedMinutes, 0, 0);
    return toLocalDateTimeString(d);
}
