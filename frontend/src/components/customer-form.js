/**
 * customer-form.js
 *
 * Customer CRM form component.
 * Handles both create and edit modes.
 * Dispatches "customersaved" on success.
 */

/** @import { Customer } from '../types.js' */

import { createCustomer, updateCustomer, listCustomers, deleteCustomer } from "../services/customers.js";
import { getReservationHistory } from "../services/customers.js";
import { escHtml, formatDateTime } from "../utils/html.js";

export class CustomerForm {
    /** @type {string} */ #restaurantId;
    /** @type {Customer|null} */ #customer = null;

    /** @param {string} restaurantId */
    constructor(restaurantId) {
        this.#restaurantId = restaurantId;
    }

    // -------------------------------------------------------------------------
    // Public API — form modal
    // -------------------------------------------------------------------------

    /**
     * Render the customer form into the modal body.
     *
     * @param {HTMLElement} container
     * @param {Object}      [defaults]
     * @param {Customer}    [defaults.customer] - Existing customer for edit mode.
     */
    open(container, defaults = {}) {
        this.#customer = defaults.customer ?? null;
        container.innerHTML = this.#renderForm();
    }

    /**
     * Validate, call API, and dispatch "customersaved".
     *
     * @param {HTMLElement} container
     * @returns {Promise<boolean>}
     */
    async save(container) {
        if (!this.#validateForm(container)) return false;

        const data = this.#collectFormData(container);

        const result = this.#customer
            ? await updateCustomer(this.#customer.id, data)
            : await createCustomer(this.#restaurantId, data);

        if (!result.success) {
            this.#showError(container, result.error?.message ?? "Failed to save customer.");
            return false;
        }

        container.dispatchEvent(
            new CustomEvent("customersaved", { bubbles: true, detail: { customer: result.data } })
        );
        return true;
    }

    // -------------------------------------------------------------------------
    // Public API — customer list
    // -------------------------------------------------------------------------

    /**
     * Load and render the customers table with optional search.
     *
     * @param {HTMLElement} container
     * @param {string}      [search]
     */
    async renderList(container, search = "") {
        container.innerHTML = `<div class="flex items-center gap-2 text-muted text-sm" style="padding: 16px;">
            <div class="spinner"></div> Loading customers…
        </div>`;

        const result = await listCustomers(this.#restaurantId, { search, perPage: 100 });

        if (!result.success) {
            container.innerHTML = `<div class="empty-state">
                <div class="empty-state__icon">⚠️</div>
                <div class="empty-state__title">Failed to load customers</div>
            </div>`;
            return;
        }

        const customers = result.data.items ?? [];

        if (customers.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <div class="empty-state__icon">👤</div>
                <div class="empty-state__title">No customers found</div>
                <div class="empty-state__body">Add your first customer or try a different search.</div>
            </div>`;
            return;
        }

        const rows = customers.map((c) => `
            <tr data-customer-id="${escHtml(c.id)}">
                <td>
                    <div class="font-bold">${escHtml(c.name)}</div>
                    ${c.notes ? `<div class="text-xs text-muted">${escHtml(c.notes)}</div>` : ""}
                </td>
                <td>${escHtml(c.email || "—")}</td>
                <td>${escHtml(c.phone || "—")}</td>
                <td>${escHtml(String(c.visit_count ?? 0))}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <button class="btn btn--sm btn--ghost" data-action="edit" data-id="${escHtml(c.id)}" type="button">✏️</button>
                        <button class="btn btn--sm btn--ghost" data-action="delete" data-id="${escHtml(c.id)}" type="button" style="color: var(--color-danger);">🗑</button>
                    </div>
                </td>
            </tr>`).join("");

        container.innerHTML = `
        <div class="data-table-wrap">
            <table class="data-table" aria-label="Customers">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Visits</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;

        // Attach action handlers
        container.querySelectorAll("[data-action]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                if (btn.dataset.action === "edit") {
                    const customer = customers.find((c) => c.id === id);
                    if (customer) {
                        container.dispatchEvent(
                            new CustomEvent("customeredit", { bubbles: true, detail: { customer } })
                        );
                    }
                }
                if (btn.dataset.action === "delete") {
                    container.dispatchEvent(
                        new CustomEvent("customerdelete", { bubbles: true, detail: { customerId: id } })
                    );
                }
            });
        });
    }

    // -------------------------------------------------------------------------
    // Private — rendering
    // -------------------------------------------------------------------------

    /** @returns {string} */
    #renderForm() {
        const c = this.#customer;
        return `
        <div class="form-group">
            <label class="form-label form-label--required" for="cf-name">Full name</label>
            <input type="text" id="cf-name" name="name" class="form-input"
                value="${escHtml(c?.name ?? "")}" required autocomplete="name" />
            <span class="form-error hidden" id="cf-name-err"></span>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label" for="cf-email">Email</label>
                <input type="email" id="cf-email" name="email" class="form-input"
                    value="${escHtml(c?.email ?? "")}" autocomplete="email" />
            </div>
            <div class="form-group">
                <label class="form-label" for="cf-phone">Phone</label>
                <input type="tel" id="cf-phone" name="phone" class="form-input"
                    value="${escHtml(c?.phone ?? "")}" autocomplete="tel" />
            </div>
        </div>

        <div class="form-group">
            <label class="form-label" for="cf-notes">Notes</label>
            <textarea id="cf-notes" name="notes" class="form-textarea"
                placeholder="Allergies, preferences, VIP status…">${escHtml(c?.notes ?? "")}</textarea>
        </div>

        <div class="form-error hidden" id="cf-global-error" style="padding: 8px; border-radius: 6px; background: #fee2e2;"></div>
        `;
    }

    /** @param {HTMLElement} container */
    #validateForm(container) {
        const nameEl = container.querySelector("#cf-name");
        const errEl  = container.querySelector("#cf-name-err");
        if (!nameEl?.value.trim()) {
            nameEl?.classList.add("form-input--error");
            if (errEl) { errEl.textContent = "Name is required."; errEl.classList.remove("hidden"); }
            nameEl?.focus();
            return false;
        }
        return true;
    }

    /**
     * @param {HTMLElement} container
     * @returns {Partial<Customer>}
     */
    #collectFormData(container) {
        const get = (name) => container.querySelector(`[name="${name}"]`)?.value ?? "";
        return {
            name:  get("name").trim(),
            email: get("email").trim(),
            phone: get("phone").trim(),
            notes: get("notes").trim(),
        };
    }

    /**
     * @param {HTMLElement} container
     * @param {string} message
     */
    #showError(container, message) {
        const el = container.querySelector("#cf-global-error");
        if (!el) return;
        el.textContent = message;
        el.classList.remove("hidden");
    }
}
