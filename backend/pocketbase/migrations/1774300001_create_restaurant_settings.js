/// <reference path="../pb_data/types.d.ts" />

/**
 * TASK-049 — Create the `restaurant_settings` collection.
 *
 * One record per restaurant. Stores all per-restaurant configuration:
 * timezone, reservation duration, gap between reservations, operating hours,
 * branding (logo, primary color), and booking widget settings.
 *
 * Included here (Phase 13) because auth rules depend on restaurant_id
 * and the settings collection is needed immediately after auth is in place.
 */
migrate((app) => {
    const restaurants = app.findCollectionByNameOrId("restaurants");

    const collection = new Collection({
        name: "restaurant_settings",
        type: "base",

        // Only authenticated users of the same restaurant can read
        // Only restaurant_admin can update
        listRule:   "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.restaurant_id = restaurant_id)",
        viewRule:   "@request.auth.id != \"\" && (@request.auth.role = \"superadmin\" || @request.auth.restaurant_id = restaurant_id)",
        createRule: "@request.auth.role = \"superadmin\" || @request.auth.role = \"restaurant_admin\"",
        updateRule: "@request.auth.role = \"superadmin\" || (@request.auth.role = \"restaurant_admin\" && @request.auth.restaurant_id = restaurant_id)",
        deleteRule: "@request.auth.role = \"superadmin\"",

        fields: [
            {
                name:          "restaurant_id",
                type:          "relation",
                required:      true,
                collectionId:  restaurants.id,
                cascadeDelete: true,
                maxSelect:     1,
            },
            {
                name:     "timezone",
                type:     "text",
                required: true,
                max:      100,
            },
            {
                // Default reservation duration in minutes
                name:     "default_duration_minutes",
                type:     "number",
                required: true,
                min:      15,
                max:      480,
            },
            {
                // Minimum gap between two reservations on the same table (minutes)
                name:     "min_gap_minutes",
                type:     "number",
                required: true,
                min:      0,
                max:      480,
            },
            {
                // Earliest allowed reservation time, format "HH:MM"
                name:     "opening_time",
                type:     "text",
                required: false,
                max:      5,
            },
            {
                // Latest allowed reservation time, format "HH:MM"
                name:     "closing_time",
                type:     "text",
                required: false,
                max:      5,
            },
            {
                // Public URL of the restaurant logo (shown in dashboard header)
                name:     "logo_url",
                type:     "url",
                required: false,
            },
            {
                // CSS hex color for dashboard branding, e.g. "#6366f1"
                name:     "primary_color",
                type:     "text",
                required: false,
                max:      7,
            },
            {
                name:     "booking_widget_enabled",
                type:     "bool",
                required: false,
            },
            {
                // Auto-generated UUID used as public widget auth token
                name:     "booking_widget_token",
                type:     "text",
                required: false,
                max:      100,
            },
        ],

        indexes: [
            "CREATE UNIQUE INDEX idx_restaurant_settings_restaurant_id ON restaurant_settings (restaurant_id)",
        ],
    });

    app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("restaurant_settings");
    if (collection) app.delete(collection);
});
