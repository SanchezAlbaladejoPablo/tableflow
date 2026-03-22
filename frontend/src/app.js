/**
 * app.js
 *
 * Main application entry point for TableFlow.
 *
 * Responsibilities:
 *   - Initialise the API client
 *   - Load restaurant data
 *   - Set up tab navigation
 *   - Orchestrate the FloorPlan, ReservationList, ReservationForm, and CustomerForm components
 *   - Handle cross-component events (tableselect → open reservation form, etc.)
 *   - Show toast notifications
 *
 * This module owns application state and coordinates component interactions.
 * It does NOT render HTML directly — it delegates to components.
 */

import { initClient }           from "./services/api.js";
import { listTables, getFloorPlanStatus, createTable, deleteTable } from "./services/tables.js";
import { deleteReservation, getUpcomingTableReservations } from "./services/reservations.js";
import { deleteCustomer }       from "./services/customers.js";
import { FloorPlan }            from "./components/floor-plan.js";
import { ReservationForm }      from "./components/reservation-form.js";
import { ReservationList }      from "./components/reservation-list.js";
import { CustomerForm }         from "./components/customer-form.js";
import { escHtml }              from "./utils/html.js";
import { restoreSession, getCurrentUser, getCurrentRestaurantId, logout } from "./services/auth.js";
import { loadSettings as loadRestaurantSettings, getPrimaryColor } from "./services/settings.js";
import { LoginPage }            from "./pages/login.js";
import { RegisterPage }         from "./pages/register.js";
import { OnboardingWizard }     from "./pages/onboarding.js";
import { initRealtime, destroyRealtime, subscribe, onStatusChange } from "./services/realtime.js";
import { Analytics }      from "./components/analytics.js";
import { SettingsPanel }  from "./components/settings-panel.js";

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

/** @type {string} */
let restaurantId = window.APP_CONFIG?.RESTAURANT_ID ?? "";

/** Active tab identifier */
let activeTab = "floor-plan";

/** @type {FloorPlan|null} */
let floorPlan = null;

/** Floor plan edit mode state */
let fpEditMode = false;

/** Active area filter: "all" | "indoor" | "outdoor" | "bar" */
let fpActiveArea = "all";

/** @type {ReservationList} */
let reservationList;

/** @type {CustomerForm} */
let customerForm;

/** @type {Analytics|null} */
let analyticsComponent = null;

/** @type {SettingsPanel|null} */
let settingsPanel = null;

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Entry point — called on DOMContentLoaded.
 * Checks authentication first; shows login overlay if not authenticated.
 */
async function boot() {
    initClient(window.APP_CONFIG?.POCKETBASE_URL ?? "http://localhost:8090");

    // Listen for session expiry (401 from any API call)
    window.addEventListener("tf:sessionexpired", () => {
        showToast("Tu sesión ha caducado. Por favor inicia sesión de nuevo.", "error", 5000);
        showLoginOverlay();
    });

    if (restoreSession()) {
        const user = getCurrentUser();
        restaurantId = getCurrentRestaurantId() ?? restaurantId;
        _showUserInHeader(user);

        if (!restaurantId) {
            // Authenticated but no restaurant yet — show onboarding
            showOnboarding(user);
        } else {
            await loadRestaurantSettings(restaurantId);
            _applyBranding();
            await init();
        }
    } else {
        showLoginOverlay();
    }

    // SSE status indicator — TASK-062
    _setupSseIndicator();
}

function showLoginOverlay() {
    const overlay = document.getElementById("login-overlay");
    const app     = document.getElementById("app");
    if (!overlay) return;

    overlay.hidden = false;
    if (app) app.hidden = true;

    const loginPage = new LoginPage();
    loginPage.render(overlay);

    // Switch to register page
    overlay.addEventListener("showregister", () => {
        const regPage = new RegisterPage();
        regPage.render(overlay);
        overlay.addEventListener("registersuccess", async (e) => {
            const { user, restaurant } = e.detail;
            restaurantId = user.restaurant_id;
            _showUserInHeader(user);
            // New account — go straight to onboarding
            overlay.hidden = false;
            if (app) app.hidden = true;
            showOnboarding(user);
        }, { once: true });
        overlay.addEventListener("showlogin", () => {
            showLoginOverlay();
        }, { once: true });
    }, { once: true });

    overlay.addEventListener("loginsuccess", async () => {
        const user = getCurrentUser();
        restaurantId = getCurrentRestaurantId() ?? restaurantId;
        _showUserInHeader(user);

        if (!restaurantId) {
            showOnboarding(user);
            return;
        }

        overlay.hidden = true;
        if (app) app.hidden = false;
        await loadRestaurantSettings(restaurantId);
        _applyBranding();
        await init();
    }, { once: true });
}

