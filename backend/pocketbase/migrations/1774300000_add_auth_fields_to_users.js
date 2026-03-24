/// <reference path="../pb_data/types.d.ts" />

/**
 * TASK-043 — Add role and restaurant_id fields to the built-in `users` auth collection.
 *
 * PocketBase creates a `users` auth collection automatically on first startup.
 * This migration adds two custom fields to it:
 *   - role:          select (superadmin | restaurant_admin | staff)
 *   - restaurant_id: relation → restaurants (nullable for superadmin)
 *
 * If the users collection doesn't exist yet (fresh install), this migration
 * is a no-op — PocketBase will apply it after the users collection is created.
 */
migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");
    if (!collection) return; // safety: no-op if users not yet created

    const restaurants = app.findCollectionByNameOrId("restaurants");

    // Add role field — wrap in try/catch to handle double-apply gracefully
    try {
        collection.fields.add({
            name:      "role",
            type:      "select",
            required:  true,
            maxSelect: 1,
            values:    ["superadmin", "restaurant_admin", "staff"],
        });
    } catch (e) {
        // Field already exists — no-op
    }

    if (restaurants) {
        try {
            collection.fields.add({
                name:          "restaurant_id",
                type:          "relation",
                required:      false,
                collectionId:  restaurants.id,
                cascadeDelete: false,
                maxSelect:     1,
            });
        } catch (e) {
            // Field already exists — no-op
        }
    }

    // Set auth collection rules — authenticated users can view their own record
    collection.viewRule   = "@request.auth.id = id";
    collection.updateRule = "@request.auth.id = id";
    // Only superadmin can list all users; staff/admin see themselves via viewRule
    collection.listRule   = "@request.auth.role = \"superadmin\" || @request.auth.id = id";

    return app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("users");
    if (!collection) return;

    try { collection.fields.removeByName("role"); }          catch (e) {}
    try { collection.fields.removeByName("restaurant_id"); } catch (e) {}

    // Restore open rules (development default)
    collection.listRule   = "";
    collection.viewRule   = "";
    collection.updateRule = "";

    return app.save(collection);
});
