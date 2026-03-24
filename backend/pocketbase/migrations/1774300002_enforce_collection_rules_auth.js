/// <reference path="../pb_data/types.d.ts" />

/**
 * TASK-044 — Apply tenant-isolating auth rules to all existing collections.
 *
 * Before this migration, all collections had open rules ("") for development.
 * After this migration, all read/write operations require:
 *   - A valid JWT from an authenticated user
 *   - The user's restaurant_id must match the record's restaurant_id
 *     (superadmin is exempt from the restaurant_id check)
 *
 * Rule pattern:
 *   List/View: @request.auth.id != "" && (superadmin OR same restaurant)
 *   Create:    @request.auth.id != "" && restaurant_id matches auth
 *   Update:    @request.auth.id != "" && same restaurant
 *   Delete:    restaurant_admin or superadmin, same restaurant
 */

const SUPERADMIN = `@request.auth.role = "superadmin"`;
const SAME_RESTAURANT = `@request.auth.restaurant_id = restaurant_id`;
const AUTHED = `@request.auth.id != ""`;
const IS_ADMIN = `(@request.auth.role = "superadmin" || @request.auth.role = "restaurant_admin")`;

const READ_RULE   = `${AUTHED} && (${SUPERADMIN} || ${SAME_RESTAURANT})`;
const CREATE_RULE = `${AUTHED} && (${SUPERADMIN} || @request.auth.restaurant_id = @request.body.restaurant_id)`;
const UPDATE_RULE = `${AUTHED} && (${SUPERADMIN} || ${SAME_RESTAURANT})`;
const DELETE_RULE = `${AUTHED} && ${IS_ADMIN} && (${SUPERADMIN} || ${SAME_RESTAURANT})`;

migrate((app) => {
    for (const name of ["tables", "customers", "reservations", "reservation_logs"]) {
        const col = app.findCollectionByNameOrId(name);
        if (!col) continue;

        unmarshal({
            listRule:   READ_RULE,
            viewRule:   READ_RULE,
            createRule: CREATE_RULE,
            updateRule: UPDATE_RULE,
            deleteRule: DELETE_RULE,
        }, col);

        app.save(col);
    }

    // restaurants collection is special: restaurant_id IS the id
    // Override: listRule allows restaurant admins to see their own restaurant
    const restaurants = app.findCollectionByNameOrId("restaurants");
    if (restaurants) {
        unmarshal({
            listRule:   `${AUTHED} && (${SUPERADMIN} || @request.auth.restaurant_id = id)`,
            viewRule:   `${AUTHED} && (${SUPERADMIN} || @request.auth.restaurant_id = id)`,
            createRule: `${SUPERADMIN}`,
            updateRule: `${AUTHED} && (${SUPERADMIN} || @request.auth.restaurant_id = id)`,
            deleteRule: `${SUPERADMIN}`,
        }, restaurants);
        app.save(restaurants);
    }

}, (app) => {
    // Rollback: restore open rules (development defaults)
    for (const name of ["restaurants", "tables", "customers", "reservations", "reservation_logs"]) {
        const col = app.findCollectionByNameOrId(name);
        if (!col) continue;
        unmarshal({
            listRule:   "",
            viewRule:   "",
            createRule: "",
            updateRule: "",
            deleteRule: "",
        }, col);
        app.save(col);
    }
});