function showOnboarding(user) {
    const overlay = document.getElementById("login-overlay");
    const app     = document.getElementById("app");

    if (!overlay) return;
    overlay.hidden = false;
    if (app) app.hidden = true;

    const wizard = new OnboardingWizard(user.restaurant_id ?? restaurantId);
    wizard.render(overlay);

    overlay.addEventListener("onboardingcomplete", async () => {
        overlay.hidden = true;
        if (app) app.hidden = false;
        await loadRestaurantSettings(restaurantId);
        _applyBranding();
        await init();
    }, { once: true });
}

function _applyBranding() {
    const color = getPrimaryColor();
    if (color) {
        document.documentElement.style.setProperty("--color-brand", color);
    }
}

function _showUserInHeader(user) {
    const nameEl   = document.getElementById("header-user-name");
    const logoutEl = document.getElementById("btn-logout");
    if (nameEl) {
        nameEl.textContent = user?.email ?? "";
        nameEl.hidden = false;
    }
    if (logoutEl) {
        logoutEl.hidden = false;
        logoutEl.addEventListener("click", () => {
            destroyRealtime();
            logout();
            location.reload();
        }, { once: true });
    }
}

async function init() {
    // Support passing restaurant_id via URL param for multi-tenant setups
    // (only if not already set from auth session)
    const params = new URLSearchParams(window.location.search);
    if (!restaurantId && params.has("restaurant")) restaurantId = params.get("restaurant");

    if (!restaurantId) {
        // For development, try to fetch the first restaurant automatically
        try {
            const { get } = await import("./services/api.js");
            const res = await get("/api/collections/restaurants/records", { perPage: 1 });
            if (res.success && res.data.items?.length) {
                restaurantId = res.data.items[0].id;
                document.getElementById("restaurant-name").textContent =
                    res.data.items[0].name;
            }
        } catch {
            // Fall through — user must configure RESTAURANT_ID
        }
    }

    if (!restaurantId) {
        showToast("No restaurant found. Check PocketBase is running and seed data is loaded.", "error");
        return;
    }

    // Instantiate component coordinators
    reservationList = new ReservationList(restaurantId);
    customerForm    = new CustomerForm(restaurantId);

    // Attach all listeners
    setupNavigation();
    setupFloorPlanTab();
    setupReservationsTab();
    setupCustomersTab();
    setupAnalyticsTab();
    setupSettingsTab();
    setupReservationModal();
    setupCustomerModal();
    setupTableModal();

    // Load initial floor plan
    await loadFloorPlan();
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------

function setupNavigation() {
    document.querySelectorAll(".app-nav__tab").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
}

/**
 * @param {string} tabId
 */
function switchTab(tabId) {
    if (tabId === activeTab) return;
    activeTab = tabId;

    // Toggle active button style
    document.querySelectorAll(".app-nav__tab").forEach((btn) => {
        btn.classList.toggle("app-nav__tab--active", btn.dataset.tab === tabId);
    });

    // Show/hide panels
    document.querySelectorAll(".tab-panel").forEach((panel) => {
        const isActive = panel.id === `tab-${tabId}`;
        panel.classList.toggle("tab-panel--active", isActive);
        panel.hidden = !isActive;
    });

    // Lazy-load tab content
    if (tabId === "reservations") loadReservations();
    if (tabId === "customers")    loadCustomers();
    if (tabId === "analytics")    loadAnalytics();
    if (tabId === "settings")     loadSettings();
}

// ---------------------------------------------------------------------------
// Floor plan tab
// ---------------------------------------------------------------------------

function setupFloorPlanTab() {
    document.getElementById("btn-new-reservation-fp")
        ?.addEventListener("click", () => openReservationModal({}));

    // Show edit toggle only for admin roles — TASK-055
    const user = getCurrentUser();
    if (user?.role === "restaurant_admin" || user?.role === "superadmin") {
        document.getElementById("btn-toggle-edit")?.removeAttribute("hidden");
    }

    // Enter edit mode
    document.getElementById("btn-toggle-edit")?.addEventListener("click", () => {
        fpEditMode = true;
        document.getElementById("fp-controls-view").hidden = true;
        document.getElementById("fp-controls-edit").hidden = false;
        _rebuildFloorPlan();
    });

    // Exit edit mode
    document.getElementById("btn-toggle-view")?.addEventListener("click", () => {
        fpEditMode = false;
        document.getElementById("fp-controls-view").hidden = false;
        document.getElementById("fp-controls-edit").hidden = true;
        _rebuildFloorPlan();
    });

    // Area tabs — TASK-059
    document.querySelectorAll(".fp-area-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".fp-area-tab").forEach(b => b.classList.remove("fp-area-tab--active"));
            btn.classList.add("fp-area-tab--active");
            fpActiveArea = btn.dataset.area;
            _rebuildFloorPlan();
        });
    });

    // Add table in edit mode — TASK-057
    document.getElementById("btn-fp-add-table")?.addEventListener("click", async () => {
        const number   = Number(document.getElementById("fp-t-number")?.value);
        const capacity = Number(document.getElementById("fp-t-capacity")?.value ?? 4);
        const area     = document.getElementById("fp-t-area")?.value ?? "indoor";
        const shape    = document.getElementById("fp-t-shape")?.value ?? "rect";

        if (!number || number < 1) {
            showToast("Introduce el número de mesa.", "error");
            return;
        }

        const result = await createTable({
            restaurant_id: restaurantId,
            number,
            capacity,
            area,
            shape,
            pos_x:     80 + ((number - 1) % 4) * 120,
            pos_y:     80 + Math.floor((number - 1) / 4) * 100,
            is_active: true,
        });

        if (!result.success) {
            showToast(result.error?.message ?? "Error al crear la mesa.", "error");
            return;
        }
        showToast(`Mesa ${number} creada.`, "success");
        document.getElementById("fp-t-number").value = number + 1;
        _rebuildFloorPlan();
    });
}

