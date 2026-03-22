/**
 * seed.js
 *
 * Populates TableFlow with example data for development and testing.
 *
 * Creates:
 *   - 1 restaurant ("La Terraza")
 *   - 10 tables with floor plan coordinates
 *   - 5 customers
 *   - 8 reservations in various statuses
 *
 * Usage:
 *   npm install
 *   node seed.js
 *
 * Requires PocketBase running at POCKETBASE_URL with admin credentials set
 * via POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD env vars.
 */

import PocketBase from "pocketbase";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://localhost:8090";
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || "admin1234567";

const pb = new PocketBase(POCKETBASE_URL);

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const RESTAURANT = {
    name: "La Terraza",
    slug: "la-terraza",
    address: "Calle Gran Vía 42, Madrid, Spain",
    phone: "+34 91 123 4567",
    email: "reservas@laterraza.es",
    timezone: "Europe/Madrid",
    opening_hours: {
        mon: "closed",
        tue: "13:00-23:00",
        wed: "13:00-23:00",
        thu: "13:00-23:00",
        fri: "13:00-00:00",
        sat: "12:00-00:00",
        sun: "12:00-22:00",
    },
};

// Tables: spread across two areas (indoor and outdoor)
// pos_x and pos_y are pixel coordinates on an 800x500 floor plan canvas
const TABLES = [
    // Indoor area (left side)
    { number: 1, capacity: 2, shape: "circle",    area: "indoor", pos_x: 80,  pos_y: 80,  width: 70,  height: 70,  is_active: true },
    { number: 2, capacity: 2, shape: "circle",    area: "indoor", pos_x: 80,  pos_y: 200, width: 70,  height: 70,  is_active: true },
    { number: 3, capacity: 4, shape: "rectangle", area: "indoor", pos_x: 200, pos_y: 80,  width: 120, height: 70,  is_active: true },
    { number: 4, capacity: 4, shape: "rectangle", area: "indoor", pos_x: 200, pos_y: 200, width: 120, height: 70,  is_active: true },
    { number: 5, capacity: 6, shape: "rectangle", area: "indoor", pos_x: 380, pos_y: 80,  width: 150, height: 80,  is_active: true },
    { number: 6, capacity: 8, shape: "rectangle", area: "indoor", pos_x: 380, pos_y: 220, width: 180, height: 90,  is_active: true },
    // Outdoor terrace (right side)
    { number: 7, capacity: 2, shape: "square",    area: "outdoor", pos_x: 580, pos_y: 60,  width: 70,  height: 70,  is_active: true },
    { number: 8, capacity: 2, shape: "square",    area: "outdoor", pos_x: 680, pos_y: 60,  width: 70,  height: 70,  is_active: true },
    { number: 9, capacity: 4, shape: "rectangle", area: "outdoor", pos_x: 580, pos_y: 180, width: 120, height: 70,  is_active: true },
    { number: 10, capacity: 4, shape: "rectangle", area: "outdoor", pos_x: 580, pos_y: 300, width: 120, height: 70, is_active: true },
];

const CUSTOMERS = [
    { name: "María García",    email: "maria.garcia@email.com",   phone: "+34 600 111 222", notes: "Alergia a los frutos secos", visit_count: 5 },
    { name: "Carlos López",    email: "carlos.lopez@email.com",   phone: "+34 600 333 444", notes: "Prefiere mesa junto a la ventana", visit_count: 3 },
    { name: "Ana Martínez",    email: "ana.martinez@email.com",   phone: "+34 600 555 666", notes: "", visit_count: 1 },
    { name: "Pedro Sánchez",   email: "pedro.sanchez@email.com",  phone: "+34 600 777 888", notes: "Cliente VIP", visit_count: 12 },
    { name: "Laura Fernández", email: "laura.fernandez@email.com", phone: "+34 600 999 000", notes: "Vegetariana", visit_count: 2 },
];

