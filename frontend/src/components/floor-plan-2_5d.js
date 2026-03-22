/**
 * floor-plan-2_5d.js — Phase 22
 *
 * Motor isométrico 2.5D para el floorplan de TableFlow.
 * Drop-in replacement de FloorPlan — misma interfaz pública.
 *
 * Tecnología: Canvas 2D API. Sin librerías externas.
 *
 * Interfaz pública (idéntica a FloorPlan):
 *   constructor(containerEl, options)
 *   render(tables, availability)
 *   update(availability)
 *   highlight(tableId)
 *   destroy()
 *
 * Eventos despachados en el contenedor (idénticos a FloorPlan):
 *   "tableselect"  → CustomEvent { detail: { table, status } }
 *   "tablemove"    → CustomEvent { detail: { tableId, x, y } }
 *   "tabledelete"  → CustomEvent { detail: { tableId, table } }
 *
 * Sub-fases implementadas:
 *   A — Motor Canvas, coordenadas iso, loop dirty-flag   (TASK-122–127)
 *   B — Sprites: mesas, sillas, plantas, puerta, suelo   (TASK-128–134)
 *   C — Estados visuales, animaciones, pulso seated      (TASK-136–139)
 *   D — Interactividad: click, hover, tooltip, drag      (TASK-140–143)
 *   E — Personajes Tom Nook                              (TASK-144–149)
 *   F — Performance: dirty-flag, sprite cache, fallback  (TASK-150–152)
 */

/** @import { Table, TableAvailability, TableStatus } from '../types.js' */

import { computeTableStatus }       from "../utils/table-assignment.js";
import { getStatusColor }           from "../utils/iso-palette.js";
import {
    drawFloorTile,
    drawTableRect,
    drawTableRound,
    drawChairs,
    drawPlant,
    drawDoor,
    drawStatusIndicator,
    drawCharacter,
    drawTableLabel,
} from "../utils/iso-sprites.js";
import { CharacterManager }         from "../utils/characters.js";

// ---------------------------------------------------------------------------
// Constantes del motor
// ---------------------------------------------------------------------------

/** Resolución virtual del canvas (se escala con CSS). */
const VIRT_W = 960;
const VIRT_H = 520;

/** Factor de escala: world units → isometric screen pixels.
 *  World space: 0-800 x, 0-500 y (herencia del SVG viewBox). */
const ISO_SCALE = 0.45;

/** Offset para centrar el world space en la canvas virtual. */
const OFFSET_X = VIRT_W * 0.48;
const OFFSET_Y = 55;

/** Tamaño del tile de suelo en world units. */
const FLOOR_TILE = 80;

/** Posición world de la puerta (esquina inferior-izquierda del plano). */
const DOOR_WORLD = { x: 0, y: 250 };

/** Posiciones world de decoraciones (plantas). */
const DECORATION_POSITIONS = [
    { x: 20,  y: 20  },
    { x: 760, y: 20  },
    { x: 20,  y: 460 },
    { x: 760, y: 460 },
    { x: 400, y: 480 },
];

// ---------------------------------------------------------------------------
// Utilidades de color
// ---------------------------------------------------------------------------

