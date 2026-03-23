/**
 * registration-hooks.pb.js
 *
 * Custom PocketBase route for self-service restaurant registration.
 *
 * Exposes: POST /api/custom/register
 */

routerAdd("POST", "/api/custom/register", (e) => {
    const app  = e.app;
    const data = e.requestInfo().body;

    // -------------------------------------------------------------------------
    // Input validation
    // -------------------------------------------------------------------------

    const email          = (data["email"]          ?? "").trim().toLowerCase();
    const password       = (data["password"]       ?? "").trim();
    const restaurantName = (data["restaurantName"] ?? "").trim();

    if (!email || !password || !restaurantName) {
        return e.json(400, { message: "Email, contraseña y nombre del restaurante son obligatorios." });
    }

    if (password.length < 8) {
        return e.json(400, { message: "La contraseña debe tener al menos 8 caracteres." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return e.json(400, { message: "El formato del email no es válido." });
    }

    // -------------------------------------------------------------------------
    // Check for duplicate email
    // -------------------------------------------------------------------------

    try {
        app.findAuthRecordByEmail("users", email);
        return e.json(409, { message: "Ya existe una cuenta con ese email." });
    } catch {
        // Not found — expected for a new registration
    }

    // -------------------------------------------------------------------------
    // Create restaurant
    // -------------------------------------------------------------------------

    let restaurant;
    try {
        const restaurantsCol = app.findCollectionByNameOrId("restaurants");
        restaurant = new Record(restaurantsCol);

        const slug = restaurantName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .substring(0, 80)
            + "-" + Date.now().toString(36);

        restaurant.set("name",         restaurantName);
        restaurant.set("slug",         slug);
        restaurant.set("timezone",     "Europe/Madrid");
        restaurant.set("opening_hours", {});

        app.save(restaurant);
    } catch (err) {
        return e.json(500, { message: "Error creando restaurante: " + String(err) });
    }

    // -------------------------------------------------------------------------
    // Create user linked to the restaurant
    // -------------------------------------------------------------------------

    let user, usersCol;
    try {
        usersCol = app.findCollectionByNameOrId("users");
        user     = new Record(usersCol);

        user.set("email",           email);
        user.set("emailVisibility", true);
        user.set("role",            "restaurant_admin");
        user.set("restaurant_id",   restaurant.id);
        user.setPassword(password);

        app.save(user);
    } catch (err) {
        return e.json(500, { message: "Error creando usuario: " + String(err) });
    }

    // -------------------------------------------------------------------------
    // Create default restaurant_settings
    // -------------------------------------------------------------------------

    try {
        const settingsCol = app.findCollectionByNameOrId("restaurant_settings");
        const settings    = new Record(settingsCol);

        const widgetToken = Array.from(
            { length: 32 },
            () => Math.floor(Math.random() * 36).toString(36)
        ).join("");

        settings.set("restaurant_id",            restaurant.id);
        settings.set("timezone",                 "Europe/Madrid");
        settings.set("default_duration_minutes", 90);
        settings.set("min_gap_minutes",          180);
        settings.set("opening_time",             "13:00");
        settings.set("closing_time",             "23:30");
        settings.set("primary_color",            "#6366f1");
        settings.set("booking_widget_enabled",   false);
        settings.set("booking_widget_token",     widgetToken);

        app.save(settings);
    } catch (err) {
        // Non-fatal — user and restaurant exist, settings can be created later
        console.error("[registration] failed to create restaurant_settings:", String(err));
    }

    // -------------------------------------------------------------------------
    // Issue auth token for the new user
    // -------------------------------------------------------------------------

    let token;
    try {
        token = user.newAuthToken();
    } catch (err) {
        return e.json(500, { message: "Error generando token: " + String(err) });
    }

    return e.json(200, {
        token,
        record: {
            id:            user.id,
            email:         user.getString("email"),
            role:          user.getString("role"),
            restaurant_id: user.getString("restaurant_id"),
        },
        restaurant: {
            id:   restaurant.id,
            name: restaurant.getString("name"),
        },
    });
});
