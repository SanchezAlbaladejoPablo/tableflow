/// <reference path="../pb_data/types.d.ts" />

// FIX (2026-03-21): Removed `options: {}` wrapper on all fields.
// PocketBase ≥ 0.22 requires field properties at top level.
// Affected fields: restaurant_id, table_id, customer_id (collectionId),
//                  status, source (values).

migrate((app) => {
    const restaurants = app.findCollectionByNameOrId("restaurants");
    const tables      = app.findCollectionByNameOrId("tables");
    const customers   = app.findCollectionByNameOrId("customers");

    const collection = new Collection({
        name: "reservations",
        type: "base",
        listRule:   "",
        viewRule:   "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                name: "restaurant_id",
                type: "relation",
                required: true,
                collectionId: restaurants.id,
                cascadeDelete: true,
                maxSelect: 1,
            },
            {
                name: "table_id",
                type: "relation",
                required: false,
                collectionId: tables.id,
                cascadeDelete: false,
                maxSelect: 1,
            },
            {
                name: "customer_id",
                type: "relation",
                required: false,
                collectionId: customers.id,
                cascadeDelete: false,
                maxSelect: 1,
            },
            {
                name: "guest_name",
                type: "text",
                required: true,
                min: 1,
                max: 200,
            },
            {
                name: "guest_email",
                type: "email",
                required: false,
            },
            {
                name: "guest_phone",
                type: "text",
                required: false,
                max: 50,
            },
            {
                name: "party_size",
                type: "number",
                required: true,
                min: 1,
                max: 100,
            },
            {
                name: "reserved_at",
                type: "date",
                required: true,
            },
            {
                name: "duration_minutes",
                type: "number",
                required: false,
                min: 15,
                max: 480,
            },
            {
                name: "status",
                type: "select",
                required: true,
                maxSelect: 1,
                values: ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"],
            },
            {
                name: "notes",
                type: "text",
                required: false,
                max: 2000,
            },
            {
                name: "source",
                type: "select",
                required: false,
                maxSelect: 1,
                values: ["manual", "phone", "email", "whatsapp", "ai_classified"],
            },
            {
                name: "ai_confidence",
                type: "number",
                required: false,
                min: 0,
                max: 1,
            },
        ],
        indexes: [
            "CREATE INDEX idx_reservations_restaurant_id ON reservations (restaurant_id)",
            "CREATE INDEX idx_reservations_reserved_at ON reservations (reserved_at)",
            "CREATE INDEX idx_reservations_status ON reservations (status)",
            "CREATE INDEX idx_reservations_restaurant_date ON reservations (restaurant_id, reserved_at)",
            "CREATE INDEX idx_reservations_table_id ON reservations (table_id)",
        ],
    });

    app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("reservations");
    if (collection) app.delete(collection);
});
