/**
 * iso-palette.js — Phase 22 / TASK-135
 *
 * Paleta de colores para el motor isométrico 2.5D.
 * Estilo cálido tipo "Animal Crossing / videojuego de restaurante".
 */

export const PALETTE = {
    // Suelo
    floor_tile:        "#F5E6C8",
    floor_tile_alt:    "#EDD9A3",
    floor_tile_border: "#D9C48A",

    // Mesas — madera
    table_top_colors:  ["#C8E6C9", "#BBDEFB", "#FCE4EC", "#FFF9C4", "#E1BEE7"],
    table_wood:        "#8D6E63",
    table_wood_left:   "#795548",
    table_wood_right:  "#6D4C41",

    // Sillas
    chair_top:   "#BCAAA4",
    chair_left:  "#A1887F",
    chair_right: "#8D6E63",

    // Plantas
    plant_pot:        "#A1887F",
    plant_pot_left:   "#8D6E63",
    plant_green:      "#81C784",
    plant_green_dark: "#66BB6A",

    // Puerta
    door_frame:  "#6D4C41",
    door_panel:  "#A1887F",
    door_arch:   "#5D4037",

    // Personaje (Tom Nook)
    char_head:      "#FDEBD0",
    char_body:      "#6E85B7",
    char_body_left: "#5C6F9A",
    char_eye:       "#4A4A4A",
    char_nose:      "#C79A6A",

    // Indicadores de estado
    status: {
        available: "#4ADE80",
        reserved:  "#FCD34D",
        occupied:  "#F87171",
        pending:   "#93C5FD",
    },

    // Indicador borde
    indicator_stroke: "rgba(0,0,0,0.15)",
};

/**
 * Devuelve el color HEX del indicador de estado de una mesa.
 *
 * @param {'available'|'reserved'|'occupied'|'pending'} status
 * @returns {string}
 */
export function getStatusColor(status) {
    return PALETTE.status[status] ?? PALETTE.status.available;
}

/**
 * Devuelve el color del mantel/tapa de una mesa según su número.
 *
 * @param {number} tableNumber
 * @returns {string}
 */
export function getTableClothColor(tableNumber) {
    return PALETTE.table_top_colors[tableNumber % PALETTE.table_top_colors.length];
}
