/**
 * iso-sprites.js — Phase 22 / TASK-128 a TASK-134
 *
 * Funciones de dibujo para todos los sprites isométricos.
 * Todo se dibuja con Canvas 2D API — sin imágenes externas.
 *
 * Sistema de coordenadas: (cx, cy) es el centro del tile superior (top face).
 *
 * Primitiva base: drawIsoBox(ctx, cx, cy, hw, hh, depth, topColor, leftColor, rightColor)
 *   hw = half-width  (mitad del ancho en pantalla)
 *   hh = half-height (mitad del alto en pantalla, ≈ hw/2 para iso 2:1)
 *   depth = altura vertical de las caras laterales
 */

import { PALETTE, getTableClothColor } from "./iso-palette.js";

// ---------------------------------------------------------------------------
// Primitiva base: caja isométrica
// ---------------------------------------------------------------------------

/**
 * Dibuja una caja isométrica (cara superior + cara izquierda + cara derecha).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - centro X de la cara superior
 * @param {number} cy - centro Y de la cara superior
 * @param {number} hw - half-width de la cara superior
 * @param {number} hh - half-height de la cara superior (hw/2 para iso 2:1)
 * @param {number} depth - altura de las caras laterales
 * @param {string} topColor
 * @param {string} leftColor
 * @param {string} rightColor
 */
export function drawIsoBox(ctx, cx, cy, hw, hh, depth, topColor, leftColor, rightColor) {
    // Cara superior (rombo)
    ctx.beginPath();
    ctx.moveTo(cx,      cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();

    // Cara izquierda
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx,      cy + hh + depth);
    ctx.lineTo(cx - hw, cy        + depth);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();

    // Cara derecha
    ctx.beginPath();
    ctx.moveTo(cx,      cy + hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw, cy        + depth);
    ctx.lineTo(cx,      cy + hh + depth);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
}

// ---------------------------------------------------------------------------
// TASK-134 — Suelo: baldosa isométrica
// ---------------------------------------------------------------------------

/**
 * Dibuja una baldosa isométrica de suelo.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} hw
 * @param {number} hh
 * @param {boolean} [alt] - color alternado para efecto ajedrez
 */