function darken(hex, amount = 30) {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (n >> 16) - amount);
    const g = Math.max(0, ((n >> 8) & 0xff) - amount);
    const b = Math.max(0, (n & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
}

function lerpColor(a, b, t) {
    const ah = parseInt(a.replace("#",""), 16);
    const bh = parseInt(b.replace("#",""), 16);
    const r = Math.round(((ah >> 16) & 0xff) * (1-t) + ((bh >> 16) & 0xff) * t);
    const g = Math.round(((ah >>  8) & 0xff) * (1-t) + ((bh >>  8) & 0xff) * t);
    const bl= Math.round(( ah        & 0xff) * (1-t) + ( bh        & 0xff) * t);
    return `rgb(${r},${g},${bl})`;
}

// ---------------------------------------------------------------------------
// FloorPlan2_5D
// ---------------------------------------------------------------------------

export class FloorPlan2_5D {

    // ---- private fields ----
    /** @type {HTMLElement} */      #container;
    /** @type {HTMLCanvasElement} */#canvas;
    /** @type {CanvasRenderingContext2D} */ #ctx;
    /** @type {HTMLDivElement} */   #tooltip;

    /** @type {Table[]} */              #tables       = [];
    /** @type {TableAvailability[]} */ #availability = [];

    /** @type {{ draggable: boolean, editMode: boolean }} */
    #options;

    // Estado de hover/highlight
    #hoveredTableId   = null;
    #highlightTableId = null;

    // Estado de drag
    #drag = null;

    // Dirty flag — solo redibujar cuando hay cambios
    #dirty = true;

    // Animaciones de transición de estado (TASK-137)
    // Map<tableId, { from: string, to: string, t: number }>
    #colorTransitions = new Map();

    // Efecto pulso para mesas "occupied" (TASK-139)
    #pulseFrame = 0;

    // Sistema de personajes (Sub-fase E)
    #characters = new CharacterManager();

    // Loop de animación
    #rafId     = null;
    #lastFrame = 0;

    /**
     * @param {HTMLElement} containerEl
     * @param {Object}      [options]
     * @param {boolean}     [options.draggable=false]
     * @param {boolean}     [options.editMode=false]
     */
    constructor(containerEl, options = {}) {
        this.#container = containerEl;
        this.#options   = { draggable: false, editMode: false, ...options };

        this.#canvas = this.#buildCanvas();
        this.#ctx    = this.#canvas.getContext("2d");
        this.#tooltip = this.#buildTooltip();

        this.#container.style.position = "relative";
        this.#container.appendChild(this.#canvas);
        this.#container.appendChild(this.#tooltip);

        this.#attachEvents();
        this.#startLoop();
    }

    // -------------------------------------------------------------------------
    // Public API — idéntica a FloorPlan
    // -------------------------------------------------------------------------

    /**
     * Render completo: dibuja todas las mesas con sus estados.
     *
     * @param {Table[]}            tables
     * @param {TableAvailability[]} availability
     */
    render(tables, availability) {
        this.#tables       = [...tables].sort((a, b) =>
            (a.pos_x + a.pos_y) - (b.pos_x + b.pos_y)
        );
        this.#availability = availability;
        this.#dirty        = true;
    }

    /**
     * Actualiza los colores sin re-crear el canvas.
     *
     * @param {TableAvailability[]} availability
     */
    update(availability) {
        // Detectar cambios de estado → iniciar transición de color (TASK-137)
        for (const table of this.#tables) {
            const oldStatus = computeTableStatus(table.id, this.#availability);
            const newStatus = computeTableStatus(table.id, availability);

            if (oldStatus !== newStatus) {
                this.#colorTransitions.set(table.id, {
                    from: getStatusColor(oldStatus),
                    to:   getStatusColor(newStatus),
                    t:    0,
                });

                // Gestión de personajes (TASK-148)
                const doorPos  = this.#worldToScreen(DOOR_WORLD.x, DOOR_WORLD.y);
                const tablePos = this.#worldToScreen(table.pos_x, table.pos_y);

                if (newStatus === "reserved" && !this.#characters.has(table.id)) {
                    this.#characters.spawn(table.id, doorPos, tablePos);
                }
                if (newStatus === "available") {
                    this.#characters.remove(table.id);
                }
            }
        }

        this.#availability = availability;
        this.#dirty        = true;
    }

    /**
     * Resaltar una mesa (ej. mientras el formulario de reserva está abierto).
     *
     * @param {string|null} tableId
     */
    highlight(tableId) {
        this.#highlightTableId = tableId;
        this.#dirty = true;
    }

    /**
     * Eliminar el canvas y limpiar event listeners.
     */
    destroy() {
        if (this.#rafId) cancelAnimationFrame(this.#rafId);
        this.#canvas.remove();
        this.#tooltip.remove();
        this.#characters.clear();
    }

    // -------------------------------------------------------------------------
    // Coordenadas isométricas (TASK-124)
    // -------------------------------------------------------------------------

    /**
     * World → screen isométrico.
     * @param {number} wx
     * @param {number} wy
     * @returns {{ sx: number, sy: number }}
     */
    #worldToScreen(wx, wy) {
        const ix = wx * ISO_SCALE;
        const iy = wy * ISO_SCALE;
        return {
            sx: (ix - iy) + OFFSET_X,
            sy: (ix + iy) * 0.5 + OFFSET_Y,
        };
    }

    /**
     * Screen → world (inverso).
     * @param {number} sx
     * @param {number} sy
     * @returns {{ wx: number, wy: number }}
     */
    #screenToWorld(sx, sy) {
        const dx = sx - OFFSET_X;
        const dy = sy - OFFSET_Y;
        return {
            wx: (dy + dx * 0.5) / ISO_SCALE,
            wy: (dy - dx * 0.5) / ISO_SCALE,
        };
    }

    /**
     * Escala un punto de pantalla CSS a coordenadas virtuales del canvas.
     * @param {number} cx - clientX
     * @param {number} cy - clientY
     * @returns {{ vx: number, vy: number }}
     */
    #clientToVirtual(cx, cy) {
        const rect  = this.#canvas.getBoundingClientRect();
        const scaleX = VIRT_W / rect.width;
        const scaleY = VIRT_H / rect.height;
        return {
            vx: (cx - rect.left) * scaleX,
            vy: (cy - rect.top)  * scaleY,
        };
    }

    // -------------------------------------------------------------------------
    // Hit test (TASK-140)
    // -------------------------------------------------------------------------

    /**
     * Detecta qué mesa (si alguna) está bajo las coordenadas virtuales (vx, vy).
     * Usa AABB isométrico sobre la posición en pantalla de cada mesa.
     *
     * @param {number} vx
     * @param {number} vy
     * @returns {Table|null}
     */
    #hitTest(vx, vy) {
        // Iterar en orden inverso (las más al frente primero)
        for (let i = this.#tables.length - 1; i >= 0; i--) {
            const table = this.#tables[i];
            const { sx, sy } = this.#worldToScreen(table.pos_x, table.pos_y);
            const hw = table.shape === "circle" ? 30 : 36;
            const hh = table.shape === "circle" ? 15 : 18;

            // Punto en el rombo isométrico
            if (this.#pointInIsoRhombus(vx, vy, sx, sy, hw, hh + 12)) {
                return table;
            }
        }
        return null;
    }

    /**
     * Test de punto en rombo isométrico (AABB aproximado).
     */
    #pointInIsoRhombus(px, py, cx, cy, hw, hh) {
        const dx = Math.abs(px - cx) / hw;
        const dy = Math.abs(py - cy) / hh;
        return dx + dy <= 1.2;
    }

    // -------------------------------------------------------------------------
    // Loop de animación (TASK-125, TASK-150)
    // -------------------------------------------------------------------------

    #startLoop() {
        const loop = (timestamp) => {
            this.#rafId = requestAnimationFrame(loop);

            const deltaMs = this.#lastFrame ? timestamp - this.#lastFrame : 16;
            this.#lastFrame = timestamp;

            // Actualizar personajes (TASK-149)
            this.#characters.update(deltaMs);

            // Avanzar transiciones de color (TASK-137)
            let hasAnimations = false;
            for (const [id, tr] of this.#colorTransitions) {
                tr.t = Math.min(1, tr.t + deltaMs / 400);
                if (tr.t >= 1) this.#colorTransitions.delete(id);
                else hasAnimations = true;
            }

            // Pulso (TASK-139)
            this.#pulseFrame += deltaMs / 16;

            // Solo dibujar si hay algo que cambió
            const hasChars = this.#characters.getAll().length > 0;
            if (this.#dirty || hasAnimations || hasChars) {
                this.#draw();
                if (!hasAnimations && !hasChars) this.#dirty = false;
            }
        };
        this.#rafId = requestAnimationFrame(loop);
    }

    // -------------------------------------------------------------------------
    // Render principal (TASK-126 — sistema de capas)
    // -------------------------------------------------------------------------

    #draw() {
        const ctx = this.#ctx;
        ctx.clearRect(0, 0, VIRT_W, VIRT_H);

        // Capa 1: suelo
        this.#drawFloor(ctx);

        // Capa 2: decoraciones traseras (plantas, puerta)
        this.#drawDecorations(ctx);

        // Capa 3: mesas y sillas (ordenadas por profundidad: mayor wx+wy = más al frente)
        this.#drawTables(ctx);

        // Capa 4: personajes
        this.#drawCharacters(ctx);

        // Capa 5: indicadores de estado
        this.#drawIndicators(ctx);
    }

    // -------------------------------------------------------------------------
    // Capa 1 — Suelo (TASK-134)
    // -------------------------------------------------------------------------

    #drawFloor(ctx) {
        const hw = FLOOR_TILE * ISO_SCALE;
        const hh = hw * 0.5;

        for (let gx = 0; gx <= 800; gx += FLOOR_TILE) {
            for (let gy = 0; gy <= 500; gy += FLOOR_TILE) {
                const { sx, sy } = this.#worldToScreen(gx + FLOOR_TILE / 2, gy + FLOOR_TILE / 2);
                const alt = ((gx / FLOOR_TILE) + (gy / FLOOR_TILE)) % 2 === 1;
                drawFloorTile(ctx, sx, sy, hw, hh, alt);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Capa 2 — Decoraciones (TASK-132, TASK-133)
    // -------------------------------------------------------------------------

    #drawDecorations(ctx) {
        // Puerta
        const door = this.#worldToScreen(DOOR_WORLD.x, DOOR_WORLD.y);
        drawDoor(ctx, door.sx, door.sy);

        // Plantas
        for (const pos of DECORATION_POSITIONS) {
            const { sx, sy } = this.#worldToScreen(pos.x, pos.y);
            drawPlant(ctx, sx, sy);
        }
    }

    // -------------------------------------------------------------------------
    // Capa 3 — Mesas y sillas (TASK-129–131)
    // -------------------------------------------------------------------------

    #drawTables(ctx) {
        for (const table of this.#tables) {
            const { sx, sy } = this.#worldToScreen(table.pos_x, table.pos_y);
            const isHovered    = table.id === this.#hoveredTableId;
            const isHighlighted = table.id === this.#highlightTableId;

            ctx.save();

            // Hover lift — desplazar ligeramente hacia arriba (TASK-138)
            const liftY = isHovered ? -6 : 0;
            ctx.translate(sx, sy + liftY);

            // Brillo en hover/highlight
            if (isHovered || isHighlighted) {
                ctx.shadowColor  = "rgba(255,255,255,0.6)";
                ctx.shadowBlur   = 12;
            }

            // Sillas primero (quedan debajo de la mesa)
            drawChairs(ctx, 0, 0, table.capacity);

            // Mesa
            if (table.shape === "circle") {
                drawTableRound(ctx, 0, 0, table.number);
            } else {
                drawTableRect(ctx, 0, 0, table.number);
            }

            // Etiqueta con número y capacidad
            drawTableLabel(ctx, 0, -4, table.number, table.capacity);

            // Botón de eliminar en modo edición
            if (this.#options.editMode) {
                this.#drawDeleteBadge(ctx, table, 36, -18);
            }

            ctx.restore();
        }
    }

    #drawDeleteBadge(ctx, table, bx, by) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.font = "bold 12px system-ui";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("×", bx, by + 1);
        ctx.restore();
    }

    // -------------------------------------------------------------------------
    // Capa 4 — Personajes (TASK-146, TASK-147, TASK-149)
    // -------------------------------------------------------------------------

    #drawCharacters(ctx) {
        for (const char of this.#characters.getAll()) {
            drawCharacter(ctx, char.x, char.y, char.state, char.animFrame);
        }
    }

    // -------------------------------------------------------------------------
    // Capa 5 — Indicadores de estado (TASK-136, TASK-137, TASK-139)
    // -------------------------------------------------------------------------

    #drawIndicators(ctx) {
        for (const table of this.#tables) {
            const status = computeTableStatus(table.id, this.#availability);
            const { sx, sy } = this.#worldToScreen(table.pos_x, table.pos_y);
            const liftY = table.id === this.#hoveredTableId ? -6 : 0;

            // Color con transición interpolada (TASK-137)
            let color = getStatusColor(status);
            const tr = this.#colorTransitions.get(table.id);
            if (tr) color = lerpColor(tr.from, tr.to, tr.t);

            // Pulso en mesas ocupadas (TASK-139)
            const pulse = status === "occupied"
                ? 1 + Math.sin(this.#pulseFrame * 0.05) * 0.2
                : 1.0;

            drawStatusIndicator(ctx, sx, sy - 34 + liftY, color, pulse);
        }
    }

    // -------------------------------------------------------------------------
    // Canvas y tooltip (TASK-123, TASK-142)
    // -------------------------------------------------------------------------

    /** @returns {HTMLCanvasElement} */
    #buildCanvas() {
        const canvas = document.createElement("canvas");
        canvas.width  = VIRT_W;
        canvas.height = VIRT_H;
        canvas.style.cssText = "width:100%;height:auto;display:block;border-radius:12px;cursor:default;";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Plano isométrico del restaurante");
        return canvas;
    }

    /** @returns {HTMLDivElement} */
    #buildTooltip() {
        const div = document.createElement("div");
        div.className   = "fp25d-tooltip";
        div.hidden      = true;
        div.style.cssText = `
            position:absolute;pointer-events:none;background:rgba(15,23,42,0.85);
            color:#fff;font-size:12px;padding:5px 10px;border-radius:6px;
            white-space:nowrap;z-index:10;transform:translate(-50%,-100%);
            backdrop-filter:blur(4px);`;
        return div;
    }

    // -------------------------------------------------------------------------
    // Eventos (Sub-fase D)
    // -------------------------------------------------------------------------

    #attachEvents() {
        this.#canvas.addEventListener("pointermove",  (e) => this.#onPointerMove(e));
        this.#canvas.addEventListener("pointerleave", ()  => this.#onPointerLeave());
        this.#canvas.addEventListener("click",        (e) => this.#onClick(e));

        if (this.#options.draggable || this.#options.editMode) {
            this.#canvas.addEventListener("pointerdown",   (e) => this.#onPointerDown(e));
            this.#canvas.addEventListener("pointermove",   (e) => this.#onDragMove(e));
            this.#canvas.addEventListener("pointerup",     (e) => this.#onPointerUp(e));
            this.#canvas.addEventListener("pointercancel", ()  => this.#drag = null);
        }
    }

    // TASK-141 — Hover
    #onPointerMove(e) {
        const { vx, vy } = this.#clientToVirtual(e.clientX, e.clientY);
        const table = this.#hitTest(vx, vy);
        const newId = table?.id ?? null;

        if (newId !== this.#hoveredTableId) {
            this.#hoveredTableId = newId;
            this.#canvas.style.cursor = newId ? "pointer" : "default";
            this.#dirty = true;
        }

        // Tooltip (TASK-142)
        if (table) {
            const status = computeTableStatus(table.id, this.#availability);
            const STATUS_ES = { available: "Libre", reserved: "Reservada", occupied: "Ocupada" };
            this.#tooltip.textContent = `Mesa ${table.number} · ${table.capacity}p · ${STATUS_ES[status] ?? status}`;
            const rect = this.#canvas.getBoundingClientRect();
            this.#tooltip.style.left = `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`;
            this.#tooltip.style.top  = `${e.clientY - rect.top - 8}px`;
            this.#tooltip.hidden = false;
        } else {
            this.#tooltip.hidden = true;
        }
    }

    #onPointerLeave() {
        this.#hoveredTableId = null;
        this.#tooltip.hidden = true;
        this.#canvas.style.cursor = "default";
        this.#dirty = true;
    }

    // TASK-140 — Click
    #onClick(e) {
        if (this.#drag?.moved) return; // ignorar si fue un drag
        const { vx, vy } = this.#clientToVirtual(e.clientX, e.clientY);
        const table = this.#hitTest(vx, vy);
        if (!table) return;

        if (this.#options.editMode) {
            // Comprobar si el click fue en el badge de eliminar
            const { sx, sy } = this.#worldToScreen(table.pos_x, table.pos_y);
            const bxScreen = sx + 36 * (this.#canvas.getBoundingClientRect().width / VIRT_W);
            const byScreen = sy - 18 * (this.#canvas.getBoundingClientRect().height / VIRT_H);
            const rect = this.#canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
            const dx = cx - bxScreen * rect.width / VIRT_W,
                  dy = cy - byScreen * rect.height / VIRT_H;

            // Aproximación: si está cerca del badge (radio ~12px CSS)
            if (Math.sqrt(dx*dx + dy*dy) < 15) {
                this.#container.dispatchEvent(new CustomEvent("tabledelete", {
                    bubbles: true,
                    detail: { tableId: table.id, table },
                }));
                return;
            }
            return; // en edit mode, clicks normales no abren modal
        }

        const status = computeTableStatus(table.id, this.#availability);
        this.#container.dispatchEvent(new CustomEvent("tableselect", {
            bubbles: true,
            detail: { table, status },
        }));
    }

    // TASK-143 — Drag-and-drop
    #onPointerDown(e) {
        if (e.button !== 0) return;
        const { vx, vy } = this.#clientToVirtual(e.clientX, e.clientY);
        const table = this.#hitTest(vx, vy);
        if (!table || !this.#options.draggable) return;

        e.preventDefault();
        this.#canvas.setPointerCapture(e.pointerId);
        this.#drag = { table, startVx: vx, startVy: vy, origX: table.pos_x, origY: table.pos_y, moved: false };
        this.#canvas.style.cursor = "grabbing";
    }

    #onDragMove(e) {
        if (!this.#drag) return;
        const { vx, vy } = this.#clientToVirtual(e.clientX, e.clientY);
        const dvx = vx - this.#drag.startVx;
        const dvy = vy - this.#drag.startVy;

        if (Math.abs(dvx) > 3 || Math.abs(dvy) > 3) {
            this.#drag.moved = true;
        }

        if (!this.#drag.moved) return;

        // Convertir el delta de pantalla a delta de mundo
        const startWorld = this.#screenToWorld(this.#drag.startVx, this.#drag.startVy);
        const currWorld  = this.#screenToWorld(vx, vy);

        const newWx = Math.max(0, Math.min(760, this.#drag.origX + (currWorld.wx - startWorld.wx)));
        const newWy = Math.max(0, Math.min(460, this.#drag.origY + (currWorld.wy - startWorld.wy)));

        this.#drag.table.pos_x = Math.round(newWx);
        this.#drag.table.pos_y = Math.round(newWy);

        // Re-ordenar tablas por profundidad
        this.#tables.sort((a, b) => (a.pos_x + a.pos_y) - (b.pos_x + b.pos_y));
        this.#dirty = true;
    }

    #onPointerUp(e) {
        if (!this.#drag) return;
        this.#canvas.releasePointerCapture(e.pointerId);
        this.#canvas.style.cursor = this.#hoveredTableId ? "pointer" : "default";

        if (this.#drag.moved) {
            const { table } = this.#drag;
            this.#container.dispatchEvent(new CustomEvent("tablemove", {
                bubbles: true,
                detail: { tableId: table.id, x: table.pos_x, y: table.pos_y },
            }));
        }

        this.#drag = null;
    }
}
