/// <reference path="../pb_data/types.d.ts" />

// FIX (2026-03-21): Removed `options: {}` wrapper on all fields.
// PocketBase ≥ 0.22 requires field properties at top level.
// Affected fields: reservation_id, restaurant_id (collectionId), event (values).

migrate((app) => {
    const restaurants  = app.findCollectionByNameOrId("restaurants");
    const reservations = app.findCollectionByNameOrId("reservations");

    const collection = new Collection({
        name: "reservation_logs",
        type: "base",
        listRule:   "",
        viewRule:   "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                name: "reservation_id",
                type: "relation",
                required: true,
                collectionId: reservations.id,
                cascadeDelete: true,
                maxSelect: 1,
            },
            {
                name: "restaurant_id",
                type: "relation",
                required: true,
                collectionId: restaurants.id,
                cascadeDelete: true,
                maxSelect: 1,
            },
            {
                name: "event",
                type: "select",
                required: true,
                maxSelect: 1,
                values: [
                    "created",
                    "updated",
                    "cancelled",
                    "table_assigned",
                    "reminder_sent",
                    "confirmation_sent",
                ],
            },
            {
                name: "details",
                type: "json",
                required: false,
            },
        ],
        indexes: [
            "CREATE INDEX idx_reservation_logs_reservation_id ON reservation_logs (reservation_id)",
            "CREATE INDEX idx_reservation_logs_restaurant_id ON reservation_logs (restaurant_id)",
        ],
    });

    app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("reservation_logs");
    if (collection) app.delete(collection);
});
