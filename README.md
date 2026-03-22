# TableFlow

**AI-Powered Restaurant Reservation Management System**

An open source, self-hostable reservation management system for restaurants.
Built with PocketBase, n8n, and Vanilla JavaScript.

---

## Features

- **Reservation Management** — Create, update, cancel, and track reservations with status workflows
- **Interactive Floor Plan** — SVG-based visual floor plan showing real-time table availability
- **Smart Table Assignment** — Automatically suggests the best available table for a party size
- **Customer CRM** — Track customer profiles, preferences, and visit history
- **Automation Workflows** — Confirmation emails, reminders, and notifications via n8n
- **AI Message Classification** — Automatically parse free-text reservation requests from email, SMS, or WhatsApp

---

## Architecture

```
Frontend Dashboard (Vanilla JS)
        ↓ REST API
PocketBase (Backend + SQLite)
        ↓ Webhooks
n8n Automation Platform
        ↓ API calls
OpenAI (AI Classification)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system diagram.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend / Database | [PocketBase](https://pocketbase.io) |
| Automation | [n8n](https://n8n.io) |
| Frontend | Vanilla JavaScript (ES Modules) |
| Floor Plan | SVG (interactive) |
| AI | OpenAI API (pluggable) |

---

## Quick Start

### Prerequisites

- PocketBase binary (>= 0.22)
- n8n (>= 1.x)
- Node.js >= 18 (for seed data and tests)

### Installation

```bash
# 1. Clone
git clone https://github.com/your-org/tableflow.git
cd tableflow

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start PocketBase
./pocketbase serve --dir backend/pocketbase/data

# 4. Load seed data
cd seed && npm install && node seed.js

# 5. Start n8n
n8n start
# Import workflows from automations/n8n/

# 6. Open the frontend
cd frontend && npx serve .
# Open http://localhost:3000
```

See [docs/SETUP.md](docs/SETUP.md) for detailed instructions.

---

## Database Schema

The system uses four core collections:

- **restaurants** — Restaurant profiles
- **tables** — Tables with floor plan coordinates and capacity
- **reservations** — Reservation records with full status lifecycle
- **customers** — Customer CRM data

See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for the full schema.

---

## Development

This project uses an AI-persistent development system.
Any AI agent can resume development by reading `CLAUDE.md` first.

```
CLAUDE.md           ← Start here (AI agents)
MEMORY.md           ← Project knowledge
PROJECT_STATUS.md   ← Current state
TASK_QUEUE.md       ← Next tasks
PROGRESS_LOG.md     ← History
DECISIONS.md        ← Architecture decisions
```

See [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) for agent rules.

---

## Project Structure

```
tableflow/
├── frontend/           # Vanilla JS dashboard
│   ├── index.html
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── services/   # API wrappers
│   │   └── utils/      # Utilities
│   └── styles/
├── backend/
│   └── pocketbase/
│       ├── migrations/ # Schema migrations
│       └── hooks/      # Server-side hooks
├── automations/
│   └── n8n/            # Workflow JSON exports
├── tests/              # Test suite
├── seed/               # Seed data
└── docs/               # Documentation
```

---

## Contributing

1. Read `CLAUDE.md` to understand the project
2. Pick the next task from `TASK_QUEUE.md`
3. Follow the workflow in `docs/AGENT_WORKFLOW.md`
4. Submit a pull request

---

## License

MIT License — see LICENSE file.
