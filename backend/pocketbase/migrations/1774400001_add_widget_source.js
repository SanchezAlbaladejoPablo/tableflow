/// <reference path="../pb_data/types.d.ts" />

// Phase 17 — TASK-073
// Adds "widget" as a valid value for reservations.source select field.

migrate((app) => {
    const collection = app.findCollectionByNameOrId("reservations");
    const field = collection.fields.getByName("source");
    if (field) {
        field.values = ["manual", "phone", "email", "whatsapp", "ai_classified", "widget"];
    }
    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("reservations");
    const field = collection.fields.getByName("source");
    if (field) {
        field.values = ["manual", "phone", "email", "whatsapp", "ai_classified"];
    }
    return app.save(collection);
});
