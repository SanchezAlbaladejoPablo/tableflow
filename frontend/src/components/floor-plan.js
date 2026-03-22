/**
 * floor-plan.js
 *
 * Interactive SVG floor plan component.
 *
 * Responsibilities:
 *   - Render restaurant tables as SVG shapes
 *   - Color tables by availability status (green / yellow / red)
 *   - Dispatch DOM events on table click (no reservation logic here)
 *   - Optional drag-and-drop table repositioning
 *
 * This component is purely presentational.
 * It receives pre-computed data and emits events — it never calls the API.
 *
 * Events dispatched on the container element:
 *   "tableselect"  → CustomEvent { detail: { table, status } }
 *   "tablemove"    → CustomEvent { detail: { tableId, x, y } }  (drag-and-drop only)
 *
 * Usage:
 *   const fp = new FloorPlan(document.getElementById('floor-plan'));
 *   fp.render(tables, availability);
 *   fp.update(newAvailability);   // refresh colors only
 *   fp.destroy();
 */

/** @import { Table, TableAvailability, TableStatus } from '../types.js' */
import { computeTableStatus } from "../utils/table-assignment.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

/** SVG fill colors per status. Also defined in floor-plan.css for CSS consumers. */
const STATUS_COLOR = {
    available: "#22c55e",
    reserved:  "#eab308",
    occupied:  "#ef4444",
};

const STATUS_LABEL = {
    available: "Available",
    reserved:  "Reserved",
    occupied:  "Occupied",
};

// ---------------------------------------------------------------------------
// FloorPlan class
// ---------------------------------------------------------------------------

export class FloorPlan {
    /** @type {HTMLElement} */ #container;
    /** @type {SVGSVGElement} */ #svg;
    /** @type {SVGGElement} */ #tablesGroup;

    /** @type {Table[]} */            #tables       = [];
    /** @type {TableAvailability[]} */ #availability = [];

    /** @type {{ draggable: boolean, editMode: boolean }} */
    #options;

    /** Active drag state, or null when idle. */
    #drag = null;

