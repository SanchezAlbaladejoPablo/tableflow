/// <reference path="../pb_data/types.d.ts" />

// FIX (2026-03-21): Removed `options: {}` wrapper.
// PocketBase ≥ 0.22 requires field properties at top level, not nested in options.

migrate((app) => {
    const collection = new Collection({
        name: "restaurants",
        type: "base",
        // API rules: open for development. Tighten in production.
        listRule:   "",
        viewRule:   "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                name: "name",
                type: "text",
                required: true,
                min: 1,
                max: 200,
            },
            {
                name: "slug",
                type: "text",
                required: true,
                min: 1,
                max: 100,
            },
            {
                name: "address",
                type: "text",
                required: false,
                max: 500,
            },
            {
                name: "phone",
                type: "text",
                required: false,
                max: 50,
            },
            {
                name: "email",
                type: "email",
                required: false,
            },
            {
                name: "timezone",
                type: "text",
                required: true,
                max: 100,
            },
            {
                name: "opening_hours",
                type: "json",
                required: false,
            },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_restaurants_slug ON restaurants (slug)",
        ],
    });

    app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("restaurants");
    if (collection) app.delete(collection);
});