// Reservations use relative dates from today for demo freshness
function daysFromNow(days, hour = 20, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

// Built dynamically once we have IDs for restaurant, tables, customers
function buildReservations(restaurantId, tableIds, customerIds) {
    return [
        {
            restaurant_id: restaurantId,
            table_id: tableIds[2], // table 3 (4 pax)
            customer_id: customerIds[0],
            guest_name: "María García",
            guest_email: "maria.garcia@email.com",
            guest_phone: "+34 600 111 222",
            party_size: 3,
            reserved_at: daysFromNow(0, 21, 0),
            duration_minutes: 90,
            status: "confirmed",
            notes: "Alergia a frutos secos",
            source: "phone",
        },
        {
            restaurant_id: restaurantId,
            table_id: tableIds[4], // table 5 (6 pax)
            customer_id: customerIds[3],
            guest_name: "Pedro Sánchez",
            guest_email: "pedro.sanchez@email.com",
            guest_phone: "+34 600 777 888",
            party_size: 5,
            reserved_at: daysFromNow(0, 21, 30),
            duration_minutes: 120,
            status: "seated",
            notes: "Cliente VIP — mesa especial preparada",
            source: "manual",
        },
        {
            restaurant_id: restaurantId,
            table_id: tableIds[5], // table 6 (8 pax)
            customer_id: null,
            guest_name: "Evento Corporativo",
            guest_email: "eventos@empresa.com",
            guest_phone: "+34 91 987 6543",
            party_size: 8,
            reserved_at: daysFromNow(1, 14, 0),
            duration_minutes: 180,
            status: "confirmed",
            notes: "Menú cerrado. Requieren proyector.",
            source: "email",
        },
        {
            restaurant_id: restaurantId,
            table_id: tableIds[8], // table 9 outdoor
            customer_id: customerIds[1],
            guest_name: "Carlos López",
            guest_email: "carlos.lopez@email.com",
            guest_phone: "+34 600 333 444",
            party_size: 2,
            reserved_at: daysFromNow(1, 21, 0),
            duration_minutes: 90,
            status: "pending",
            notes: "Aniversario — preparar detalle",
            source: "whatsapp",
        },
        {
            restaurant_id: restaurantId,
            table_id: tableIds[0], // table 1
            customer_id: customerIds[2],
            guest_name: "Ana Martínez",
            guest_email: "ana.martinez@email.com",
            guest_phone: "+34 600 555 666",
            party_size: 2,
            reserved_at: daysFromNow(2, 20, 30),
            duration_minutes: 90,
            status: "confirmed",
            notes: "",
            source: "manual",
        },
        {
            restaurant_id: restaurantId,
            table_id: tableIds[3], // table 4
            customer_id: customerIds[4],
            guest_name: "Laura Fernández",
            guest_email: "laura.fernandez@email.com",
            guest_phone: "+34 600 999 000",
            party_size: 4,
            reserved_at: daysFromNow(3, 21, 0),
            duration_minutes: 90,
            status: "confirmed",
            notes: "Menú vegetariano para todos",
            source: "ai_classified",
            ai_confidence: 0.94,
        },
        {
            restaurant_id: restaurantId,
            table_id: null, // not yet assigned
            customer_id: null,
            guest_name: "Familia Ruiz",
            guest_email: "",
            guest_phone: "+34 600 123 456",
            party_size: 6,
            reserved_at: daysFromNow(5, 14, 30),
            duration_minutes: 120,
            status: "pending",
            notes: "Comida de cumpleaños",
            source: "ai_classified",
            ai_confidence: 0.87,
        },
        {
            restaurant_id: restaurantId,
            table_id: tableIds[1], // table 2
            customer_id: customerIds[0],
            guest_name: "María García",
            guest_email: "maria.garcia@email.com",
            guest_phone: "+34 600 111 222",
            party_size: 2,
            reserved_at: daysFromNow(-3, 20, 0),
            duration_minutes: 90,
            status: "completed",
            notes: "",
            source: "phone",
        },
    ];
}

// ---------------------------------------------------------------------------
// Seed execution
// ---------------------------------------------------------------------------

async function clearCollection(collectionName) {
    try {
        const records = await pb.collection(collectionName).getFullList();
        for (const record of records) {
            await pb.collection(collectionName).delete(record.id);
        }
        console.log(`  Cleared ${records.length} existing records from "${collectionName}"`);
    } catch {
        // Collection may be empty — that's fine
    }
}

async function main() {
    console.log("TableFlow Seed Script");
    console.log("=====================");
    console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);

    // Authenticate as admin
    // PocketBase ≥ 0.23 uses _superusers instead of the old /api/admins endpoint
    await pb.collection("_superusers").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("Authenticated as admin.\n");

    // Clear existing seed data (order matters due to foreign keys)
    console.log("Clearing existing data...");
    await clearCollection("reservation_logs");
    await clearCollection("reservations");
    await clearCollection("customers");
    await clearCollection("tables");
    await clearCollection("restaurants");

    // -------------------------------------------------------------------------
    // Create restaurant
    // -------------------------------------------------------------------------
    console.log("\nCreating restaurant...");
    const restaurant = await pb.collection("restaurants").create(RESTAURANT);
    console.log(`  Created: ${restaurant.name} (id: ${restaurant.id})`);

    // -------------------------------------------------------------------------
    // Create tables
    // -------------------------------------------------------------------------
    console.log("\nCreating tables...");
    const tableRecords = [];
    for (const table of TABLES) {
        const record = await pb.collection("tables").create({
            ...table,
            restaurant_id: restaurant.id,
        });
        tableRecords.push(record);
        console.log(`  Table ${record.number}: capacity ${record.capacity}, area ${record.area}`);
    }
    const tableIds = tableRecords.map((t) => t.id);

    // -------------------------------------------------------------------------
    // Create customers
    // -------------------------------------------------------------------------
    console.log("\nCreating customers...");
    const customerRecords = [];
    for (const customer of CUSTOMERS) {
        const record = await pb.collection("customers").create({
            ...customer,
            restaurant_id: restaurant.id,
        });
        customerRecords.push(record);
        console.log(`  ${record.name} (${record.email})`);
    }
    const customerIds = customerRecords.map((c) => c.id);

    // -------------------------------------------------------------------------
    // Create reservations
    // -------------------------------------------------------------------------
    console.log("\nCreating reservations...");
    const reservations = buildReservations(restaurant.id, tableIds, customerIds);
    for (const reservation of reservations) {
        const record = await pb.collection("reservations").create(reservation);
        console.log(
            `  [${record.status.padEnd(10)}] ${record.guest_name} — ${record.party_size} pax @ ${record.reserved_at}`
        );
    }

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log("\n✓ Seed complete!");
    console.log(`  Restaurant : La Terraza (id: ${restaurant.id})`);
    console.log(`  Tables     : ${tableRecords.length}`);
    console.log(`  Customers  : ${customerRecords.length}`);
    console.log(`  Reservations: ${reservations.length}`);
    console.log("\nOpen the PocketBase Admin UI at http://localhost:8090/_ to inspect the data.");
}

main().catch((err) => {
    console.error("\nSeed failed:", err.message || err);
    process.exit(1);
});