async function loadFloorPlan() {
    const container = document.getElementById("floor-plan-container");
    if (!container) return;

    await _rebuildFloorPlan();

    // SSE — subscribe to reservations and tables for live updates (TASK-060, TASK-061)
    initRealtime(window.APP_CONFIG?.POCKETBASE_URL ?? "http://localhost:8090");

    subscribe("reservations", () => {
        if (!fpEditMode) refreshFloorPlan();
        if (activeTab === "reservations") loadReservations();
    });

    subscribe("tables", () => {
        _rebuildFloorPlan();
    });

    // Handle table click → show table detail modal (fires only in view mode)
    container.addEventListener("tableselect", (e) => {
        if (!fpEditMode) openTableModal(e.detail.table);
    });

    // Handle drag-and-drop position save — TASK-056
    container.addEventListener("tablemove", async (e) => {
        const { tableId, x, y } = e.detail;
        const { updateTablePosition } = await import("./services/tables.js");
        const result = await updateTablePosition(tableId, x, y);
        if (!result.success) showToast("Error al guardar posición.", "error");
    });

    // Handle delete in edit mode — TASK-058
    container.addEventListener("tabledelete", async (e) => {
        const { tableId, table } = e.detail;
        if (!confirm(`¿Eliminar mesa ${table.number}? Esta acción no se puede deshacer.`)) return;
        const result = await deleteTable(tableId);
        if (result.success) {
            showToast(`Mesa ${table.number} eliminada.`, "success");
            _rebuildFloorPlan();
        } else {
            showToast(result.error?.message ?? "Error al eliminar la mesa.", "error");
        }
    });
}

/**
 * Rebuild the floor plan from scratch applying current area filter and edit mode.
 * Called on mode toggle, area tab change, or after table add/delete.
 */
async function _rebuildFloorPlan() {
    const container = document.getElementById("floor-plan-container");
    if (!container) return;

    const options = fpActiveArea !== "all" ? { activeOnly: true, area: fpActiveArea } : { activeOnly: true };
    const tablesResult = await listTables(restaurantId, options);
    if (!tablesResult.success) {
        showToast("Error al cargar las mesas.", "error");
        return;
    }
    const tables = tablesResult.data.items ?? [];

    floorPlan?.destroy();
    floorPlan = new FloorPlan(container, {
        draggable: fpEditMode,
        editMode:  fpEditMode,
    });
    floorPlan.render(tables, []);

    if (!fpEditMode) refreshFloorPlan();
}

