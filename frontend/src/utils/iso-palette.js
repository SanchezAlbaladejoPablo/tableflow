/**
 * iso-palette.js — Phase 22 / TASK-135, Phase 23 / TASK-159, Phase 24 / TASK-171
 *
 * Paleta de colores para el motor isométrico 2.5D.
 * Estética Animal Crossing: colores pasteles cálidos, madera, terracota.
 *
 * API pública:
 *   PALETTE           — objeto mutable; todos los módulos importan el mismo ref
 *   setNightMode(bool)— muta PALETTE in-place (day/night)
 *   getStatusColor(s) — devuelve color del indicador de estado
 *   getTableClothColor(n) — devuelve color del mantel según número de mesa
 */

// ---------------------------------------------------------------------------
// Paleta DÍA — AC cálido (TASK-171)
// ---------------------------------------------------------------------------

const DAY = {
    // ---- Suelo (madera cálida con vetas) ----
    floor_tile:        "#E8C878",
    floor_tile_alt:    "#D8B060",
    floor_tile_border: "#B88838",
    floor_tile_grain:  "#CC9C3C",

    // ---- Mesas — 5 manteles AC pastel ----
    table_top_colors:  ["#F2B890", "#A8D8A8", "#C4A8E0", "#F5E490", "#A8CCE0"],
    table_wood:        "#8B5E3C",
    table_wood_left:   "#7A4A28",
    table_wood_right:  "#6B3A18",
    table_outline:     "rgba(30,15,5,0.60)",

    // ---- Sillas ----
    chair_seat:        "#9B6E4C",
    chair_seat_left:   "#7A4A28",
    chair_seat_right:  "#6B3A18",
    chair_cushion:     "#F5E6C8",
    chair_cushion_hi:  "#FFF5E0",
    chair_back:        "#8B5E3C",

    // Legacy (usados en drawChairs si hay código antiguo)
    chair_top:         "#9B6E4C",
    chair_left:        "#7A4A28",
    chair_right:       "#6B3A18",

    // ---- Plantas ----
    plant_pot:         "#C06030",
    plant_pot_left:    "#A04828",
    plant_pot_rim:     "#D87848",
    plant_green:       "#58B040",
    plant_green_dark:  "#2A5820",
    plant_green_1:     "#3A7828",
    plant_green_2:     "#58B040",
    plant_green_3:     "#86D050",

    // ---- Puerta ----
    door_frame:        "#7A4A28",
    door_panel:        "#A07050",
    door_arch:         "#5D3820",
    door_mat:          "#A86830",
    door_glass:        "#CCE8F8",
    door_handle:       "#FFD54F",
    door_plank:        "#8A5E38",

    // ---- Personaje ----
    char_head:         "#FDEBD0",
    char_body:         "#6E85B7",
    char_body_left:    "#5C6F9A",
    char_eye:          "#4A4A4A",
    char_nose:         "#C79A6A",

    // ---- Estados ----
    status: {
        available: "#4ADE80",
        reserved:  "#FCD34D",
        occupied:  "#F87171",
        pending:   "#93C5FD",
    },

    indicator_stroke:  "rgba(0,0,0,0.18)",

    // ---- Fondo día (TASK-178) ----
    wall_color:        "#FFF4E0",
    wall_baseboard:    "#DEC89A",
    window_frame:      "#B8905A",
    window_glass:      "#D8EEFF",
    window_light:      "rgba(255,240,180,0.30)",
};

// ---------------------------------------------------------------------------
// Paleta NOCHE — índigo oscuro + luz ámbar (TASK-159)
// ---------------------------------------------------------------------------

const NIGHT = {
    // ---- Suelo ----
    floor_tile:        "#1C2741",
    floor_tile_alt:    "#162035",
    floor_tile_border: "#0E1525",
    floor_tile_grain:  "#131D30",

    // ---- Mesas ----
    table_top_colors:  ["#2D4A3E", "#2A3B6B", "#4E2D4A", "#4A3D2D", "#2D4A6E"],
    table_wood:        "#2A1810",
    table_wood_left:   "#1E1008",
    table_wood_right:  "#180A05",
    table_outline:     "rgba(0,0,0,0.45)",

    // ---- Sillas ----
    chair_seat:        "#252020",
    chair_seat_left:   "#1A1518",
    chair_seat_right:  "#141012",
    chair_cushion:     "#2C2438",
    chair_cushion_hi:  "#38304A",
    chair_back:        "#1F1C1A",

    chair_top:         "#252020",
    chair_left:        "#1A1518",
    chair_right:       "#141012",

    // ---- Plantas ----
    plant_pot:        "#3D2B1F",
    plant_pot_left:   "#2D1F15",
    plant_pot_rim:    "#4D3828",
    plant_green:      "#1E4A1A",
    plant_green_dark: "#0A1E08",
    plant_green_1:    "#0E2A0A",
    plant_green_2:    "#1E4A1A",
    plant_green_3:    "#2A6020",

    // ---- Puerta ----
    door_frame:        "#1A0D05",
    door_panel:        "#251510",
    door_arch:         "#120908",
    door_mat:          "#2A1810",
    door_glass:        "#0A1828",
    door_handle:       "#B8902A",
    door_plank:        "#1A0E06",

    // ---- Personaje ----
    char_head:         "#FDEBD0",
    char_body:         "#2A3B6B",
    char_body_left:    "#1F2D52",
    char_eye:          "#2A2A2A",
    char_nose:         "#C79A6A",

    // ---- Estados ----
    status: {
        available: "#4ADE80",
        reserved:  "#FCD34D",
        occupied:  "#F87171",
        pending:   "#93C5FD",
    },

    indicator_stroke:  "rgba(0,0,0,0.40)",

    // ---- Fondo noche ----
    wall_color:        "#0A1020",
    wall_baseboard:    "#080C18",
    window_frame:      "#1A1010",
    window_glass:      "#050A18",
    window_light:      "rgba(60,80,160,0.15)",
};

// ---------------------------------------------------------------------------
// Paleta activa (singleton mutable)
// ---------------------------------------------------------------------------

/** @type {typeof DAY} */
export const PALETTE = { ...DAY };

/**
 * Cambia entre paleta día/noche.
 * Muta PALETTE in-place: todos los módulos que importaron {PALETTE} ven el cambio.
 * @param {boolean} night
 */
export function setNightMode(night) {
    const src = night ? NIGHT : DAY;
    Object.assign(PALETTE, src);
    Object.assign(PALETTE.status, src.status);
}

/**
 * Color del indicador de estado de una mesa.
 * @param {'available'|'reserved'|'occupied'|'pending'} status
 * @returns {string}
 */
export function getStatusColor(status) {
    return PALETTE.status[status] ?? PALETTE.status.available;
}

/**
 * Color del mantel de una mesa según su número.
 * @param {number} tableNumber
 * @returns {string}
 */
export function getTableClothColor(tableNumber) {
    const colors = PALETTE.table_top_colors;
    return colors[((tableNumber - 1) % colors.length + colors.length) % colors.length];
}
