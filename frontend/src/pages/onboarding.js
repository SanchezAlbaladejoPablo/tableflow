/**
 * onboarding.js
 *
 * TASK-051 — Two-step onboarding wizard for new restaurants.
 *
 * Step 1: Add tables (number, capacity, area, shape)
 *   - User can add multiple tables before continuing.
 *
 * Step 2: Configure reservation settings
 *   - Opening / closing time
 *   - Default reservation duration
 *   - Minimum gap between reservations
 *
 * On completion, dispatches "onboardingcomplete" so the app
 * can transition to the main dashboard.
 *
 * Usage:
 *   const wizard = new OnboardingWizard(restaurantId);
 *   wizard.render(document.getElementById("login-overlay"));
 */

import { createTable } from "../services/tables.js";
import { saveSettings, getSettings } from "../services/settings.js";
import { escHtml } from "../utils/html.js";

export class OnboardingWizard {
    /** @type {string} */ #restaurantId;
    /** @type {number} */ #step = 1;
    /** @type {HTMLElement|null} */ #container = null;
    /** @type {Array<{number, capacity, area, shape}>} */ #pendingTables = [];

    /** @param {string} restaurantId */
    constructor(restaurantId) {
        this.#restaurantId = restaurantId;
    }

    /**
     * @param {HTMLElement} container
     */
    render(container) {
        this.#container = container;
        this.#renderStep(container);
    }

    // -------------------------------------------------------------------------
    // Private — step rendering
    // -------------------------------------------------------------------------

    #renderStep(container) {
        container.innerHTML = this.#step === 1
            ? this.#templateStep1()
            : this.#templateStep2();

