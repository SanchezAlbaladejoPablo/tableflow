/**
 * register.js
 *
 * Restaurant self-service registration page.
 *
 * Collects: email, password, restaurant name.
 * Calls POST /api/custom/register (server-side hook that atomically
 * creates user + restaurant + settings).
 *
 * On success: stores the JWT via auth.js and dispatches "registersuccess"
 * so the app can show the onboarding wizard.
 *
 * Usage:
 *   const page = new RegisterPage();
 *   page.render(document.getElementById("login-overlay"));
 */

import { setAuthToken } from "../services/api.js";
import { escHtml }      from "../utils/html.js";

const REGISTER_URL = "/api/custom/register";

export class RegisterPage {
    /** @type {HTMLElement|null} */
    #container = null;

    /**
     * @param {HTMLElement} container
     */
    render(container) {
        this.#container = container;
        container.innerHTML = this.#template();
        this.#attachListeners(container);
    }

    // -------------------------------------------------------------------------
    // Private — rendering
    // -------------------------------------------------------------------------

    #template() {
        return `
        <div class="login-card">
            <div class="login-card__logo">
                <span class="app-header__logo">TableFlow</span>
            </div>
            <h1 class="login-card__title">Crea tu restaurante</h1>
            <p class="login-card__subtitle">Empieza a gestionar reservas en menos de 5 minutos</p>

            <form class="login-form" id="register-form" novalidate>
                <div class="form-group">
                    <label class="form-label form-label--required" for="reg-restaurant-name">
                        Nombre del restaurante
                    </label>
                    <input
                        type="text"
                        id="reg-restaurant-name"
                        name="restaurantName"
                        class="form-input"
                        placeholder="La Terraza, El Rincón de Juan…"
                        autocomplete="organization"
                        required
                    />
                </div>

                <div class="form-group">
                    <label class="form-label form-label--required" for="reg-email">
                        Tu email
                    </label>
                    <input
                        type="email"
                        id="reg-email"
                        name="email"
                        class="form-input"
                        placeholder="tu@restaurante.com"
                        autocomplete="email"
                        required
                    />
                </div>

                <div class="form-group">
                    <label class="form-label form-label--required" for="reg-password">
                        Contraseña
                    </label>
                    <input
                        type="password"
                        id="reg-password"
                        name="password"
                        class="form-input"
                        placeholder="Mínimo 8 caracteres"
                        autocomplete="new-password"
                        minlength="8"
                        required
                    />
                </div>

                <div class="form-error hidden" id="register-error" role="alert"></div>

                <button type="submit" class="btn btn--primary btn--full" id="register-submit">
                    Crear cuenta y restaurante
                </button>
            </form>

            <p class="login-card__subtitle" style="margin-top: 16px; margin-bottom: 0;">
                ¿Ya tienes cuenta?
                <button class="btn-link" id="btn-go-login" type="button">Iniciar sesión</button>
            </p>
        </div>
        `;
    }

    // -------------------------------------------------------------------------
    // Private — event handling
    // -------------------------------------------------------------------------

    /** @param {HTMLElement} container */
    #attachListeners(container) {
        const form   = container.querySelector("#register-form");
        const errEl  = container.querySelector("#register-error");
        const btn    = container.querySelector("#register-submit");

        form?.addEventListener("submit", async (e) => {
            e.preventDefault();

            const restaurantName = form.querySelector("#reg-restaurant-name")?.value?.trim() ?? "";
            const email          = form.querySelector("#reg-email")?.value?.trim()           ?? "";
            const password       = form.querySelector("#reg-password")?.value                ?? "";

            if (!restaurantName || !email || !password) {
                this.#showError(errEl, "Completa todos los campos.");
                return;
            }
            if (password.length < 8) {
                this.#showError(errEl, "La contraseña debe tener al menos 8 caracteres.");
                return;
            }

            btn.disabled    = true;
            btn.textContent = "Creando cuenta…";
            this.#hideError(errEl);

            const result = await this.#callRegister({ restaurantName, email, password });

            if (result.success) {
                // Store auth token — same shape as login response
                const { token, record, restaurant } = result.data;

                // Persist session in localStorage (mirrors auth.js structure)
                const session = { token, user: record };
                try { localStorage.setItem("tf_auth", JSON.stringify(session)); } catch { /* ignore */ }
                setAuthToken(token);

                container.dispatchEvent(
                    new CustomEvent("registersuccess", {
                        bubbles: true,
                        detail:  { token, user: record, restaurant },
                    })
                );
                return;
            }

            btn.disabled    = false;
            btn.textContent = "Crear cuenta y restaurante";

            const msg = result.error?.status === 409
                ? "Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?"
                : (result.error?.message ?? "Error al crear la cuenta. Inténtalo de nuevo.");

            this.#showError(errEl, msg);
        });

        // Switch to login
        container.querySelector("#btn-go-login")?.addEventListener("click", () => {
            container.dispatchEvent(new CustomEvent("showlogin", { bubbles: true }));
        });

        form?.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", () => this.#hideError(errEl));
        });
    }

    /**
     * @param {{ restaurantName: string, email: string, password: string }} body
     * @returns {Promise<{ success: boolean, data?: any, error?: any }>}
     */
    async #callRegister(body) {
        const baseUrl = window.APP_CONFIG?.POCKETBASE_URL ?? "http://localhost:8090";
        try {
            const res = await fetch(`${baseUrl}${REGISTER_URL}`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(body),
            });
            const parsed = await res.json();
            if (!res.ok) return { success: false, error: { status: res.status, message: parsed?.message } };
            return { success: true, data: parsed };
        } catch (err) {
            return { success: false, error: { status: 0, message: "Error de conexión." } };
        }
    }

    /** @param {HTMLElement|null} el @param {string} msg */
    #showError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.classList.remove("hidden");
    }

    /** @param {HTMLElement|null} el */
    #hideError(el) {
        if (!el) return;
        el.textContent = "";
        el.classList.add("hidden");
    }
}
