# AUTOPILATE

AI agent design and orchestration platform. Design multi-agent systems visually in the VAB (Visual Agent Builder), configure them with AI assistance, and deploy them as self-contained pipelines on the OpenClaw runtime. The platform separates design-time intelligence (VAB + Configure Wizard + Fixer Agent) from runtime execution (OpenClaw Gateway + PM2 processes + self-healing operator agents).

## Architecture

```
AUTOPILATE (Design-Time)            OpenClaw (Runtime)
┌──────────────────────────┐        ┌──────────────────────────┐
│  VAB Canvas               │        │  Gateway                  │
│  Configure Wizard         │ deploy │  Router Agent              │
│  Fixer Agent              │ ────►  │  Systems Library           │
│  Export Engine             │        │  Operator Agents           │
│  Deploy Bridge             │        │  Messaging Channels        │
└──────────────────────────┘        └──────────────────────────┘
```

Systems designed in VAB are independent, self-contained pipelines. OpenClaw dispatches and triggers them but does not orchestrate their internals. Each system manages its own agent coordination, phase ordering, and quality gates.

For full architecture details, database schema, and API routes, see [docs/spec.md](docs/spec.md).

## Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis
- PM2 (`npm install -g pm2`)
- OpenClaw runtime (git clone from github.com/openclaw/openclaw)

## Quick Start

```bash
# Clone
git clone <repo-url> && cd autopilate

# Install dependencies
npm install
cd server && npm install && cd ..

# Set up database
createdb autopilate
cp .env.example .env
# Edit .env with your DATABASE_URL, ANTHROPIC_API_KEY, etc.
cd server && npm run migrate && cd ..

# Start dev servers (two terminals)
npm run dev                    # Frontend: localhost:5173
cd server && npm run dev       # Backend:  localhost:3001

# Start OpenClaw (separate terminal)
cd /path/to/openclaw && pm2 start ecosystem.config.js
```

Both frontend and backend must run simultaneously. The frontend fetches inventory from `http://localhost:3001/api` and connects via Socket.io for real-time execution.

## Development Commands

```bash
# Frontend
npm run dev                    # Vite dev server
npm run build                  # TypeScript compile + Vite build
npm run lint                   # ESLint (zero warnings policy)

# Backend
cd server && npm run dev       # Express + Socket.io with nodemon
cd server && npm start         # Production start with ts-node

# Tests
cd server && npm test          # Server tests (Vitest)

# Database
cd server && npm run migrate   # Run pending migrations

# Type checking
npm run build                  # Includes tsc
cd server && npx tsc --noEmit  # Server-only type check

# Infrastructure
pm2 list                       # Check running processes
pm2 logs <process-name>        # Tail process logs
redis-cli ping                 # Verify Redis
```

## Project Structure