        this.#step === 1
            ? this.#attachStep1Listeners(container)
            : this.#attachStep2Listeners(container);
    }

    // Step 1 — Tables
    #templateStep1() {
        const tableRows = this.#pendingTables.map((t, i) => `
            <div class="onboarding-table-row" data-index="${i}">
                <span class="onboarding-table-row__label">
                    Mesa ${escHtml(String(t.number))} — ${t.capacity} personas — ${escHtml(t.area)}
                </span>
                <button class="btn-icon onboarding-remove-table" type="button" data-index="${i}" aria-label="Eliminar">
                    &#x2715;
                </button>
            </div>
        `).join("");

        return `
        <div class="login-card" style="max-width: 520px;">
            <div class="onboarding-progress">
                <div class="onboarding-progress__bar" style="width: 50%"></div>
            </div>
            <div class="login-card__logo">
                <span class="app-header__logo">TableFlow</span>
            </div>
            <h1 class="login-card__title">Paso 1 de 2 — Tus mesas</h1>
            <p class="login-card__subtitle">
                Añade las mesas de tu restaurante. Podrás editarlas y reposicionarlas después.
            </p>

            ${this.#pendingTables.length > 0 ? `
            <div class="onboarding-table-list" id="pending-tables-list">
                ${tableRows}
            </div>` : ""}

            <form class="onboarding-add-table-form" id="add-table-form" novalidate>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label form-label--required" for="t-number">Número</label>
                        <input type="number" id="t-number" name="number" class="form-input"
                            min="1" max="999" value="${this.#nextTableNumber()}" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label form-label--required" for="t-capacity">Personas</label>
                        <input type="number" id="t-capacity" name="capacity" class="form-input"
                            min="1" max="50" value="4" required />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="t-area">Zona</label>
                        <select id="t-area" name="area" class="form-select">
                            <option value="indoor">Interior</option>
                            <option value="outdoor">Terraza</option>
                            <option value="bar">Barra</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="t-shape">Forma</label>
                        <select id="t-shape" name="shape" class="form-select">
                            <option value="rect">Rectangular</option>
                            <option value="round">Redonda</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn btn--ghost btn--full" id="btn-add-table">
                    + Añadir mesa
                </button>
            </form>

            <div class="form-error hidden" id="step1-error" role="alert"></div>

            <div style="margin-top: 24px; display: flex; gap: 12px;">
                <button class="btn btn--ghost" id="btn-skip-tables" type="button" style="flex: 1;">
                    Añadir mesas después
                </button>
                <button class="btn btn--primary" id="btn-step1-next" type="button" style="flex: 2;">
                    Continuar →
                </button>
            </div>
        </div>
        `;
    }

    // Step 2 — Settings
    #templateStep2() {
        const s = getSettings();
        return `
        <div class="login-card" style="max-width: 520px;">
            <div class="onboarding-progress">
                <div class="onboarding-progress__bar" style="width: 100%"></div>
            </div>
            <div class="login-card__logo">
                <span class="app-header__logo">TableFlow</span>
            </div>
            <h1 class="login-card__title">Paso 2 de 2 — Configuración</h1>
            <p class="login-card__subtitle">
                Ajusta los horarios y reglas de reserva de tu restaurante.
            </p>

            <form class="login-form" id="settings-form" novalidate>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="s-opening">Apertura</label>
                        <input type="time" id="s-opening" name="opening_time" class="form-input"
                            value="${escHtml(s?.opening_time ?? "13:00")}" />
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="s-closing">Cierre</label>
                        <input type="time" id="s-closing" name="closing_time" class="form-input"
                            value="${escHtml(s?.closing_time ?? "23:30")}" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="s-duration">
                            Duración reserva (min)
                        </label>
                        <input type="number" id="s-duration" name="default_duration_minutes"
                            class="form-input" min="15" max="480" step="15"
                            value="${s?.default_duration_minutes ?? 90}" />
                        <span class="form-hint">Tiempo que ocupa una mesa por reserva</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="s-gap">
                            Margen entre reservas (min)
                        </label>
                        <input type="number" id="s-gap" name="min_gap_minutes"
                            class="form-input" min="0" max="480" step="15"
                            value="${s?.min_gap_minutes ?? 180}" />
                        <span class="form-hint">Tiempo libre entre dos reservas en la misma mesa</span>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="s-color">Color principal</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="color" id="s-color" name="primary_color"
                            value="${escHtml(s?.primary_color ?? "#6366f1")}"
                            style="width: 44px; height: 36px; padding: 2px; border-radius: 6px; border: 1px solid var(--color-border); cursor: pointer;" />
                        <span class="text-sm text-muted">Color de tu panel de gestión</span>
                    </div>
                </div>

                <div class="form-error hidden" id="step2-error" role="alert"></div>

                <div style="display: flex; gap: 12px; margin-top: 8px;">
                    <button class="btn btn--ghost" id="btn-step2-back" type="button" style="flex: 1;">
                        ← Atrás
                    </button>
                    <button type="submit" class="btn btn--primary" id="btn-step2-finish" style="flex: 2;">
                        Empezar a usar TableFlow
                    </button>
                </div>
            </form>
        </div>
        `;
    }

    // -------------------------------------------------------------------------
    // Private — step 1 listeners
    // -------------------------------------------------------------------------

    /** @param {HTMLElement} container */
    #attachStep1Listeners(container) {
        // Add table to pending list
        container.querySelector("#add-table-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const number   = Number(form.querySelector("#t-number")?.value);
            const capacity = Number(form.querySelector("#t-capacity")?.value);
            const area     = form.querySelector("#t-area")?.value ?? "indoor";
            const shape    = form.querySelector("#t-shape")?.value ?? "rect";

            if (!number || number < 1 || !capacity || capacity < 1) return;

            this.#pendingTables.push({ number, capacity, area, shape });
            this.#renderStep(container);
        });

        // Remove table from pending list
        container.addEventListener("click", (e) => {
            const btn = e.target.closest(".onboarding-remove-table");
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            this.#pendingTables.splice(idx, 1);
            this.#renderStep(container);
        });

        // Continue to step 2
        container.querySelector("#btn-step1-next")?.addEventListener("click", async () => {
            const errEl = container.querySelector("#step1-error");
            const btn   = container.querySelector("#btn-step1-next");

            btn.disabled    = true;
            btn.textContent = "Guardando mesas…";

            await this.#savePendingTables(errEl);

            this.#step = 2;
            this.#renderStep(container);
        });

        // Skip tables
        container.querySelector("#btn-skip-tables")?.addEventListener("click", () => {
            this.#step = 2;
            this.#renderStep(container);
        });
    }

    // -------------------------------------------------------------------------
    // Private — step 2 listeners
    // -------------------------------------------------------------------------

    /** @param {HTMLElement} container */
    #attachStep2Listeners(container) {
        container.querySelector("#btn-step2-back")?.addEventListener("click", () => {
            this.#step = 1;
            this.#renderStep(container);
        });

        container.querySelector("#settings-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const form  = e.currentTarget;
            const errEl = container.querySelector("#step2-error");
            const btn   = container.querySelector("#btn-step2-finish");

            btn.disabled    = true;
            btn.textContent = "Guardando…";

            const s = getSettings();
            if (!s?.id) {
                this.#showError(errEl, "Error al cargar la configuración. Recarga la página.");
                btn.disabled    = false;
                btn.textContent = "Empezar a usar TableFlow";
                return;
            }

            const data = {
                opening_time:             form.querySelector("#s-opening")?.value  ?? "13:00",
                closing_time:             form.querySelector("#s-closing")?.value  ?? "23:30",
                default_duration_minutes: Number(form.querySelector("#s-duration")?.value ?? 90),
                min_gap_minutes:          Number(form.querySelector("#s-gap")?.value      ?? 180),
                primary_color:            form.querySelector("#s-color")?.value    ?? "#6366f1",
            };

            const result = await saveSettings(s.id, data);

            if (!result.success) {
                this.#showError(errEl, result.error?.message ?? "Error al guardar la configuración.");
                btn.disabled    = false;
                btn.textContent = "Empezar a usar TableFlow";
                return;
            }

            container.dispatchEvent(new CustomEvent("onboardingcomplete", { bubbles: true }));
        });
    }

    // -------------------------------------------------------------------------
    // Private — helpers
    // -------------------------------------------------------------------------

    /** @param {HTMLElement|null} errEl */
    async #savePendingTables(errEl) {
        const errors = [];
        // Default floor plan positions: distribute in a grid
        const COLS = 4;
        const COL_W = 120;
        const ROW_H = 100;
        const OFFSET_X = 80;
        const OFFSET_Y = 80;

        for (let i = 0; i < this.#pendingTables.length; i++) {
            const t = this.#pendingTables[i];
            const col = i % COLS;
            const row = Math.floor(i / COLS);

            const result = await createTable({
                restaurant_id: this.#restaurantId,
                number:        t.number,
                capacity:      t.capacity,
                area:          t.area,
                shape:         t.shape,
                pos_x:         OFFSET_X + col * COL_W,
                pos_y:         OFFSET_Y + row * ROW_H,
                is_active:     true,
            });

            if (!result.success) {
                errors.push(`Mesa ${t.number}: ${result.error?.message ?? "error"}`);
            }
        }

        if (errors.length > 0 && errEl) {
            this.#showError(errEl, `Algunas mesas no se pudieron guardar: ${errors.join(", ")}`);
        }

        // Clear saved tables from pending list
        this.#pendingTables = [];
    }

    #nextTableNumber() {
        if (this.#pendingTables.length === 0) return 1;
        return Math.max(...this.#pendingTables.map(t => t.number)) + 1;
    }

    /** @param {HTMLElement|null} el @param {string} msg */
    #showError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.classList.remove("hidden");
    }
}
