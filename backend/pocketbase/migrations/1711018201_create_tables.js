/// <reference path="../pb_data/types.d.ts" />

// FIX (2026-03-21): Removed `options: {}` wrapper on all fields.
// PocketBase ≥ 0.22 requires field properties at top level.
// Affected fields: restaurant_id (collectionId), shape (values), area (values).

migrate((app) => {
    const restaurants = app.findCollectionByNameOrId("restaurants");

    const collection = new Collection({
        name: "tables",
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
                name: "number",
                type: "number",
                required: true,
                min: 1,
            },
            {
                name: "capacity",
                type: "number",
                required: true,
                min: 1,
                max: 100,
            },
            {
                name: "shape",
                type: "select",
                required: true,
                maxSelect: 1,
                values: ["rectangle", "circle", "square"],
            },
            {
                name: "area",
                type: "select",
                required: false,
                maxSelect: 1,
                values: ["indoor", "outdoor", "bar"],
            },
            {
                name: "pos_x",
                type: "number",
                required: true,
                min: 0,
            },
            {
                name: "pos_y",
                type: "number",
                required: true,
                min: 0,
            },
            {
                name: "width",
                type: "number",
                required: false,
                min: 10,
                max: 300,
            },
            {
                name: "height",
                type: "number",
                required: false,
                min: 10,
                max: 300,
            },
            {
                name: "is_active",
                type: "bool",
                required: false,
            },
        ],
        indexes: [
            "CREATE INDEX idx_tables_restaurant_id ON tables (restaurant_id)",
            "CREATE UNIQUE INDEX idx_tables_restaurant_number ON tables (restaurant_id, number)",
        ],
    });

    app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("tables");
    if (collection) app.delete(collection);
});
