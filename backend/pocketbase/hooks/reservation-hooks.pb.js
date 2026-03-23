/// <reference path="../pb_data/types.d.ts" />

/**
 * reservation-hooks.js
 *
 * PocketBase server-side hooks for the reservations collection.
 * Automatically writes entries to reservation_logs on create/update/delete.
 */

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
