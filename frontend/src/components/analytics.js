/**
 * analytics.js — Phase 16
 *
 * Panel de analíticas: ocupación, no-shows, horas pico, retención y exportación CSV.
 * Usa Chart.js (cargado dinámicamente desde CDN) para los gráficos.
 */

import { get }        from "../services/api.js";
import { listTables } from "../services/tables.js";

const CHART_JS_CDN = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";

const DIAS   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES  = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export class Analytics {
    /**
     * @param {string} restaurantId
     */
    constructor(restaurantId) {
        this._restaurantId = restaurantId;
        /** @type {import('chart.js').Chart[]} */
        this._charts = [];
    }

    /**
     * Render analytics into the given container element.
     * @param {HTMLElement} container
     */
    async render(container) {
        container.innerHTML = `<div class="analytics-loading"><div class="spinner"></div> Cargando analíticas…</div>`;

        const [resResult, tablesResult] = await Promise.all([
            this._fetchReservations(),
            listTables(this._restaurantId, { activeOnly: true }),
        ]);

        if (!resResult.success) {
            container.innerHTML = `<p class="analytics-error">Error al cargar los datos de analíticas.</p>`;
            return;
        }

        const reservations   = resResult.data?.items ?? [];
        const tables         = tablesResult.success ? (tablesResult.data?.items ?? []) : [];
        const totalCapacity  = tables.reduce((sum, t) => sum + (t.capacity ?? 0), 0);

        container.innerHTML = this._buildHTML(reservations.length);

        await this._loadChartJs();

        this._renderOccupancyChart(container, reservations, totalCapacity);
        this._renderNoShowChart(container, reservations);
        this._renderPeakHoursHeatmap(container, reservations);
        this._renderRetentionChart(container, reservations);

        container.querySelector("#btn-export-csv")
            ?.addEventListener("click", () => this._downloadCSV(reservations));
    }

    /** Destroy Chart.js instances to free memory when switching tabs. */
    destroy() {
        this._charts.forEach(c => c.destroy());
        this._charts = [];
    }

    // -------------------------------------------------------------------------
    // Data fetching
    // -------------------------------------------------------------------------

    _fetchReservations() {
        const from = new Date();
        from.setDate(from.getDate() - 180);
        const fromStr = from.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, ".000Z");

        return get("/api/collections/reservations/records", {
            filter:  `restaurant_id = "${this._restaurantId}" && reserved_at >= "${fromStr}"`,
            sort:    "+reserved_at",
            perPage: 500,
        });
    }

    // -------------------------------------------------------------------------
    // HTML skeleton
    // -------------------------------------------------------------------------

    _buildHTML(total) {
        return `
        <div class="analytics-container">
            <div class="analytics-header">
                <div class="analytics-summary">
                    <span class="analytics-summary__label">Reservas en los últimos 6 meses</span>
                    <strong class="analytics-summary__value">${total}</strong>
                </div>
                <button class="btn btn--ghost btn--sm" id="btn-export-csv" type="button">
                    ⬇ Exportar CSV
                </button>
            </div>

            <div class="analytics-grid">

                <div class="analytics-card analytics-card--wide">
                    <h3 class="analytics-card__title">Reservas por día — últimos 30 días</h3>
                    <div class="analytics-chart-wrap">
                        <canvas id="chart-occupancy"></canvas>
                    </div>
                </div>

                <div class="analytics-card">
                    <h3 class="analytics-card__title">Tasa de no-shows</h3>
                    <div class="analytics-chart-wrap analytics-chart-wrap--sm">
                        <canvas id="chart-noshow"></canvas>
                    </div>
                    <div id="noshow-stats" class="analytics-stats"></div>
                </div>

                <div class="analytics-card analytics-card--wide">
                    <h3 class="analytics-card__title">Horas pico (últimos 6 meses)</h3>
                    <div id="heatmap-container"></div>
                </div>

                <div class="analytics-card">
                    <h3 class="analytics-card__title">Clientes nuevos vs recurrentes</h3>
                    <div class="analytics-chart-wrap">
                        <canvas id="chart-retention"></canvas>
                    </div>
                </div>

            </div>
        </div>`;
    }

    // -------------------------------------------------------------------------
    // Chart.js — lazy CDN load
    // -------------------------------------------------------------------------

    _loadChartJs() {
        if (window.Chart) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const s   = document.createElement("script");
            s.src     = CHART_JS_CDN;
            s.onload  = resolve;
            s.onerror = () => reject(new Error("No se pudo cargar Chart.js"));
            document.head.appendChild(s);
        });
    }

    _register(chart) {
        this._charts.push(chart);
        return chart;
    }

    // -------------------------------------------------------------------------
    // TASK-065 — Ocupación diaria (últimos 30 días)
    // -------------------------------------------------------------------------

    _renderOccupancyChart(container, reservations, _totalCapacity) {
        const canvas = container.querySelector("#chart-occupancy");
        if (!canvas) return;

        const labels = [];
        const data   = [];
        const today  = new Date();

        for (let i = 29; i >= 0; i--) {
            const d   = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            labels.push(`${d.getDate()} ${MESES[d.getMonth()]}`);
            data.push(
                reservations.filter(r =>
                    r.reserved_at?.slice(0, 10) === key &&
                    r.status !== "cancelled" &&
                    r.status !== "no_show"
                ).length
            );
        }

        this._register(new window.Chart(canvas, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Reservas",
                    data,
                    backgroundColor: "rgba(59,130,246,0.6)",
                    borderColor:     "rgba(59,130,246,1)",
                    borderWidth: 1,
                    borderRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: "#f1f5f9" },
                    },
                    x: {
                        ticks: { maxTicksLimit: 10, font: { size: 11 } },
                        grid: { display: false },
                    },
                },
            },
        }));
    }

    // -------------------------------------------------------------------------
    // TASK-066 — Tasa de no-shows
    // -------------------------------------------------------------------------

    _renderNoShowChart(container, reservations) {
        const canvas = container.querySelector("#chart-noshow");
        const stats  = container.querySelector("#noshow-stats");
        if (!canvas) return;

        const total     = reservations.length;
        const noShows   = reservations.filter(r => r.status === "no_show").length;
        const completed = reservations.filter(r => r.status === "completed" || r.status === "seated").length;
        const other     = total - noShows - completed;
        const pct       = total > 0 ? ((noShows / total) * 100).toFixed(1) : "0.0";

        if (stats) {
            stats.innerHTML = `
                <div class="analytics-stat">
                    <span class="analytics-stat__value">${pct}%</span>
                    <span class="analytics-stat__label">tasa de no-show</span>
                </div>
                <div class="analytics-stat">
                    <span class="analytics-stat__value">${noShows}</span>
                    <span class="analytics-stat__label">no-shows de ${total} reservas</span>
                </div>`;
        }

        this._register(new window.Chart(canvas, {
            type: "doughnut",
            data: {
                labels: ["Completadas", "No-show", "Otras"],
                datasets: [{
                    data: [completed, noShows, other],
                    backgroundColor: ["#22c55e", "#ef4444", "#94a3b8"],
                    borderWidth: 2,
                    borderColor: "#fff",
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: "65%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { font: { size: 12 }, padding: 12 },
                    },
                },
            },
        }));
    }

    // -------------------------------------------------------------------------
    // TASK-067 — Horas pico (heatmap HTML, sin librerías extra)
    // -------------------------------------------------------------------------

    _renderPeakHoursHeatmap(container, reservations) {
        const el = container.querySelector("#heatmap-container");
        if (!el) return;

        // 7 días × 24 horas
        const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));
        let maxVal = 0;

        for (const r of reservations) {
            if (!r.reserved_at) continue;
            const d    = new Date(r.reserved_at.replace(" ", "T"));
            const day  = d.getDay();
            const hour = d.getHours();
            matrix[day][hour]++;
            if (matrix[day][hour] > maxVal) maxVal = matrix[day][hour];
        }

        const H_START = 8;
        const H_END   = 23;
        const cols    = H_END - H_START + 2; // +1 day label +1 per hour

        let html = `<div class="heatmap"><div class="heatmap__grid" style="--hm-cols:${cols}">`;

        // Hour headers
        html += `<div class="heatmap__cell heatmap__cell--label"></div>`;
        for (let h = H_START; h <= H_END; h++) {
            html += `<div class="heatmap__cell heatmap__cell--label">${h}h</div>`;
        }

        // Rows
        for (let d = 0; d < 7; d++) {
            html += `<div class="heatmap__cell heatmap__cell--label">${DIAS[d]}</div>`;
            for (let h = H_START; h <= H_END; h++) {
                const val       = matrix[d][h];
                const intensity = maxVal > 0 ? val / maxVal : 0;
                const alpha     = (0.08 + intensity * 0.87).toFixed(2);
                const label     = `${DIAS[d]} ${h}:00 — ${val} reserva${val !== 1 ? "s" : ""}`;
                html += `<div class="heatmap__cell heatmap__cell--data"
                              style="background:rgba(59,130,246,${alpha})"
                              title="${label}"
                              aria-label="${label}">${val > 0 ? val : ""}</div>`;
            }
        }

        html += `</div></div>`;
        el.innerHTML = html;
    }

    // -------------------------------------------------------------------------
    // TASK-068 — Clientes nuevos vs recurrentes por mes
    // -------------------------------------------------------------------------

    _renderRetentionChart(container, reservations) {
        const canvas = container.querySelector("#chart-retention");
        if (!canvas) return;

        // Find first month each customer appears
        const firstMonth = {};
        const sorted = [...reservations].sort((a, b) =>
            (a.reserved_at ?? "").localeCompare(b.reserved_at ?? "")
        );
        for (const r of sorted) {
            if (!r.customer_id || !r.reserved_at) continue;
            if (!firstMonth[r.customer_id]) {
                firstMonth[r.customer_id] = r.reserved_at.slice(0, 7);
            }
        }

        const labels       = [];
        const newCounts    = [];
        const returnCounts = [];
        const now          = new Date();

        for (let i = 5; i >= 0; i--) {
            const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            labels.push(`${MESES[d.getMonth()]} ${d.getFullYear()}`);

            const monthCustomers = new Set(
                reservations
                    .filter(r => r.customer_id && r.reserved_at?.startsWith(key))
                    .map(r => r.customer_id)
            );

            let newC = 0, retC = 0;
            for (const cid of monthCustomers) {
                firstMonth[cid] === key ? newC++ : retC++;
            }
            newCounts.push(newC);
            returnCounts.push(retC);
        }

        this._register(new window.Chart(canvas, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Nuevos",
                        data: newCounts,
                        backgroundColor: "rgba(34,197,94,0.7)",
                        borderColor:     "rgba(34,197,94,1)",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: "Recurrentes",
                        data: returnCounts,
                        backgroundColor: "rgba(139,92,246,0.7)",
                        borderColor:     "rgba(139,92,246,1)",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { font: { size: 12 }, padding: 12 },
                    },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "#f1f5f9" } },
                    x: { grid: { display: false } },
                },
            },
        }));
    }

    // -------------------------------------------------------------------------
    // TASK-069 — Exportación CSV
    // -------------------------------------------------------------------------

    _downloadCSV(reservations) {
        const headers = ["ID", "Fecha", "Nombre invitado", "Pax", "ID Mesa", "Estado", "Notas"];
        const rows = reservations.map(r => [
            r.id                                              ?? "",
            (r.reserved_at ?? "").slice(0, 16).replace(" ", "T"),
            this._escapeCsv(r.guest_name),
            r.party_size                                      ?? "",
            r.table_id                                        ?? "",
            r.status                                          ?? "",
            this._escapeCsv(r.notes),
        ]);

        const csv  = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), {
            href:     url,
            download: `reservas_${new Date().toISOString().slice(0, 10)}.csv`,
        });
        a.click();
        URL.revokeObjectURL(url);
    }

    _escapeCsv(val) {
        if (!val) return "";
        const s = String(val);
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    }
}