async function refreshFloorPlan() {
    const result = await getFloorPlanStatus(restaurantId);

    if (!result.success) {
        showToast("Error al cargar el estado del floor plan.", "error");
        return;
    }

    floorPlan?.update(result.data);
}


// ---------------------------------------------------------------------------
// Reservations tab
// ---------------------------------------------------------------------------

function setupReservationsTab() {
    document.getElementById("btn-new-reservation")
        ?.addEventListener("click", () => openReservationModal({}));

    // Auto-filter on change
    document.getElementById("filter-date")?.addEventListener("change", loadReservations);
    document.getElementById("filter-status")?.addEventListener("change", loadReservations);

    // Quick filter buttons
    document.querySelectorAll(".quick-filter").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".quick-filter").forEach((b) => b.classList.remove("quick-filter--active"));
            btn.classList.add("quick-filter--active");

            const dateInput = document.getElementById("filter-date");
            if (!dateInput) return;
            const today = new Date();
            const fmt = (d) => d.toISOString().slice(0, 10);
            if (btn.dataset.quick === "today") {
                dateInput.value = fmt(today);
            } else if (btn.dataset.quick === "tomorrow") {
                const tom = new Date(today); tom.setDate(today.getDate() + 1);
                dateInput.value = fmt(tom);
            } else {
                dateInput.value = "";
            }
            loadReservations();
        });
    });

    // Listen for edit/delete events bubbling from the list component
    document.getElementById("reservations-list-container")?.addEventListener("reservationedit", (e) => {
        openReservationModal({ reservation: e.detail.reservation });
    });

    document.getElementById("reservations-list-container")?.addEventListener("reservationdelete", async (e) => {
        if (!confirm("Delete this reservation permanently?")) return;
        const result = await deleteReservation(e.detail.reservationId);
        if (result.success) {
            showToast("Reservation deleted.", "success");
            loadReservations();
        } else {
            showToast(result.error?.message ?? "Failed to delete.", "error");
        }
    });
}

function loadReservations() {
    const container = document.getElementById("reservations-list-container");
    if (!container) return;

    // Default to today if no date is set
    const dateInput = document.getElementById("filter-date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    reservationList.render(container, {
        date:   dateInput?.value || undefined,
        status: document.getElementById("filter-status")?.value || undefined,
    });
}

// ---------------------------------------------------------------------------
// Analytics tab — Phase 16
// ---------------------------------------------------------------------------

function setupAnalyticsTab() {
    // Nothing to set up at init time — loadAnalytics is called lazily on tab switch.
}

function loadAnalytics() {
    const container = document.getElementById("analytics-container");
    if (!container) return;

    // Destroy previous instance (e.g. if restaurant changed)
    analyticsComponent?.destroy();
    analyticsComponent = new Analytics(restaurantId);
    analyticsComponent.render(container);
}

// ---------------------------------------------------------------------------
// Settings tab — Phase 17 (admin only)
// ---------------------------------------------------------------------------

function setupSettingsTab() {
    // Show the tab only for admin roles
    const user = getCurrentUser();
    if (user?.role === "restaurant_admin" || user?.role === "superadmin") {
        document.querySelector(".app-nav__tab--admin")?.removeAttribute("hidden");
    }
}

function loadSettings() {
    const container = document.getElementById("settings-container");
    if (!container) return;

    settingsPanel = new SettingsPanel(restaurantId);
    settingsPanel.render(container);
}

// ---------------------------------------------------------------------------
// Customers tab
// ---------------------------------------------------------------------------

function setupCustomersTab() {
    document.getElementById("btn-new-customer")
        ?.addEventListener("click", () => openCustomerModal({}));

    let searchTimer;
    document.getElementById("customer-search")?.addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadCustomers(e.target.value), 300);
    });

    document.getElementById("customers-list-container")?.addEventListener("customeredit", (e) => {
        openCustomerModal({ customer: e.detail.customer });
    });

    document.getElementById("customers-list-container")?.addEventListener("customerdelete", async (e) => {
        if (!confirm("Delete this customer?")) return;
        const result = await deleteCustomer(e.detail.customerId);
        if (result.success) {
            showToast("Customer deleted.", "success");
            loadCustomers();
        } else {
            showToast(result.error?.message ?? "Failed to delete.", "error");
        }
    });
}

