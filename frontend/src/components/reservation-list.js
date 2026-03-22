/**
 * reservation-list.js
 *
 * Renders a table of reservations and provides inline status updates.
 * Dispatches events for edit and delete actions so the parent handles them.
 *
 * Events:
 *   "reservationedit"   → { detail: { reservation } }
 *   "reservationdelete" → { detail: { reservationId } }
 */

/** @import { Reservation, PbListResult } from '../types.js' */

import { listReservations, updateStatus } from "../services/reservations.js";
import { escHtml, formatDateTime } from "../utils/html.js";

const STATUS_TRANSITIONS = {
    pending:   ["confirmed", "cancelled"],
    confirmed: ["seated", "cancelled"],
    seated:    ["completed", "no_show"],
    completed: [],
    cancelled: [],
    no_show:   [],
};

export class ReservationList {
    /** @type {string} */ #restaurantId;
    /** @type {HTMLElement|null} */ #container = null;
    /** @type {Reservation[]} */ #reservations = [];

    /** @param {string} restaurantId */
    constructor(restaurantId) {
        this.#restaurantId = restaurantId;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Load and render reservations.
     *
     * @param {HTMLElement} container
     * @param {Object} [filters]
     * @param {string} [filters.date]   - YYYY-MM-DD
     * @param {string} [filters.status]
     */
    async render(container, filters = {}) {
        this.#container = container;
        container.innerHTML = `<div class="flex items-center gap-2 text-muted text-sm" style="padding: 16px;">
            <div class="spinner"></div> Loading reservations…
        </div>`;

        const result = await listReservations(this.#restaurantId, {
            ...filters,
            expand: "table_id,customer_id",
            sort: "+reserved_at",
            perPage: 100,
        });

        if (!result.success) {
            container.innerHTML = `<div class="empty-state">
                <div class="empty-state__icon">⚠️</div>
                <div class="empty-state__title">Failed to load reservations</div>
                <div class="empty-state__body">${escHtml(result.error?.message ?? "Unknown error")}</div>
            </div>`;
            return;
        }

        this.#reservations = result.data.items ?? [];
        this.#paint(container);
    }

    // -------------------------------------------------------------------------
    // Private — rendering
    // -------------------------------------------------------------------------

    /** @param {HTMLElement} container */
    #paint(container) {
        if (this.#reservations.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <div class="empty-state__icon">📅</div>
                <div class="empty-state__title">No reservations found</div>
                <div class="empty-state__body">Try a different date or status filter.</div>
            </div>`;
            return;
        }

        const rows = this.#reservations.map((r) => this.#renderRow(r)).join("");

        container.innerHTML = `
        <div class="data-table-wrap">
            <table class="data-table" aria-label="Reservations">
                <thead>
                    <tr>
                        <th>Guest</th>
                        <th>Party</th>
                        <th>Date &amp; Time</th>
                        <th>Table</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="reservations-tbody">
                    ${rows}
                </tbody>
            </table>
        </div>`;

        this.#attachRowHandlers(container);
    }

    /**
     * @param {Reservation} r
     * @returns {string}
     */
    #renderRow(r) {
        const table = r.expand?.table_id;
        const tableLabel = table ? `Table ${table.number}` : `<span class="text-muted">Unassigned</span>`;

        const transitions = STATUS_TRANSITIONS[r.status] ?? [];
        const statusButtons = transitions
            .map((s) => `<button class="btn btn--sm btn--secondary" data-action="status" data-id="${escHtml(r.id)}" data-status="${s}" type="button">
                → ${s.replace("_", " ")}
            </button>`)
            .join(" ");

        return `<tr data-reservation-id="${escHtml(r.id)}">
            <td>
                <div class="font-bold">${escHtml(r.guest_name)}</div>
                ${r.guest_phone ? `<div class="text-xs text-muted">${escHtml(r.guest_phone)}</div>` : ""}
            </td>
            <td>${escHtml(String(r.party_size))} pax</td>
            <td>${formatDateTime(r.reserved_at)}</td>
            <td>${tableLabel}</td>
            <td><span class="badge badge--${r.status.replace("_", "-")}">${r.status.replace("_", " ")}</span></td>
            <td>
                <div class="flex items-center gap-2">
                    ${statusButtons}
                    <button class="btn btn--sm btn--ghost" data-action="edit" data-id="${escHtml(r.id)}" type="button" aria-label="Edit reservation">✏️</button>
                    <button class="btn btn--sm btn--ghost" data-action="delete" data-id="${escHtml(r.id)}" type="button" aria-label="Delete reservation" style="color: var(--color-danger);">🗑</button>
                </div>
            </td>
        </tr>`;
    }

    /** @param {HTMLElement} container */
    #attachRowHandlers(container) {
        container.querySelectorAll("[data-action]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const action = btn.dataset.action;
                const id     = btn.dataset.id;

                if (action === "edit") {
                    const reservation = this.#reservations.find((r) => r.id === id);
                    if (reservation) {
                        this.#container.dispatchEvent(
                            new CustomEvent("reservationedit", { bubbles: true, detail: { reservation } })
                        );
                    }
                }

                if (action === "delete") {
                    this.#container.dispatchEvent(
                        new CustomEvent("reservationdelete", { bubbles: true, detail: { reservationId: id } })
                    );
                }

                if (action === "status") {
                    btn.disabled = true;
                    const result = await updateStatus(id, btn.dataset.status);
                    if (result.success) {
                        // Update the reservation in local cache and re-render the row
                        const idx = this.#reservations.findIndex((r) => r.id === id);
                        if (idx !== -1) {
                            this.#reservations[idx] = result.data;
                            const row = container.querySelector(`tr[data-reservation-id="${id}"]`);
                            if (row) row.outerHTML = this.#renderRow(result.data);
                            this.#attachRowHandlers(container);
                        }
                    } else {
                        btn.disabled = false;
                    }
                }
            });
        });
    }
}
