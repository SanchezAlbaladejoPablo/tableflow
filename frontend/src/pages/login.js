/**
 * login.js
 *
 * Login page component for TableFlow.
 *
 * Renders a centered login form into the provided container element.
 * On successful authentication, dispatches a "loginsuccess" CustomEvent
 * on the container so the app can proceed with initialization.
 *
 * Usage:
 *   const page = new LoginPage();
 *   page.render(document.getElementById("login-overlay"));
 */

import { login } from "../services/auth.js";
import { escHtml } from "../utils/html.js";

export class LoginPage {
    /** @type {HTMLElement|null} */
    #container = null;

    /**
     * Render the login form into a container element.
     *
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
            <h1 class="login-card__title">Iniciar sesión</h1>
            <p class="login-card__subtitle">Accede al panel de gestión de tu restaurante</p>

            <form class="login-form" id="login-form" novalidate>
                <div class="form-group">
                    <label class="form-label form-label--required" for="login-email">
                        Email
                    </label>
                    <input
                        type="email"
                        id="login-email"
                        name="email"
                        class="form-input"
                        placeholder="tu@restaurante.com"
                        autocomplete="email"
                        required
                    />
                </div>

                <div class="form-group">
                    <label class="form-label form-label--required" for="login-password">
                        Contraseña
                    </label>
                    <input
                        type="password"
                        id="login-password"
                        name="password"
                        class="form-input"
                        placeholder="••••••••"
                        autocomplete="current-password"
                        required
                    />
                </div>

                <div class="form-error hidden" id="login-error" role="alert"></div>

                <button type="submit" class="btn btn--primary btn--full" id="login-submit">
                    Entrar
                </button>
            </form>

            <p class="login-card__subtitle" style="margin-top: 16px; margin-bottom: 0;">
                ¿No tienes cuenta?
                <button class="btn-link" id="btn-go-register" type="button">Crea tu restaurante gratis</button>
            </p>
        </div>
        `;
    }

    // -------------------------------------------------------------------------
    // Private — event handling
    // -------------------------------------------------------------------------

    /** @param {HTMLElement} container */
    #attachListeners(container) {
        const form   = container.querySelector("#login-form");
        const errEl  = container.querySelector("#login-error");
        const btn    = container.querySelector("#login-submit");

        form?.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email    = form.querySelector("#login-email")?.value?.trim() ?? "";
            const password = form.querySelector("#login-password")?.value ?? "";

            if (!email || !password) {
                this.#showError(errEl, "Por favor introduce tu email y contraseña.");
                return;
            }

            btn.disabled    = true;
            btn.textContent = "Entrando…";
            this.#hideError(errEl);

            const result = await login(email, password);

            if (result.success) {
                container.dispatchEvent(
                    new CustomEvent("loginsuccess", { bubbles: true })
                );
                return;
            }

            btn.disabled    = false;
            btn.textContent = "Entrar";

            // PocketBase returns 400 for wrong credentials
            const msg = result.error?.status === 400
                ? "Email o contraseña incorrectos."
                : (result.error?.message ?? "Error al iniciar sesión. Inténtalo de nuevo.");

            this.#showError(errEl, msg);
            form.querySelector("#login-password")?.select();
        });

        // Switch to register page
        container.querySelector("#btn-go-register")?.addEventListener("click", () => {
            container.dispatchEvent(new CustomEvent("showregister", { bubbles: true }));
        });

        // Clear error on any input change
        form?.querySelectorAll("input").forEach((input) => {
            input.addEventListener("input", () => this.#hideError(errEl));
        });
    }

    /** @param {HTMLElement|null} el @param {string} msg */
    #showError(el, msg) {
        if (!el) return;
        el.textContent = escHtml(msg);
        el.classList.remove("hidden");
    }

    /** @param {HTMLElement|null} el */
    #hideError(el) {
        if (!el) return;
        el.textContent = "";
        el.classList.add("hidden");
    }
}
