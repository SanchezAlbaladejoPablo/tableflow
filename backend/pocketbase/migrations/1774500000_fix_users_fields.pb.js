/// <reference path="../pb_data/types.d.ts" />

/**
 * Fix users collection: add role and restaurant_id fields using PocketBase 0.36 API.
 *
 * The previous migration (1774300000) used the wrong API (plain objects instead of
 * Field classes), so the fields were silently not added.
 * This migration adds them correctly and is idempotent.
 */
migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");
    if (!collection) return;

    const restaurants = app.findCollectionByNameOrId("restaurants");

    // Remove existing fields first (in case they exist in a broken state)
    try { collection.fields.removeById(collection.fields.getByName("role")?.getId()); } catch {}
    try { collection.fields.removeById(collection.fields.getByName("restaurant_id")?.getId()); } catch {}

    // Add role field using SelectField class
    collection.fields.add(new SelectField({
        name:      "role",
        required:  true,
        maxSelect: 1,
        values:    ["superadmin", "restaurant_admin", "staff"],
    }));

    // Add restaurant_id field using RelationField class
    if (restaurants) {
        collection.fields.add(new RelationField({
            name:          "restaurant_id",
            required:      false,
            collectionId:  restaurants.id,
            cascadeDelete: false,
            maxSelect:     1,
        }));
    }

    // Update collection rules
    collection.listRule   = "@request.auth.role = \"superadmin\" || @request.auth.id = id";
    collection.viewRule   = "@request.auth.id = id";
    collection.updateRule = "@request.auth.id = id";

    app.save(collection);

}, (app) => {
    const collection = app.findCollectionByNameOrId("users");
    if (!collection) return;

    try { collection.fields.removeById(collection.fields.getByName("role")?.getId()); } catch {}
    try { collection.fields.removeById(collection.fields.getByName("restaurant_id")?.getId()); } catch {}

    collection.listRule   = "";
    collection.viewRule   = "";
    collection.updateRule = "";

    app.save(collection);
});