function loadCustomers(search = "") {
    const container = document.getElementById("customers-list-container");
    if (!container) return;
    customerForm.renderList(container, search);
}

// ---------------------------------------------------------------------------
// Table detail modal
// ---------------------------------------------------------------------------

/** @type {import('./types.js').Table|null} */
let currentTable = null;

function setupTableModal() {
    document.getElementById("table-modal-close")
        ?.addEventListener("click", closeTableModal);
    document.getElementById("table-modal-cancel")
        ?.addEventListener("click", closeTableModal);
    document.getElementById("table-modal-backdrop")
        ?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("table-modal-backdrop")) closeTableModal();
        });
    document.getElementById("table-modal-new-reservation")
        ?.addEventListener("click", () => {
            closeTableModal();
            openReservationModal({ tableId: currentTable?.id });
        });
}

/**
 * @param {import('./types.js').Table} table
 */
async function openTableModal(table) {
    currentTable = table;

    const backdrop = document.getElementById("table-modal-backdrop");
    const body     = document.getElementById("table-modal-body");
    const title    = document.getElementById("table-modal-title");
    const subtitle = document.getElementById("table-modal-subtitle");

    if (!backdrop || !body) return;

    const areaLabel = { indoor: "Interior", outdoor: "Terraza", bar: "Barra" };
    title.textContent    = `Mesa ${table.number}`;
    subtitle.textContent = `${table.capacity} personas · ${areaLabel[table.area] ?? table.area ?? ""}`;

    body.innerHTML = `<div class="flex items-center gap-2 text-muted text-sm"><div class="spinner"></div> Cargando reservas…</div>`;
    backdrop.classList.remove("hidden");

    const result = await getUpcomingTableReservations(table.id);

    if (!result.success) {
        body.innerHTML = `<p class="text-sm text-muted">Error al cargar reservas.</p>`;
        return;
    }

    const reservations = result.data.items ?? [];

    if (reservations.length === 0) {
        body.innerHTML = `<p class="table-detail-empty">No hay reservas</p>`;
        return;
    }

    const STATUS_LABEL = {
        pending:   "Pendiente",
        confirmed: "Confirmada",
        seated:    "Sentado",
        completed: "Completada",
        cancelled: "Cancelada",
        no_show:   "No show",
    };

    body.innerHTML = reservations.map((r) => {
        const d   = new Date(r.reserved_at.replace(" ", "T"));
        const day = d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
        const t   = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
        return `
        <div class="table-detail-row">
            <div class="table-detail-row__time">
                <span class="table-detail-row__day">${escHtml(day)}</span>
                <span class="table-detail-row__hour">${t}</span>
            </div>
            <div class="table-detail-row__info">
                <span class="table-detail-row__name">${escHtml(r.guest_name)}</span>
                <span class="table-detail-row__pax">${r.party_size} pax</span>
            </div>
            <span class="badge badge--${r.status.replace("_", "-")}">${STATUS_LABEL[r.status] ?? r.status}</span>
        </div>`;
    }).join("");
}

function closeTableModal() {
    document.getElementById("table-modal-backdrop")?.classList.add("hidden");
    currentTable = null;
}

// ---------------------------------------------------------------------------
// Reservation modal
// ---------------------------------------------------------------------------

let reservationFormComponent = null;

function setupReservationModal() {
    document.getElementById("reservation-modal-close")
        ?.addEventListener("click", closeReservationModal);

    document.getElementById("reservation-modal-cancel")
        ?.addEventListener("click", closeReservationModal);

    document.getElementById("reservation-modal-save")
        ?.addEventListener("click", saveReservation);

    // Dismiss on backdrop click
    document.getElementById("reservation-modal-backdrop")
        ?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("reservation-modal-backdrop")) {
                closeReservationModal();
            }
        });

    // Listen for successful save events
    document.getElementById("reservation-modal-body")
        ?.addEventListener("reservationsaved", () => {
            closeReservationModal();
            showToast("Reservation saved!", "success");
            // Refresh whichever view is active
            if (activeTab === "reservations") loadReservations();
            if (activeTab === "floor-plan")   refreshFloorPlan();
        });
}

