# docs/SETUP.md — Setup & Installation Guide

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| PocketBase | >= 0.22 | Download from https://pocketbase.io/docs/ |
| n8n | >= 1.x | `npm install -g n8n` or Docker |
| Node.js | >= 18 | Only needed for seed script and tests |
| A modern browser | — | Chrome, Firefox, or Edge |

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/tableflow.git
cd tableflow
```

---

## 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
POCKETBASE_URL=http://localhost:8090
OPENAI_API_KEY=sk-your-key-here
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
```

Never commit `.env` to the repository.

---

## 3. Start PocketBase

Download the PocketBase binary for your platform from https://pocketbase.io/docs/

```bash
# Place the binary in the project root or a dedicated folder
./pocketbase serve --http 127.0.0.1:8090 \
    --dir backend/pocketbase/data \
    --migrationsDir backend/pocketbase/migrations \
    --hooksDir backend/pocketbase/hooks
```

> **Important:** The `--hooksDir` flag is required for reservation logs and visit count tracking to work. Without it, the `reservation_logs` collection will remain empty.

PocketBase will be available at:
- API: http://localhost:8090
- Admin UI: http://localhost:8090/_/

On first run, create an admin account through the Admin UI.

---

## 4. Apply Database Migrations

Migrations are PocketBase JS hooks stored in `backend/pocketbase/migrations/`.

PocketBase applies them automatically on startup if they are in the correct folder.
Alternatively, run:

```bash
./pocketbase migrate up --dir backend/pocketbase/migrations
```

---

## 5. Load Seed Data

```bash
cd seed
npm install
node seed.js
```

This creates:
- 1 example restaurant ("La Terraza")
- 10 tables with floor plan coordinates
- 5 sample customers
- 8 sample reservations

---

## 6. Start n8n

```bash
n8n start
```

n8n will be available at http://localhost:5678

---

## 7. Import n8n Workflows

1. Open n8n at http://localhost:5678
2. Go to **Workflows → Import from File**
3. Import each JSON file from `automations/n8n/`:
   - `reservation-confirmation.json`
   - `24h-reminder.json`
   - `incoming-message-handler.json`
   - `ai-classifier.json`
4. Set the following credentials in n8n:
   - OpenAI API key
   - Email / SMS provider credentials
5. Update the PocketBase webhook URL in each workflow to point to your instance
6. Activate all workflows

---

## 8. Open the Frontend

The frontend requires no build step during development.
Serve it with any static file server:

```bash
# Using Node.js (npx serve)
cd frontend
npx serve .

# Or Python
python3 -m http.server 3000
```

Open http://localhost:3000 in your browser.

---

## 9. Running Tests

```bash
cd tests
npm install
npm test
```

---

## Production Deployment

For a production deployment:

1. Run PocketBase behind a reverse proxy (nginx/Caddy) with HTTPS
2. Run n8n behind the same or a separate reverse proxy
3. Build/bundle the frontend (optional — a simple CDN-hosted static site works)
4. Set all environment variables as server-level environment variables, not in `.env`
5. Enable PocketBase's built-in backups or set up SQLite WAL + file backup

---

## Floorplan 3D (opcional)

El floorplan 3D requiere **WebGL** — disponible en todos los navegadores de escritorio modernos (Chrome, Firefox, Edge, Safari).

Para activarlo, editar `index.html`:

```javascript
window.APP_CONFIG = {
    POCKETBASE_URL: "http://localhost:8090",
    RESTAURANT_ID: "",
    USE_3D_FLOOR_PLAN: true,   // ← cambiar a true
};
```

Three.js se carga automáticamente vía CDN ESM cuando `USE_3D_FLOOR_PLAN` es `true`. No se requiere `npm install` ni build step.

Si el dispositivo no soporta WebGL, el floorplan SVG 2D se activa automáticamente como fallback.

Ver `docs/FLOORPLAN_3D.md` para la documentación técnica completa.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| PocketBase not starting | Check that port 8090 is free |
| CORS errors from frontend | PocketBase allows all origins by default in dev; check `--origins` flag for production |
| n8n workflows not triggering | Verify PocketBase webhook URLs in workflow nodes |
| Seed script fails | Ensure PocketBase is running and admin credentials are set |
| AI classification not working | Check that `OPENAI_API_KEY` is set and the n8n AI workflow is active |
