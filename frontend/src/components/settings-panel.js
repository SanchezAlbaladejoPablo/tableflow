/**
 * settings-panel.js — Phase 17
 *
 * Widget settings panel for restaurant_admin users.
 * Allows enabling/disabling the public booking widget, managing the token,
 * setting a custom welcome message, and copying the embed snippet.
 *
 * TASK-070: Manage booking_widget_enabled, booking_widget_token, booking_widget_message.
 * TASK-074: Generate and display the iframe embed code.
 */

import { getSettings, saveSettings } from "../services/settings.js";
import { escHtml }                   from "../utils/html.js";

export class SettingsPanel {
    /**
     * @param {string} restaurantId
     */
    constructor(restaurantId) {
        this._restaurantId = restaurantId;
    }

    /**
     * Render the panel into the given container.
     * @param {HTMLElement} container
     */
    render(container) {
        const s = getSettings();
        if (!s) {
            container.innerHTML = `<p class="settings-error">No se pudieron cargar los ajustes.</p>`;
            return;
        }

        const enabled = !!s.booking_widget_enabled;
        const token   = s.booking_widget_token ?? "";
        const message = s.booking_widget_message ?? "";
        const pbUrl   = window.APP_CONFIG?.POCKETBASE_URL ?? "http://localhost:8090";
        const widgetBase = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
        const embedUrl   = `${widgetBase}widget.html?token=${encodeURIComponent(token)}&pb=${encodeURIComponent(pbUrl)}`;

        container.innerHTML = `
        <div class="settings-container">

            <section class="settings-section">
                <h2 class="settings-section__title">Widget de reservas público</h2>
                <p class="settings-section__desc">
                    El widget es un formulario embebible en tu web que permite a los clientes
                    solicitar reservas sin necesidad de cuenta. Las reservas entran con estado
                    <strong>Pendiente</strong> para que el equipo las confirme.
                </p>

                <!-- Enable toggle — TASK-070 -->
                <div class="settings-row">
                    <label class="settings-row__label" for="sw-enabled">Activar widget</label>
                    <label class="toggle" aria-label="Activar widget de reservas">
                        <input type="checkbox" id="sw-enabled" ${enabled ? "checked" : ""} />
                        <span class="toggle__track"></span>
                    </label>
                </div>

                <!-- Token — TASK-070 -->
                <div class="settings-row settings-row--col">
                    <label class="settings-row__label" for="sw-token">Token del widget</label>
                    <div class="settings-token-row">
                        <input
                            type="text"
                            id="sw-token"
                            class="form-input form-input--mono"
                            value="${escHtml(token)}"
                            readonly
                            placeholder="Se generará al guardar"
                            aria-label="Token del widget"
                        />
                        <button class="btn btn--ghost btn--sm" id="btn-regen-token" type="button" title="Generar nuevo token">
                            ↻ Nuevo
                        </button>
                    </div>
                    <p class="settings-hint">El token identifica tu restaurante de forma segura. Cámbialo solo si sospechas que ha sido comprometido.</p>
                </div>

                <!-- Custom message — TASK-070 -->
                <div class="settings-row settings-row--col">
                    <label class="settings-row__label" for="sw-message">Mensaje de bienvenida</label>
                    <input
                        type="text"
                        id="sw-message"
                        class="form-input"
                        value="${escHtml(message)}"
                        placeholder="Completa el formulario y te confirmaremos la reserva."
                        maxlength="200"
                    />
                </div>

                <div class="settings-actions">
                    <button class="btn btn--primary" id="btn-save-widget" type="button">
                        Guardar ajustes
                    </button>
                    <span class="settings-save-status" id="save-status" hidden></span>
                </div>
            </section>

            <!-- Embed snippet — TASK-074 -->
            <section class="settings-section" id="embed-section" ${!enabled || !token ? 'hidden' : ''}>
                <h2 class="settings-section__title">Código de integración</h2>
                <p class="settings-section__desc">
                    Pega este código en cualquier página de tu web para mostrar el formulario de reservas.
                </p>

                <div class="settings-row settings-row--col">
                    <label class="settings-row__label" for="sw-embed">Snippet HTML</label>
                    <div class="settings-embed-wrap">
                        <textarea
                            id="sw-embed"
                            class="form-input form-input--mono settings-embed-code"
                            readonly
                            rows="3"
                            aria-label="Código iframe del widget"
                        >${escHtml(`<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.10);" title="Reservar mesa" loading="lazy"></iframe>`)}</textarea>
                        <button class="btn btn--ghost btn--sm settings-embed-copy" id="btn-copy-embed" type="button">
                            Copiar
                        </button>
                    </div>
                </div>