export function drawFloorTile(ctx, cx, cy, hw, hh, alt = false) {
    ctx.beginPath();
    ctx.moveTo(cx,      cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle = alt ? PALETTE.floor_tile_alt : PALETTE.floor_tile;
    ctx.fill();
    ctx.strokeStyle = PALETTE.floor_tile_border;
    ctx.lineWidth = 0.5;
    ctx.stroke();
}

// ---------------------------------------------------------------------------
// TASK-129 — Mesa rectangular
// ---------------------------------------------------------------------------

/**
 * Dibuja una mesa rectangular isométrica.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx   - posición en pantalla (centro del top)
 * @param {number} cy
 * @param {number} tableNumber - para el color del mantel
 */
export function drawTableRect(ctx, cx, cy, tableNumber) {
    const hw = 36, hh = 18, depth = 10;
    const cloth = getTableClothColor(tableNumber);

    drawIsoBox(ctx, cx, cy, hw, hh, depth, cloth, PALETTE.table_wood_left, PALETTE.table_wood_right);

    // Borde del mantel (línea fina)
    ctx.beginPath();
    ctx.moveTo(cx,      cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ---------------------------------------------------------------------------
// TASK-130 — Mesa redonda
// ---------------------------------------------------------------------------

/**
 * Dibuja una mesa redonda isométrica (elipse + cilindro lateral).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} tableNumber
 */
export function drawTableRound(ctx, cx, cy, tableNumber) {
    const rx = 30, ry = 15, depth = 10;
    const cloth = getTableClothColor(tableNumber);

    // Cara lateral (semicírculo inferior para dar volumen)
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth, rx, ry, 0, 0, Math.PI);
    ctx.fillStyle = PALETTE.table_wood_right;
    ctx.fill();

    // Cara superior (elipse)
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = cloth;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ---------------------------------------------------------------------------
// TASK-131 — Silla
// ---------------------------------------------------------------------------

const CHAIR_OFFSETS = {
    2: [{ dx: 0, dy: -28 }, { dx: 0, dy: 22 }],
    4: [
        { dx: 0,   dy: -28 }, { dx: 0,  dy: 22 },
        { dx: -38, dy: -4  }, { dx: 38, dy: -4 },
    ],
    6: [
        { dx: 0,   dy: -30 }, { dx: 0,   dy: 24 },
        { dx: -40, dy: -12 }, { dx: 40,  dy: -12 },
        { dx: -22, dy: -28 }, { dx: 22,  dy: -28 },
    ],
};

/**
 * Dibuja las sillas de una mesa según su capacidad.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} capacity
 */
export function drawChairs(ctx, cx, cy, capacity) {
    const offsets = CHAIR_OFFSETS[Math.min(capacity, 6)] ?? CHAIR_OFFSETS[4];
    const hw = 10, hh = 5, depth = 6;

    for (const off of offsets) {
        drawIsoBox(ctx, cx + off.dx, cy + off.dy, hw, hh, depth,
            PALETTE.chair_top, PALETTE.chair_left, PALETTE.chair_right);
    }
}

// ---------------------------------------------------------------------------
// TASK-132 — Planta decorativa
// ---------------------------------------------------------------------------

/**
 * Dibuja una maceta con planta isométrica.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 */
export function drawPlant(ctx, cx, cy) {
    // Maceta
    drawIsoBox(ctx, cx, cy + 4, 10, 5, 8, PALETTE.plant_pot, PALETTE.plant_pot_left, PALETTE.plant_pot);

    // Esfera de hojas
    const gradient = ctx.createRadialGradient(cx - 3, cy - 12, 1, cx, cy - 10, 14);
    gradient.addColorStop(0, PALETTE.plant_green);
    gradient.addColorStop(1, PALETTE.plant_green_dark);
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 13, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
}

// ---------------------------------------------------------------------------
// TASK-133 — Puerta de entrada
// ---------------------------------------------------------------------------

/**
 * Dibuja la puerta de entrada del restaurante.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 */
export function drawDoor(ctx, cx, cy) {
    const hw = 22, hh = 11, depth = 40;

    // Marco de la puerta (caja alta)
    drawIsoBox(ctx, cx, cy, hw, hh, depth, PALETTE.door_panel, PALETTE.door_frame, PALETTE.door_arch);

    // Arco superior (semicírculo decorativo)
    ctx.beginPath();
    ctx.ellipse(cx, cy - hh + 2, hw * 0.6, hh * 0.8, 0, Math.PI, 0);
    ctx.fillStyle = PALETTE.door_frame;
    ctx.fill();

    // Pomo de la puerta
    ctx.beginPath();
    ctx.arc(cx + 10, cy + 10, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD54F";
    ctx.fill();
}

// ---------------------------------------------------------------------------
// Indicador de estado (Sub-fase C / TASK-136, TASK-139)
// ---------------------------------------------------------------------------

/**
 * Dibuja el indicador de estado (rombo flotante sobre la mesa).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {string} color
 * @param {number} pulse - factor de escala de pulso (1.0 = normal)
 */
export function drawStatusIndicator(ctx, cx, cy, color, pulse = 1.0) {
    const r = 7 * pulse;
    ctx.save();
    ctx.translate(cx, cy);

    // Sombra suave
    ctx.beginPath();
    ctx.ellipse(0, r + 2, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fill();

    // Rombo
    ctx.beginPath();
    ctx.moveTo(0,  -r);
    ctx.lineTo(r,   0);
    ctx.lineTo(0,   r);
    ctx.lineTo(-r,  0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = PALETTE.indicator_stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}

// ---------------------------------------------------------------------------
// Personaje — Tom Nook (Sub-fase E / TASK-145)
// ---------------------------------------------------------------------------

/**
 * Dibuja el personaje "Tom Nook" (figura isométrica estilizada).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {'walking'|'seated'} state
 * @param {number} animFrame - contador de frame para animación de caminar (0–60)
 */
export function drawCharacter(ctx, cx, cy, state, animFrame) {
    ctx.save();
    ctx.translate(cx, cy);

    const bobY = state === 'walking' ? Math.sin(animFrame * 0.3) * 2 : 0;
    const scale = state === 'seated' ? 0.75 : 1.0;
    ctx.scale(scale, scale);
    ctx.translate(0, bobY);

    // Cuerpo (caja iso pequeña)
    drawIsoBox(ctx, 0, 0, 10, 5, 14, PALETTE.char_body, PALETTE.char_body_left, PALETTE.char_body_left);

    // Cabeza (círculo)
    const gradient = ctx.createRadialGradient(-2, -20, 1, 0, -18, 9);
    gradient.addColorStop(0, "#FFF3E0");
    gradient.addColorStop(1, PALETTE.char_head);
    ctx.beginPath();
    ctx.arc(0, -18, 8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Ojos
    ctx.fillStyle = PALETTE.char_eye;
    ctx.beginPath(); ctx.arc(-3, -19, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,  -19, 1.5, 0, Math.PI * 2); ctx.fill();

    // Nariz
    ctx.fillStyle = PALETTE.char_nose;
    ctx.beginPath(); ctx.arc(0, -16, 1.5, 0, Math.PI * 2); ctx.fill();

    // Orejas pequeñas (mapache)
    ctx.fillStyle = PALETTE.char_head;
    ctx.beginPath(); ctx.arc(-7, -24, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 7, -24, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E57373";
    ctx.beginPath(); ctx.arc(-7, -24, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 7, -24, 2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

// ---------------------------------------------------------------------------
// Etiqueta de mesa
// ---------------------------------------------------------------------------

/**
 * Dibuja el número y capacidad de la mesa.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number|string} number
 * @param {number} capacity
 */
export function drawTableLabel(ctx, cx, cy, number, capacity) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Número de mesa
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillText(String(number), cx, cy - 4);

    // Capacidad
    ctx.font = "9px system-ui, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillText(`${capacity}p`, cx, cy + 7);

    ctx.restore();
}