    /**
     * @param {HTMLElement} containerEl - Element that will contain the SVG.
     * @param {Object}      [options]
     * @param {boolean}     [options.draggable=false] - Enable drag-and-drop repositioning.
     * @param {boolean}     [options.editMode=false]  - Show delete buttons, suppress tableselect.
     */
    constructor(containerEl, options = {}) {
        this.#container = containerEl;
        this.#options = { draggable: false, editMode: false, ...options };
        this.#svg = this.#buildSvg();
        this.#container.appendChild(this.#svg);
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Full render: draw all tables and apply availability colors.
     *
     * @param {Table[]}            tables
     * @param {TableAvailability[]} availability
     */
    render(tables, availability) {
        this.#tables       = tables;
        this.#availability = availability;
        this.#renderTables();
    }

    /**
     * Update table colors without re-creating SVG elements.
     * Call this when availability data refreshes.
     *
     * @param {TableAvailability[]} availability
     */
    update(availability) {
        this.#availability = availability;
        for (const table of this.#tables) {
            const status = computeTableStatus(table.id, this.#availability);
            const group  = this.#svg.querySelector(`[data-table-id="${table.id}"]`);
            if (!group) continue;
            this.#applyStatus(group, status);
        }
    }

    /**
     * Visually highlight a table (e.g. while a reservation form is open).
     *
     * @param {string|null} tableId - Pass null to clear highlight.
     */
    highlight(tableId) {
        for (const group of this.#tablesGroup.children) {
            group.classList.toggle(
                "floor-plan__table--highlighted",
                tableId !== null && group.dataset.tableId === tableId
            );
        }
    }

    /**
     * Remove the SVG from the DOM and clean up event listeners.
     */
    destroy() {
        this.#svg.remove();
    }

    // -------------------------------------------------------------------------
    // Private — SVG construction
    // -------------------------------------------------------------------------

    /** @returns {SVGSVGElement} */
    #buildSvg() {
        const svg = this.#el("svg");
        svg.setAttribute("class", "floor-plan");
        svg.setAttribute("viewBox", `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", "Restaurant floor plan");

        // Background
        const bg = this.#el("rect");
        bg.setAttribute("class", "floor-plan__background");
        bg.setAttribute("width",  CANVAS_WIDTH);
        bg.setAttribute("height", CANVAS_HEIGHT);
        svg.appendChild(bg);

        // Area separator line (indoor | outdoor)
        const divider = this.#el("line");
        divider.setAttribute("class", "floor-plan__divider");
        divider.setAttribute("x1", "560");
        divider.setAttribute("y1", "0");
        divider.setAttribute("x2", "560");
        divider.setAttribute("y2", CANVAS_HEIGHT);
        svg.appendChild(divider);

        // Area labels
        svg.appendChild(this.#areaLabel("Indoor",  280, 20));
        svg.appendChild(this.#areaLabel("Outdoor", 680, 20));

        // Tables container
        this.#tablesGroup = this.#el("g");
        this.#tablesGroup.setAttribute("class", "floor-plan__tables");
        svg.appendChild(this.#tablesGroup);

        // Legend
        svg.appendChild(this.#buildLegend());

        return svg;
    }

    /**
     * Create an area label text element.
     *
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @returns {SVGTextElement}
     */
    #areaLabel(text, x, y) {
        const t = this.#el("text");
        t.setAttribute("class", "floor-plan__area-label");
        t.setAttribute("x", x);
        t.setAttribute("y", y);
        t.setAttribute("text-anchor", "middle");
        t.textContent = text;
        return t;
    }

    /** @returns {SVGGElement} */
    #buildLegend() {
        const g = this.#el("g");
        g.setAttribute("class", "floor-plan__legend");
        g.setAttribute("transform", `translate(10, ${CANVAS_HEIGHT - 30})`);

        const entries = [
            { status: "available", label: "Available" },
            { status: "reserved",  label: "Reserved" },
            { status: "occupied",  label: "Occupied" },
        ];

        let offsetX = 0;
        for (const entry of entries) {
            const swatch = this.#el("rect");
            swatch.setAttribute("class", `floor-plan__legend-swatch floor-plan__legend-swatch--${entry.status}`);
            swatch.setAttribute("x", offsetX);
            swatch.setAttribute("y", 0);
            swatch.setAttribute("width",  14);
            swatch.setAttribute("height", 14);
            swatch.setAttribute("rx", 3);

            const label = this.#el("text");
            label.setAttribute("class", "floor-plan__legend-label");
            label.setAttribute("x", offsetX + 18);
            label.setAttribute("y", 11);
            label.textContent = entry.label;

            g.appendChild(swatch);
            g.appendChild(label);
            offsetX += 110;
        }

        return g;
    }

    // -------------------------------------------------------------------------
    // Private — table rendering
    // -------------------------------------------------------------------------

    #renderTables() {
        // Clear existing table elements
        while (this.#tablesGroup.firstChild) {
            this.#tablesGroup.removeChild(this.#tablesGroup.firstChild);
        }

        for (const table of this.#tables) {
            const status = computeTableStatus(table.id, this.#availability);
            const group  = this.#buildTableGroup(table, status);
            this.#tablesGroup.appendChild(group);
        }
    }

    /**
     * Build the SVG group for a single table.
     *
     * @param {Table}       table
     * @param {TableStatus} status
     * @returns {SVGGElement}
     */
    #buildTableGroup(table, status) {
        const group = this.#el("g");
        group.setAttribute("class", "floor-plan__table");
        group.setAttribute("data-table-id", table.id);
        group.setAttribute("data-status", status);
        group.setAttribute("tabindex", "0");
        group.setAttribute("role", "button");
        group.setAttribute(
            "aria-label",
            `Table ${table.number}, capacity ${table.capacity}, ${STATUS_LABEL[status]}`
        );

        // Shape
        const shape = table.shape === "circle"
            ? this.#buildCircle(table)
            : this.#buildRect(table);
        group.appendChild(shape);

        // Table number label
        const cx = table.pos_x + (table.shape === "circle" ? (table.width ?? 70) / 2 : (table.width ?? 80) / 2);
        const cy = table.pos_y + (table.shape === "circle" ? (table.height ?? 70) / 2 : (table.height ?? 60) / 2);

        group.appendChild(this.#tableLabel(String(table.number), cx, cy - 7, "floor-plan__table-number"));
        group.appendChild(this.#tableLabel(`${table.capacity}p`, cx, cy + 10, "floor-plan__table-capacity"));

        // Apply status color
        this.#applyStatus(group, status);

        // Click / keyboard handler — suppressed in edit mode
        if (!this.#options.editMode) {
            group.addEventListener("click", () => this.#onTableClick(table));
            group.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    this.#onTableClick(table);
                }
            });
        }

        // Delete badge in edit mode
        if (this.#options.editMode) {
            group.appendChild(this.#buildDeleteBadge(table, cx, cy));
            group.setAttribute("cursor", "default");
        }

        // Drag-and-drop (optional)
        if (this.#options.draggable) {
            this.#enableDrag(group, table);
        }

        return group;
    }

    /**
     * @param {Table} table
     * @returns {SVGRectElement}
     */
    #buildRect(table) {
        const rect = this.#el("rect");
        rect.setAttribute("class", "floor-plan__table-shape");
        rect.setAttribute("x",      table.pos_x);
        rect.setAttribute("y",      table.pos_y);
        rect.setAttribute("width",  table.width  ?? 80);
        rect.setAttribute("height", table.height ?? 60);
        rect.setAttribute("rx", table.shape === "square" ? 4 : 8);
        return rect;
    }

    /**
     * @param {Table} table
     * @returns {SVGCircleElement}
     */
    #buildCircle(table) {
        const r    = (table.width ?? 70) / 2;
        const circle = this.#el("circle");
        circle.setAttribute("class", "floor-plan__table-shape");
        circle.setAttribute("cx", table.pos_x + r);
        circle.setAttribute("cy", table.pos_y + r);
        circle.setAttribute("r",  r);
        return circle;
    }

    /**
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {string} cssClass
     * @returns {SVGTextElement}
     */
    #tableLabel(text, x, y, cssClass) {
        const t = this.#el("text");
        t.setAttribute("class", cssClass);
        t.setAttribute("x", x);
        t.setAttribute("y", y);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("pointer-events", "none");
        t.textContent = text;
        return t;
    }

    /**
     * Apply status-derived color to a table group and its shape.
     *
     * @param {SVGGElement}  group
     * @param {TableStatus}  status
     */
    #applyStatus(group, status) {
        group.dataset.status = status;

        // Update aria-label status portion
        const current = group.getAttribute("aria-label") ?? "";
        group.setAttribute(
            "aria-label",
            current.replace(/(Available|Reserved|Occupied)/, STATUS_LABEL[status])
        );

        // Apply fill to the shape element
        const shape = group.querySelector(".floor-plan__table-shape");
        if (shape) {
            shape.setAttribute("fill", STATUS_COLOR[status] ?? STATUS_COLOR.available);
        }
    }

    // -------------------------------------------------------------------------
    // Private — edit mode delete badge
    // -------------------------------------------------------------------------

    /**
     * Build a red ×-badge at the top-right corner of a table for delete action.
     *
     * @param {Table}  table
     * @param {number} cx - center x of the table
     * @param {number} cy - center y of the table
     * @returns {SVGGElement}
     */
    #buildDeleteBadge(table, cx, cy) {
        const w = table.width  ?? 80;
        const h = table.height ?? 60;
        const bx = cx + w / 2 - 10;
        const by = cy - h / 2 - 2;

        const badge = this.#el("g");
        badge.setAttribute("class", "floor-plan__delete-badge");
        badge.setAttribute("cursor", "pointer");

        const circle = this.#el("circle");
        circle.setAttribute("cx", bx);
        circle.setAttribute("cy", by);
        circle.setAttribute("r", "9");
        circle.setAttribute("fill", "#ef4444");

        const label = this.#el("text");
        label.setAttribute("x", bx);
        label.setAttribute("y", by + 4);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "#fff");
        label.setAttribute("font-size", "11");
        label.setAttribute("font-weight", "bold");
        label.setAttribute("pointer-events", "none");
        label.textContent = "×";

        badge.appendChild(circle);
        badge.appendChild(label);

        badge.addEventListener("click", (e) => {
            e.stopPropagation();
            this.#container.dispatchEvent(
                new CustomEvent("tabledelete", {
                    bubbles: true,
                    detail: { tableId: table.id, table },
                })
            );
        });

        return badge;
    }

    // -------------------------------------------------------------------------
    // Private — event handling
    // -------------------------------------------------------------------------

    /**
     * @param {Table} table
     */
    #onTableClick(table) {
        const status = computeTableStatus(table.id, this.#availability);
        this.#container.dispatchEvent(
            new CustomEvent("tableselect", {
                bubbles: true,
                detail: { table, status },
            })
        );
    }

    // -------------------------------------------------------------------------
    // Private — drag-and-drop
    // -------------------------------------------------------------------------

    /**
     * Attach pointer event listeners for drag-and-drop repositioning.
     *
     * @param {SVGGElement} group
     * @param {Table}       table
     */
    #enableDrag(group, table) {
        group.setAttribute("cursor", "grab");

        group.addEventListener("pointerdown", (e) => {
            // Ignore right-click / middle-click
            if (e.button !== 0) return;

            e.preventDefault();
            group.setPointerCapture(e.pointerId);
            group.setAttribute("cursor", "grabbing");

            const svgRect = this.#svg.getBoundingClientRect();
            const scaleX  = CANVAS_WIDTH  / svgRect.width;
            const scaleY  = CANVAS_HEIGHT / svgRect.height;

            // Offset from pointer to top-left corner of the table
            const startX  = (e.clientX - svgRect.left) * scaleX;
            const startY  = (e.clientY - svgRect.top)  * scaleY;
            const offsetX = startX - table.pos_x;
            const offsetY = startY - table.pos_y;

            this.#drag = { group, table, offsetX, offsetY, scaleX, scaleY, svgRect };
            group.classList.add("floor-plan__table--dragging");
        });

        group.addEventListener("pointermove", (e) => {
            if (!this.#drag || this.#drag.table.id !== table.id) return;
            e.preventDefault();

            const { offsetX, offsetY, scaleX, scaleY, svgRect } = this.#drag;
            const rawX = (e.clientX - svgRect.left) * scaleX - offsetX;
            const rawY = (e.clientY - svgRect.top)  * scaleY - offsetY;

            // Clamp to canvas bounds
            const w = table.width  ?? 80;
            const h = table.height ?? 60;
            const x = Math.max(0, Math.min(rawX, CANVAS_WIDTH  - w));
            const y = Math.max(0, Math.min(rawY, CANVAS_HEIGHT - h));

            this.#moveTableGroup(group, table, x, y);
        });

        group.addEventListener("pointerup", (e) => {
            if (!this.#drag || this.#drag.table.id !== table.id) return;

            group.releasePointerCapture(e.pointerId);
            group.setAttribute("cursor", "grab");
            group.classList.remove("floor-plan__table--dragging");

            // Read final position from the shape element
            const shape = group.querySelector(".floor-plan__table-shape");
            const finalX = parseFloat(shape?.getAttribute("x") ?? shape?.getAttribute("cx") ?? table.pos_x);
            const finalY = parseFloat(shape?.getAttribute("y") ?? shape?.getAttribute("cy") ?? table.pos_y);

            // Emit move event for the parent to persist via updateTablePosition()
            this.#container.dispatchEvent(
                new CustomEvent("tablemove", {
                    bubbles: true,
                    detail: { tableId: table.id, x: Math.round(finalX), y: Math.round(finalY) },
                })
            );

            // Update local copy so subsequent renders use the new position
            table.pos_x = Math.round(finalX);
            table.pos_y = Math.round(finalY);

            this.#drag = null;
        });

        group.addEventListener("pointercancel", () => {
            if (!this.#drag || this.#drag.table.id !== table.id) return;
            group.setAttribute("cursor", "grab");
            group.classList.remove("floor-plan__table--dragging");
            this.#drag = null;
        });
    }

    /**
     * Translate all positional attributes of a table group to new coordinates.
     *
     * @param {SVGGElement} group
     * @param {Table}       table
     * @param {number}      x
     * @param {number}      y
     */
    #moveTableGroup(group, table, x, y) {
        const shape = group.querySelector(".floor-plan__table-shape");
        if (!shape) return;

        if (table.shape === "circle") {
            const r = (table.width ?? 70) / 2;
            shape.setAttribute("cx", x + r);
            shape.setAttribute("cy", y + r);
        } else {
            shape.setAttribute("x", x);
            shape.setAttribute("y", y);
        }

        const w = table.width  ?? 80;
        const h = table.height ?? 60;
        const cx = x + w / 2;
        const cy = y + h / 2;

        const numLabel = group.querySelector(".floor-plan__table-number");
        const capLabel = group.querySelector(".floor-plan__table-capacity");
        if (numLabel) { numLabel.setAttribute("x", cx); numLabel.setAttribute("y", cy - 7); }
        if (capLabel) { capLabel.setAttribute("x", cx); capLabel.setAttribute("y", cy + 10); }
    }

    // -------------------------------------------------------------------------
    // Private — utility
    // -------------------------------------------------------------------------

    /**
     * Create an SVG element in the SVG namespace.
     *
     * @template {keyof SVGElementTagNameMap} K
     * @param {K} tagName
     * @returns {SVGElementTagNameMap[K]}
     */
    #el(tagName) {
        return document.createElementNS(SVG_NS, tagName);
    }
}