                <div class="settings-row settings-row--col">
                    <label class="settings-row__label">Vista previa</label>
                    <a
                        href="${escHtml(embedUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn--ghost btn--sm settings-preview-link"
                    >
                        Abrir widget en nueva pestaña ↗
                    </a>
                </div>
            </section>

        </div>`;

        this._bindEvents(container, s);
    }

    // -------------------------------------------------------------------------
    // Event binding
    // -------------------------------------------------------------------------

    _bindEvents(container, settings) {
        const enabledEl = container.querySelector("#sw-enabled");
        const tokenEl   = container.querySelector("#sw-token");
        const msgEl     = container.querySelector("#sw-message");
        const saveBtn   = container.querySelector("#btn-save-widget");
        const regenBtn  = container.querySelector("#btn-regen-token");
        const copyBtn   = container.querySelector("#btn-copy-embed");
        const embedSec  = container.querySelector("#embed-section");
        const status    = container.querySelector("#save-status");

        // Generate new token
        regenBtn?.addEventListener("click", () => {
            tokenEl.value = crypto.randomUUID();
            this._updateEmbedSnippet(container, tokenEl.value);
        });

        // If no token yet, generate one automatically
        if (!tokenEl.value) {
            tokenEl.value = crypto.randomUUID();
        }

        // Copy embed code
        copyBtn?.addEventListener("click", async () => {
            const code = container.querySelector("#sw-embed")?.value ?? "";
            try {
                await navigator.clipboard.writeText(code);
                copyBtn.textContent = "¡Copiado!";
                setTimeout(() => { copyBtn.textContent = "Copiar"; }, 2000);
            } catch {
                copyBtn.textContent = "Error";
            }
        });

        // Save
        saveBtn?.addEventListener("click", async () => {
            if (!settings?.id) return;
            saveBtn.disabled = true;

            const data = {
                booking_widget_enabled:  enabledEl.checked,
                booking_widget_token:    tokenEl.value.trim(),
                booking_widget_message:  msgEl.value.trim(),
            };

            const result = await saveSettings(settings.id, data);

            if (result.success) {
                this._showStatus(status, "Guardado ✓", "success");
                if (enabledEl.checked && tokenEl.value) {
                    embedSec?.removeAttribute("hidden");
                    this._updateEmbedSnippet(container, tokenEl.value);
                } else {
                    if (embedSec) embedSec.hidden = true;
                }
            } else {
                this._showStatus(status, result.error?.message ?? "Error al guardar.", "error");
            }

            saveBtn.disabled = false;
        });
    }

    _updateEmbedSnippet(container, token) {
        const pbUrl      = window.APP_CONFIG?.POCKETBASE_URL ?? "http://localhost:8090";
        const widgetBase = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
        const embedUrl   = `${widgetBase}widget.html?token=${encodeURIComponent(token)}&pb=${encodeURIComponent(pbUrl)}`;
        const snippet    = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.10);" title="Reservar mesa" loading="lazy"></iframe>`;

        const ta = container.querySelector("#sw-embed");
        if (ta) ta.value = snippet;

        const link = container.querySelector(".settings-preview-link");
        if (link) link.href = embedUrl;
    }

    _showStatus(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className   = `settings-save-status settings-save-status--${type}`;
        el.hidden      = false;
        setTimeout(() => { el.hidden = true; }, 3000);
    }
}