/**
 * @param {Object} defaults
 */
async function openReservationModal(defaults) {
    const backdrop = document.getElementById("reservation-modal-backdrop");
    const body     = document.getElementById("reservation-modal-body");
    const title    = document.getElementById("reservation-modal-title");

    if (!backdrop || !body) return;

    title.textContent = defaults.reservation ? "Edit Reservation" : "New Reservation";
    body.innerHTML = `<div class="flex items-center gap-2 text-muted text-sm"><div class="spinner"></div> Loading…</div>`;
    backdrop.classList.remove("hidden");

    reservationFormComponent = new ReservationForm(restaurantId);
    await reservationFormComponent.open(body, defaults);

    // Trap focus in the modal
    body.querySelector("input, select, textarea")?.focus();
}

function closeReservationModal() {
    document.getElementById("reservation-modal-backdrop")?.classList.add("hidden");
    reservationFormComponent = null;
}

async function saveReservation() {
    if (!reservationFormComponent) return;
    const btn = document.getElementById("reservation-modal-save");
    if (btn) btn.disabled = true;

    const body = document.getElementById("reservation-modal-body");
    const success = await reservationFormComponent.save(body);

    if (!success && btn) btn.disabled = false;
}

// ---------------------------------------------------------------------------
// Customer modal
// ---------------------------------------------------------------------------

let customerFormComponent = null;

function setupCustomerModal() {
    document.getElementById("customer-modal-close")
        ?.addEventListener("click", closeCustomerModal);

    document.getElementById("customer-modal-cancel")
        ?.addEventListener("click", closeCustomerModal);

    document.getElementById("customer-modal-save")
        ?.addEventListener("click", saveCustomer);

    document.getElementById("customer-modal-backdrop")
        ?.addEventListener("click", (e) => {
            if (e.target === document.getElementById("customer-modal-backdrop")) {
                closeCustomerModal();
            }
        });

    document.getElementById("customer-modal-body")
        ?.addEventListener("customersaved", () => {
            closeCustomerModal();
            showToast("Customer saved!", "success");
            if (activeTab === "customers") loadCustomers();
        });
}

function openCustomerModal(defaults) {
    const backdrop = document.getElementById("customer-modal-backdrop");
    const body     = document.getElementById("customer-modal-body");
    const title    = document.getElementById("customer-modal-title");

    if (!backdrop || !body) return;

    title.textContent = defaults.customer ? "Edit Customer" : "New Customer";
    customerFormComponent = new CustomerForm(restaurantId);
    customerFormComponent.open(body, defaults);
    backdrop.classList.remove("hidden");
    body.querySelector("input")?.focus();
}

function closeCustomerModal() {
    document.getElementById("customer-modal-backdrop")?.classList.add("hidden");
    customerFormComponent = null;
}

async function saveCustomer() {
    if (!customerFormComponent) return;
    const btn = document.getElementById("customer-modal-save");
    if (btn) btn.disabled = true;

    const body = document.getElementById("customer-modal-body");
    const success = await customerFormComponent.save(body);

    if (!success && btn) btn.disabled = false;
}

// ---------------------------------------------------------------------------
// SSE connection indicator — TASK-062
// ---------------------------------------------------------------------------

/**
 * Update the SSE dot in the header based on connection status.
 */
function _setupSseIndicator() {
    const dot = document.getElementById("sse-indicator");
    if (!dot) return;

    onStatusChange((connected) => {
        dot.classList.toggle("sse-indicator--connected",    connected);
        dot.classList.toggle("sse-indicator--disconnected", !connected);
        dot.title = connected ? "Tiempo real: conectado" : "Tiempo real: reconectando…";
    });
}

// ---------------------------------------------------------------------------
// Global utilities
// ---------------------------------------------------------------------------

/**
 * Show a transient toast notification.
 *
 * @param {string} message
 * @param {'success'|'error'|'info'} [type]
 * @param {number} [duration] - ms before auto-dismiss (default 3500)
 */
function showToast(message, type = "info", duration = 3500) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show/hide the global loading spinner.
 *
 * @param {boolean} loading
 */
function setGlobalLoading(loading) {
    document.getElementById("global-spinner")?.classList.toggle("hidden", !loading);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", boot);
