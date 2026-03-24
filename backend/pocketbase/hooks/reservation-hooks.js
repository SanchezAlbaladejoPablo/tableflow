/// <reference path="../pb_data/types.d.ts" />

/**
 * reservation-hooks.js
 *
 * PocketBase server-side hooks for the reservations collection.
 * - beforeCreate: validates gap rule (TASK-S01) and party size (TASK-S02)
 * - afterCreate:  writes reservation_log entry
 * - afterUpdate:  writes reservation_log entry, increments visit_count on completion
 */

// ---------------------------------------------------------------------------
// Helper: convert JS Date to PocketBase datetime string ("YYYY-MM-DD HH:MM:SS.000Z")
// ---------------------------------------------------------------------------

function toPbDate(d) {
    return d.toISOString().replace("T", " ");
}

// ---------------------------------------------------------------------------
// Hook: BEFORE reservation created — gap + party-size validation (TASK-S01, S02)
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
    const record       = e.record;
    const app          = e.app;
    const tableId      = record.getString("table_id");
    const restaurantId = record.getString("restaurant_id");
    const partySize    = record.getInt("party_size");
    const reservedAtRaw = record.getString("reserved_at");

    // If no table assigned yet, nothing to validate
    if (!tableId) {
        e.next();
        return;
    }

    // -----------------------------------------------------------------------
    // TASK-S02: Party size vs. table capacity
    // -----------------------------------------------------------------------

    try {
        const table    = app.findRecordById("tables", tableId);
        const capacity = table.getInt("capacity");
        if (partySize > capacity) {
            throw new ApiError(422, `El grupo (${partySize} personas) supera la capacidad de la mesa (${capacity}).`, {
                code: "PARTY_SIZE_EXCEEDS_CAPACITY",
                party_size: partySize,
                capacity,
            });
        }
    } catch (err) {
        if (err instanceof ApiError) throw err;
        // Table not found — let PocketBase FK validation handle it
    }

    // -----------------------------------------------------------------------
    // TASK-S01: Gap / overlap validation
    // -----------------------------------------------------------------------

    const reservedAt      = new Date(reservedAtRaw.replace(" ", "T"));
    const durationMinutes = record.getInt("duration_minutes") || 90;

    // Fetch per-restaurant gap setting
    let minGapMinutes = 0;
    try {
        const settings = app.findFirstRecordByFilter(
            "restaurant_settings",
            `restaurant_id = '${restaurantId}'`
        );
        minGapMinutes = settings.getInt("min_gap_minutes") || 0;
    } catch {
        // No settings found — enforce no extra gap
    }

    const gapMs      = minGapMinutes * 60 * 1000;
    const durationMs = durationMinutes * 60 * 1000;

    // Protected window: [slotStart, slotEnd) includes gap on both sides
    const slotStart = new Date(reservedAt.getTime() - gapMs);
    const slotEnd   = new Date(reservedAt.getTime() + durationMs + gapMs);

    // Query: same table, active statuses, starts before our window closes
    let candidates;
    try {
        candidates = app.findRecordsByFilter(
            "reservations",
            `table_id = '${tableId}' && status != 'cancelled' && status != 'no_show' && reserved_at < '${toPbDate(slotEnd)}'`,
            "-reserved_at",
            200,
            0
        );
    } catch {
        // Query failed — fail open to avoid blocking all reservations
        e.next();
        return;
    }

    for (const existing of candidates) {
        const existingStart    = new Date(existing.getString("reserved_at").replace(" ", "T"));
        const existingDuration = existing.getInt("duration_minutes") || 90;
        const existingEnd      = new Date(existingStart.getTime() + existingDuration * 60 * 1000);

        // Overlap: existing reservation ends after our window starts
        if (existingEnd > slotStart) {
            const fmtTime = (d) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
            throw new ApiError(422,
                `La mesa ya tiene una reserva de ${fmtTime(existingStart)} a ${fmtTime(existingEnd)} que entra en conflicto (incluido el margen de ${minGapMinutes} min).`,
                {
                    code: "TABLE_NOT_AVAILABLE",
                    conflict_reservation_id: existing.id,
                    conflict_reserved_at: existing.getString("reserved_at"),
                    conflict_end: toPbDate(existingEnd),
                    min_gap_minutes: minGapMinutes,
                }
            );
        }
    }

    e.next();
}, "reservations");

// ---------------------------------------------------------------------------
// Helper: write a log entry
// ---------------------------------------------------------------------------

function writeLog(app, reservationId, restaurantId, event, details) {
    const logsCollection = app.findCollectionByNameOrId("reservation_logs");
    const record = new Record(logsCollection);
    record.set("reservation_id", reservationId);
    record.set("restaurant_id", restaurantId);
    record.set("event", event);
    if (details) {
        record.set("details", details);
    }
    app.save(record);
}

// ---------------------------------------------------------------------------
// Hook: after reservation created
// ---------------------------------------------------------------------------

onRecordAfterCreateSuccess((e) => {
    const record = e.record;
    try {
        writeLog(
            e.app,
            record.id,
            record.getString("restaurant_id"),
            "created",
            {
                guest_name: record.getString("guest_name"),
                party_size: record.getInt("party_size"),
                reserved_at: record.getString("reserved_at"),
                status: record.getString("status"),
                source: record.getString("source"),
            }
        );
    } catch (err) {
        // Log errors should not block the main operation
        console.error("[reservation-hooks] failed to write created log:", err);
    }
}, "reservations");

// ---------------------------------------------------------------------------
// Hook: after reservation updated
// ---------------------------------------------------------------------------

onRecordAfterUpdateSuccess((e) => {
    const record = e.record;

    // Determine which fields changed by comparing original vs new
    const original = e.record.original();
    const changedFields = {};

    const trackedFields = [
        "status", "table_id", "reserved_at", "party_size",
        "guest_name", "guest_phone", "guest_email", "notes",
    ];

    for (const field of trackedFields) {
        const oldVal = original.get(field);
        const newVal = record.get(field);
        if (String(oldVal) !== String(newVal)) {
            changedFields[field] = { from: oldVal, to: newVal };
        }
    }

    if (Object.keys(changedFields).length === 0) {
        return; // nothing meaningful changed
    }

    // Determine primary event type
    let event = "updated";
    if (changedFields.status) {
        if (changedFields.status.to === "cancelled") event = "cancelled";
    }
    if (changedFields.table_id && changedFields.table_id.to) {
        event = "table_assigned";
    }

    try {
        writeLog(
            e.app,
            record.id,
            record.getString("restaurant_id"),
            event,
            { changed: changedFields }
        );
    } catch (err) {
        console.error("[reservation-hooks] failed to write updated log:", err);
    }
}, "reservations");

// ---------------------------------------------------------------------------
// Hook: increment customer visit_count when reservation is completed
// ---------------------------------------------------------------------------

onRecordAfterUpdateSuccess((e) => {
    const record = e.record;
    const original = e.record.original();

    const oldStatus = original.getString("status");
    const newStatus = record.getString("status");

    if (oldStatus === newStatus || newStatus !== "completed") {
        return;
    }

    const customerId = record.getString("customer_id");
    if (!customerId) {
        return;
    }

    try {
        const customer = e.app.findRecordById("customers", customerId);
        const currentCount = customer.getInt("visit_count") || 0;
        customer.set("visit_count", currentCount + 1);
        e.app.save(customer);
    } catch (err) {
        console.error("[reservation-hooks] failed to increment visit_count:", err);
    }
}, "reservations");
