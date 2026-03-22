# MIGRATION_FIX_NOTES.md

## Bug: campo `options: {}` incompatible con PocketBase ≥ 0.22

**Fecha:** 2026-03-21
**Archivos afectados:** todos los archivos en `backend/pocketbase/migrations/`

---

## Causa raíz

PocketBase cambió su API de definición de campos en la versión 0.22.

| Versión | Sintaxis correcta |
|---|---|
| ≤ 0.21 | Propiedades del campo dentro de `options: { ... }` |
| ≥ 0.22 | Propiedades del campo en el **nivel raíz** del objeto |

Las migraciones originales usaban la sintaxis antigua, lo que provocaba:

```
failed to apply migration: fields: (
  1: (collectionId: cannot be blank.)
  4: (values: cannot be blank.)
  5: (values: cannot be blank.)
)
```

---

## Campos afectados por tipo

### Relation fields — `collectionId` en nivel raíz

```js
// ❌ ANTES (sintaxis antigua):
{
    name: "restaurant_id",
    type: "relation",
    options: {
        collectionId: restaurants.id,
        cascadeDelete: true,
        maxSelect: 1,
    },
}

// ✅ DESPUÉS (PocketBase ≥ 0.22):
{
    name: "restaurant_id",
    type: "relation",
    collectionId: restaurants.id,
    cascadeDelete: true,
    maxSelect: 1,
}
```

### Select fields — `values` en nivel raíz

```js
// ❌ ANTES:
{
    name: "status",
    type: "select",
    options: {
        maxSelect: 1,
        values: ["pending", "confirmed"],
    },
}

// ✅ DESPUÉS:
{
    name: "status",
    type: "select",
    maxSelect: 1,
    values: ["pending", "confirmed"],
}
```

### Text / Number fields — `min`, `max` en nivel raíz

```js
// ❌ ANTES:
{ name: "name", type: "text", options: { min: 1, max: 200 } }

// ✅ DESPUÉS:
{ name: "name", type: "text", min: 1, max: 200 }
```

---

## Resumen de cambios por archivo

| Archivo | Campos corregidos |
|---|---|
| `1711018200_create_restaurants.js` | `name`, `slug`, `address`, `phone`, `timezone` (min/max) |
| `1711018201_create_tables.js` | `restaurant_id` (collectionId), `shape` (values), `area` (values), campos numéricos (min/max) |
| `1711018202_create_customers.js` | `restaurant_id` (collectionId), campos texto/número |
| `1711018203_create_reservations.js` | `restaurant_id`, `table_id`, `customer_id` (collectionId), `status`, `source` (values) |
| `1711018204_create_reservation_logs.js` | `reservation_id`, `restaurant_id` (collectionId), `event` (values) |

Adicionalmente, la función `down` de todas las migraciones ahora hace un null-check (`if (collection)`) para ser idempotente.

---

## Regla para futuras migraciones

> En PocketBase ≥ 0.22, **nunca uses `options: {}`** en definiciones de campos.
> Todos los parámetros van directamente en el objeto del campo.

Referencia de propiedades por tipo:

| Tipo | Propiedades válidas |
|---|---|
| `text` | `min`, `max`, `pattern` |
| `number` | `min`, `max`, `onlyInt` |
| `select` | `maxSelect`, `values` |
| `relation` | `collectionId`, `maxSelect`, `cascadeDelete` |
| `date` | `min`, `max` |
| `file` | `maxSelect`, `maxSize`, `mimeTypes`, `thumbs` |
| `json` | `maxSize` |
| `email`, `url`, `bool`, `editor` | sin propiedades adicionales requeridas |

---

## Pasos de verificación tras aplicar el fix

1. **Arrancar PocketBase con las migraciones corregidas:**
   ```bash
   ./pocketbase serve \
     --http 127.0.0.1:8090 \
     --dir backend/pocketbase/data \
     --migrationsDir backend/pocketbase/migrations \
     --hooksDir backend/pocketbase/hooks
   ```
   El log no debe mostrar ningún error de migración.

2. **Verificar colecciones en el Admin UI:**
   Abrir http://127.0.0.1:8090/_ y comprobar que existen las 5 colecciones:
   - `restaurants`
   - `tables`
   - `customers`
   - `reservations`
   - `reservation_logs`

3. **Verificar campos de `tables`:**
   - `shape` debe ser tipo Select con valores: `rectangle`, `circle`, `square`
   - `area` debe ser tipo Select con valores: `indoor`, `outdoor`, `bar`
   - `restaurant_id` debe ser tipo Relation apuntando a `restaurants`

4. **Verificar campos de `reservations`:**
   - `status` debe ser tipo Select con los 6 estados
   - `table_id`, `customer_id`, `restaurant_id` deben ser Relations correctas

5. **Cargar seed data y verificar:**
   ```bash
   cd seed && node seed.js
   ```
   Debe completarse sin errores y mostrar las 8 reservas creadas.

6. **Verificar índices** desde el Admin UI → Collections → cada colección → Indexes tab.
