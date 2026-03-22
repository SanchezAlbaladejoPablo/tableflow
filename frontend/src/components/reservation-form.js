/**
 * reservation-form.js
 *
 * Reservation create/edit form component.
 *
 * Renders form fields into the modal body element.
 * Handles validation and API calls.
 * Dispatches "reservationsaved" on success so the app can refresh its views.
 *
 * Usage:
 *   const form = new ReservationForm(restaurantId);
 *   form.open(bodyEl, { tableId, reservedAt });  // create mode
 *   form.open(bodyEl, { reservation });            // edit mode
 */

/** @import { Reservation, Table, Customer } from '../types.js' */

import { createReservation, updateReservation, getUpcomingTableReservations } from "../services/reservations.js";
import { listTables } from "../services/tables.js";
import { findByPhone, findByEmail, createCustomer } from "../services/customers.js";
import { escHtml, nowRounded, toDateTimeInput } from "../utils/html.js";
import { getDurationMinutes, getGapMinutes } from "../services/settings.js";

export class ReservationForm {
    /** @type {string} */ #restaurantId;
    /** @type {Reservation|null} */ #reservation = null;
    /** @type {HTMLElement|null} */ #container = null;

    /** @param {string} restaurantId */
    constructor(restaurantId) {
        this.#restaurantId = restaurantId;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Render the form into a container element.
     *
     * @param {HTMLElement} container - The modal body element.
     * @param {Object}      [defaults]
     * @param {string}      [defaults.tableId]      - Pre-selected table ID.
     * @param {string}      [defaults.reservedAt]   - Pre-filled datetime (ISO string).
     * @param {number}      [defaults.partySize]    - Pre-filled party size.
     * @param {Reservation} [defaults.reservation]  - Existing reservation for edit mode.
     */
    async open(container, defaults = {}) {
        this.#container = container;
        this.#reservation = defaults.reservation ?? null;

        // Load tables for the dropdown
        const tablesResult = await listTables(this.#restaurantId, { activeOnly: true });
        const tables = tablesResult.success ? (tablesResult.data.items ?? []) : [];

        container.innerHTML = this.#renderForm(defaults, tables);
        this.#attachValidation(container);
    }

    /**
     * Read the form, validate, call the API, and dispatch "reservationsaved".
     * Called by the app when the save button is clicked.
     *
     * @param {HTMLElement} container
     * @returns {Promise<boolean>} true on success
     */
    async save(container) {
        if (!this.#validateForm(container)) return false;

        const data = this.#collectFormData(container);

        // Validate 3-hour gap between reservations on the same table
        if (data.table_id) {
            const conflict = await this.#checkTableGap(data);
            if (conflict) {
                this.#showFormError(container, conflict);
                return false;
            }
        }

        // Auto-link customer by phone/email if provided
        const customerId = await this.#resolveCustomerId(data);
        if (customerId) data.customer_id = customerId;

        const result = this.#reservation
            ? await updateReservation(this.#reservation.id, data)
            : await createReservation({ ...data, restaurant_id: this.#restaurantId });

        if (!result.success) {
            this.#showFormError(container, result.error?.message ?? "Failed to save reservation.");
            return false;
        }

        container.dispatchEvent(
            new CustomEvent("reservationsaved", { bubbles: true, detail: { reservation: result.data } })
        );
        return true;
    }

    // -------------------------------------------------------------------------
    // Private — rendering
    // -------------------------------------------------------------------------

    /**
     * @param {Object} defaults
     * @param {Table[]} tables
     * @returns {string}
     */
    #renderForm(defaults, tables) {
        const r = this.#reservation;
        const isEdit = !!r;

        const tableOptions = tables.map(
            (t) => `<option value="${escHtml(t.id)}" ${(defaults.tableId || r?.table_id) === t.id ? "selected" : ""}>
                Table ${t.number} — ${t.capacity} seats (${t.area || "indoor"})
            </option>`
        ).join("");

        const reservedAt = toDateTimeInput(r?.reserved_at ?? defaults.reservedAt ?? "") || nowRounded();

        return `
        <div class="form-row">
            <div class="form-group" style="flex: 2;">
                <label class="form-label form-label--required" for="rf-guest-name">Name</label>
                <input type="text" id="rf-guest-name" name="guest_name" class="form-input"
                    value="${escHtml(r?.guest_name ?? "")}" required autocomplete="name"
                    placeholder="Guest name" />
                <span class="form-error hidden" id="rf-guest-name-err"></span>
            </div>
            <div class="form-group">
                <label class="form-label form-label--required" for="rf-party-size">Guests</label>
                <input type="number" id="rf-party-size" name="party_size" class="form-input"
                    value="${r?.party_size ?? defaults.partySize ?? 2}" min="1" max="100" required />
                <span class="form-error hidden" id="rf-party-size-err"></span>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label" for="rf-guest-phone">Phone</label>
                <input type="tel" id="rf-guest-phone" name="guest_phone" class="form-input"
                    value="${escHtml(r?.guest_phone ?? "")}" autocomplete="tel"
                    placeholder="+34 600 000 000" />
            </div>
            <div class="form-group">
                <label class="form-label" for="rf-guest-email">Email</label>
                <input type="email" id="rf-guest-email" name="guest_email" class="form-input"
                    value="${escHtml(r?.guest_email ?? "")}" autocomplete="email" />
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label form-label--required" for="rf-reserved-at">Date &amp; Time</label>
                <input type="datetime-local" id="rf-reserved-at" name="reserved_at" class="form-input"
                    value="${escHtml(reservedAt)}" required />
                <span class="form-error hidden" id="rf-reserved-at-err"></span>
            </div>
            <div class="form-group">
                <label class="form-label" for="rf-table">Table</label>
                <select id="rf-table" name="table_id" class="form-select">
                    <option value="">— Unassigned —</option>
                    ${tableOptions}
                </select>
            </div>
        </div>

        ${isEdit ? `
        <div class="form-group">
            <label class="form-label" for="rf-status">Status</label>
            <select id="rf-status" name="status" class="form-select">
                <option value="pending"   ${r.status === "pending"   ? "selected" : ""}>Pending</option>
                <option value="confirmed" ${r.status === "confirmed" ? "selected" : ""}>Confirmed</option>
                <option value="seated"    ${r.status === "seated"    ? "selected" : ""}>Seated</option>
                <option value="completed" ${r.status === "completed" ? "selected" : ""}>Completed</option>
                <option value="cancelled" ${r.status === "cancelled" ? "selected" : ""}>Cancelled</option>
                <option value="no_show"   ${r.status === "no_show"   ? "selected" : ""}>No Show</option>
            </select>
        </div>` : `
        <input type="hidden" name="status" value="pending" />`}

        <div class="form-group">
            <label class="form-label" for="rf-notes">Notes</label>
            <textarea id="rf-notes" name="notes" class="form-textarea"
                placeholder="Special requests, allergies, preferences…" rows="2">${escHtml(r?.notes ?? "")}</textarea>
        </div>

        <div class="form-error hidden" id="rf-global-error" style="padding: 8px; border-radius: 6px; background: #fee2e2;"></div>
        `;
    }

    // -------------------------------------------------------------------------
    // Private — validation & data collection
    // -------------------------------------------------------------------------

    /** @param {HTMLElement} container */
    #attachValidation(container) {
        // Clear error state on input
        container.querySelectorAll(".form-input, .form-select, .form-textarea").forEach((el) => {
            el.addEventListener("input", () => {
                el.classList.remove("form-input--error");
                const errEl = container.querySelector(`#${el.id}-err`);
                if (errEl) { errEl.textContent = ""; errEl.classList.add("hidden"); }
            });
        });
    }

    /**
     * @param {HTMLElement} container
     * @returns {boolean}
     */
    #validateForm(container) {
        let valid = true;

        const validate = (id, test, message) => {
            const el = container.querySelector(`#${id}`);
            const errEl = container.querySelector(`#${id}-err`);
            if (!el) return;
            if (!test(el.value)) {
                el.classList.add("form-input--error");
                if (errEl) { errEl.textContent = message; errEl.classList.remove("hidden"); }
                if (valid) el.focus();
                valid = false;
            }
        };

        validate("rf-guest-name",  (v) => v.trim().length > 0, "Guest name is required.");
        validate("rf-party-size",  (v) => Number(v) >= 1,      "Party size must be at least 1.");
        validate("rf-reserved-at", (v) => Boolean(v),          "Date and time are required.");

        return valid;
    }

    /**
     * @param {HTMLElement} container
     * @returns {Partial<Reservation>}
     */
    #collectFormData(container) {
        const get = (name) => container.querySelector(`[name="${name}"]`)?.value ?? "";
        return {
            guest_name:       get("guest_name").trim(),
            guest_email:      get("guest_email").trim(),
            guest_phone:      get("guest_phone").trim(),
            party_size:       Number(get("party_size")),
            reserved_at:      new Date(get("reserved_at")).toISOString(),
            duration_minutes: getDurationMinutes(),
            table_id:         get("table_id") || "",
            status:           get("status") || "pending",
            source:           this.#reservation?.source || "manual",
            notes:            get("notes").trim(),
        };
    }

    /**
     * Try to find or create a customer record from the form's contact details.
     * Returns a customer ID to link, or null if not applicable.
     *
     * @param {Partial<Reservation>} data
     * @returns {Promise<string|null>}
     */
    async #resolveCustomerId(data) {
        const phone = data.guest_phone;
        const email = data.guest_email;

        if (phone) {
            const result = await findByPhone(this.#restaurantId, phone);
            if (result.success && result.data) return result.data.id;
        }

        if (email) {
            const result = await findByEmail(this.#restaurantId, email);
            if (result.success && result.data) return result.data.id;
        }

        // Auto-create customer if we have at least a name and one contact detail
        if (data.guest_name && (phone || email)) {
            const result = await createCustomer(this.#restaurantId, {
                name:  data.guest_name,
                email: email || "",
                phone: phone || "",
            });
            if (result.success) return result.data.id;
        }

        return null;
    }

    /**
     * Check that the chosen table has no existing reservation within a 3-hour gap.
     * Returns an error message string if there is a conflict, or null if it's clear.
     *
     * @param {Partial<import('../types.js').Reservation>} data
     * @returns {Promise<string|null>}
     */
    async #checkTableGap(data) {
        const result = await getUpcomingTableReservations(data.table_id);
        if (!result.success) return null; // can't verify — allow through

        const GAP_MS    = getGapMinutes() * 60_000;
        const newStart  = new Date(data.reserved_at).getTime();
        const newEnd    = newStart + (data.duration_minutes ?? 90) * 60_000;

        for (const r of result.data.items ?? []) {
            // Skip the reservation being edited
            if (this.#reservation && r.id === this.#reservation.id) continue;

            const rStart = new Date(r.reserved_at.replace(" ", "T")).getTime();
            if (isNaN(rStart)) continue;
            const rEnd = rStart + (r.duration_minutes ?? getDurationMinutes()) * 60_000;

            // Conflict: new slot is within 3h of an existing slot on either side
            if (newStart < rEnd + GAP_MS && newEnd > rStart - GAP_MS) {
                const t = new Date(rStart).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                const guestName = r.guest_name || "otro cliente";
                return `Esta mesa ya tiene una reserva a las ${t} (${guestName}). ` +
                       `Se requieren mínimo ${getGapMinutes()} minutos de margen entre reservas.`;
            }
        }
        return null;
    }

    /**
     * @param {HTMLElement} container
     * @param {string} message
     */
    #showFormError(container, message) {
        const el = container.querySelector("#rf-global-error");
        if (!el) return;
        el.textContent = message;
        el.classList.remove("hidden");
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}