```
autopilate/
├── src/                           # React frontend (Vite + TypeScript)
│   ├── components/
│   │   ├── Editor/                # React Flow canvas, toolbar, custom nodes/edges
│   │   ├── Library/               # Component library panel, systems dashboard
│   │   ├── Properties/            # Node configuration forms, field types, schemas
│   │   ├── ConfigureWizard/       # AI-powered 3-phase config analysis
│   │   ├── Terminal/              # Streaming execution output
│   │   ├── Chat/                  # Messaging UI for router agent
│   │   └── Deploy/                # Deployment modal and trigger config
│   ├── store/                     # Zustand state management (useStore.ts)
│   ├── export/                    # Bundle generator, CLAUDE.md gen, PM2 config gen
│   ├── features/export-import/    # JSON workflow save/load
│   ├── services/                  # API clients (inventory, configure)
│   ├── hooks/                     # useSocket, useHeadlessSession
│   ├── types/                     # Core types (nodes, edges, config, system)
│   ├── constants/                 # Buckets, taxonomy, subcategories
│   └── utils/                     # Export helpers, role manager, migrations
│
├── server/                        # Express + Socket.io backend
│   ├── src/                       # Server entry point + middleware
│   │   └── middleware/            # Auth, rate limiting, validation, error handling
│   ├── routes/                    # API routes (systems, deploy, operators)
│   ├── services/                  # Core services
│   │   ├── inventory/             # Component inventory scanner + cache
│   │   ├── deploy-bridge.ts       # Canvas → OpenClaw translation
│   │   ├── registry.ts            # PostgreSQL deployment registry
│   │   ├── router-agent.ts        # Message classification + routing
│   │   ├── system-monitor.ts      # 5-min health check operator
│   │   ├── qa-remediation.ts      # QA failure remediation operator
│   │   ├── optimization-agent.ts  # Weekly optimization operator
│   │   ├── runtime.ts             # Agent execution via Claude API
│   │   └── orchestrator-bridge.ts # Workflow → execution plan
│   ├── socket/                    # Socket.io event handlers
│   ├── agents/                    # Architect, builder, supervisor agents
│   ├── mcp/                       # MCP server + canvas manipulation tools
│   ├── lib/                       # Anthropic client, crypto, error classes
│   ├── types/                     # Server-specific types
│   ├── migrations/                # PostgreSQL migration files
│   ├── tests/                     # Server tests (deploy, router, operators)
│   └── db.ts                      # PostgreSQL connection + pool
│
├── shared/                        # Shared type definitions (no src/ or server/ imports)
│   ├── socket-events.ts           # Socket.io event types
│   ├── configure-types.ts         # Configure wizard types
│   └── subcategories.ts           # Shared category definitions
│
├── docs/                          # Documentation
│   ├── spec.md                    # Architecture spec, DB schema, API routes
│   ├── sprint-plan.md             # Development sprint plan
│   ├── execution-playbook.md      # Daily workflow guide
│   └── verification-checklist.md  # Pre-deploy QA checklist
│
├── tests/                         # Root-level integration tests
├── CLAUDE.md                      # Agent instructions (→ AGENTS.md symlink)
├── docker-compose.yml             # Docker setup
├── vite.config.ts                 # Vite configuration
└── vitest.config.ts               # Vitest configuration
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, React Flow, Zustand, TanStack Query, Tailwind CSS |
| Backend | Express, Socket.io, Claude API (Anthropic SDK) |
| Database | PostgreSQL 16, Redis |
| Process Management | PM2 |
| Runtime | OpenClaw |
| Testing | Vitest |
| Build | Vite |

## Documentation

### Architecture & Reference

- [Architecture Overview](docs/architecture.md) -- Component diagram, folder structure, data flow from design through deployment
- [API Reference: REST](docs/api.md) -- Every REST endpoint with request/response schemas and curl examples
- [API Reference: Socket.io](docs/api-socket.md) -- All Socket.io events, payload schemas, and AI failover strategy
- [Data Model](docs/data-model.md) -- ER diagram, table schemas, JSONB column structures, Redis key patterns

### Business Logic

- [Export & Deploy](docs/business-logic-export.md) -- Bundle generation, deploy bridge, trigger factory, configure wizard
- [Router & Sessions](docs/business-logic-router.md) -- Message classification, input gathering, session management, chat pipeline
- [Operator Agents](docs/business-logic-operators.md) -- System monitor, QA remediation, optimization agent, orchestrator bridge

### Planning & Operations

- [Architecture Spec](docs/spec.md) -- Original system design spec and key decisions
- [Sprint Plan](docs/sprint-plan.md) -- Task breakdown with agent prompts and verification steps
- [Execution Playbook](docs/execution-playbook.md) -- Daily workflow, recovery patterns, parallel execution guide
- [Verification Checklist](docs/verification-checklist.md) -- Pre-deploy QA checklist
- [CLAUDE.md](CLAUDE.md) -- Agent instructions, coding conventions, architecture reference
