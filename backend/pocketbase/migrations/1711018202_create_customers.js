/// <reference path="../pb_data/types.d.ts" />

// FIX (2026-03-21): Removed `options: {}` wrapper on all fields.
// PocketBase ≥ 0.22 requires field properties at top level.

migrate((app) => {
    const restaurants = app.findCollectionByNameOrId("restaurants");

    const collection = new Collection({
        name: "customers",
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
                name: "name",
                type: "text",
                required: true,
                min: 1,
                max: 200,
            },
            {
                name: "email",
                type: "email",
                required: false,
            },
            {
                name: "phone",
                type: "text",
                required: false,
                max: 50,
            },
            {
                name: "notes",
                type: "text",
                required: false,
                max: 2000,
            },
            {
                name: "visit_count",
                type: "number",
                required: false,
                min: 0,
            },
        ],
        indexes: [
            "CREATE INDEX idx_customers_restaurant_id ON customers (restaurant_id)",
            "CREATE INDEX idx_customers_phone ON customers (restaurant_id, phone)",
        ],
    });

    app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("customers");
    if (collection) app.delete(collection);
});
