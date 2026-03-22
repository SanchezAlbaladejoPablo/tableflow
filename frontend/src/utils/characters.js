/**
 * characters.js — Phase 22 / TASK-144
 *
 * Gestor de personajes animados ("Tom Nook") para el floorplan 2.5D.
 * Feature puramente visual — no afecta la lógica de reservas ni PocketBase.
 *
 * Ciclo de vida de un personaje:
 *   1. spawn(tableId, doorPos, tablePos) — aparece en la puerta
 *   2. state = 'walking'                 — camina hacia su mesa
 *   3. state = 'seated'                  — se sienta al llegar
 *   4. remove(tableId)                   — desaparece cuando la reserva termina
 */

const WALK_SPEED = 60;  // píxeles de pantalla por segundo

/**
 * @typedef {Object} Character
 * @property {string}            tableId
 * @property {number}            x        - posición actual en pantalla (cx)
 * @property {number}            y        - posición actual en pantalla (cy)
 * @property {number}            targetX  - posición de destino (mesa)
 * @property {number}            targetY
 * @property {'walking'|'seated'} state
 * @property {number}            animFrame - contador de frame para animación
 */

export class CharacterManager {
    /** @type {Map<string, Character>} */
    #characters = new Map();

    /**
     * Añadir un personaje en la puerta que camina hacia la mesa.
     * Si ya existe para ese tableId, no hace nada.
     *
     * @param {string} tableId
     * @param {{ sx: number, sy: number }} doorPos  - posición de pantalla de la puerta
     * @param {{ sx: number, sy: number }} tablePos - posición de pantalla de la mesa
     */
    spawn(tableId, doorPos, tablePos) {
        if (this.#characters.has(tableId)) return;

        this.#characters.set(tableId, {
            tableId,
            x:       doorPos.sx,
            y:       doorPos.sy,
            targetX: tablePos.sx,
            targetY: tablePos.sy - 28, // ligeramente encima de la mesa
            state:   "walking",
            animFrame: 0,
        });
    }

    /**
     * Eliminar un personaje por tableId.
     *
     * @param {string} tableId
     */
    remove(tableId) {
        this.#characters.delete(tableId);
    }

    /**
     * ¿Existe ya un personaje para esta mesa?
     *
     * @param {string} tableId
     * @returns {boolean}
     */
    has(tableId) {
        return this.#characters.has(tableId);
    }

    /**
     * Actualizar posiciones y estados de todos los personajes.
     *
     * @param {number} deltaMs - tiempo transcurrido desde el último frame (ms)
     */
    update(deltaMs) {
        const dt = deltaMs / 1000; // convertir a segundos

        for (const char of this.#characters.values()) {
            char.animFrame++;

            if (char.state !== "walking") continue;

            const dx = char.targetX - char.x;
            const dy = char.targetY - char.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 2) {
                // Llegó a la mesa
                char.x     = char.targetX;
                char.y     = char.targetY;
                char.state = "seated";
            } else {
                // Avanzar hacia el destino
                const step = Math.min(WALK_SPEED * dt, dist);
                char.x += (dx / dist) * step;
                char.y += (dy / dist) * step;
            }
        }
    }

    /**
     * Devuelve todos los personajes activos ordenados por Y para pintor-algorithm.
     *
     * @returns {Character[]}
     */
    getAll() {
        return [...this.#characters.values()].sort((a, b) => a.y - b.y);
    }

    /**
     * Eliminar todos los personajes (reset).
     */
    clear() {
        this.#characters.clear();
    }
}
