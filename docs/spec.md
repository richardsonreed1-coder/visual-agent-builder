# AUTOPILATE — Architecture Spec

## What This Is

AUTOPILATE is an autonomous pipeline architecture that combines a visual workflow design tool (the Visual Agent Builder) with the OpenClaw open-source AI agent runtime to create a complete system for building, deploying, operating, and self-healing multi-agent AI workflows on local Mac Mini infrastructure. Users design complex agent pipelines via drag-and-drop, click Deploy, and the system runs autonomously — with operator agents that monitor health, fix failures, remediate quality issues, and optimize performance without human intervention.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js 20+ | OpenClaw ecosystem compatibility, PM2 process management |
| Language | TypeScript (strict) | Existing VAB codebase, type safety for complex config types |
| Frontend | React 18 + Vite | Existing VAB stack, React Flow for canvas, Zustand for state |
| Backend | Express + WebSocket | OpenClaw gateway compatibility, bidirectional log streaming |
| Database | PostgreSQL 16 | Deployment registry, execution history, system metrics, secret storage |
| Cache/PubSub | Redis | Live log streaming, trigger delivery, manual execution pub/sub |
| Process Mgmt | PM2 | Per-workflow process isolation, auto-restart, daemon supervision |
| Agent Runtime | OpenClaw (git clone) | 150k+ stars, multi-channel messaging, cron, browser automation |
| Skills Registry | ClawHub (git clone) | Shared capability library, security-evaluated skills |
| Reverse Proxy | Caddy | Auto-TLS, reverse proxy routing to VAB + OpenClaw |
| Tunnel | Cloudflare Tunnel | Secure external access without port forwarding |
| Remote Access | Tailscale | Private overlay network for dev access |
| Local Models | Ollama / MLX | On-device inference for cost-sensitive tasks |
| Deployment Target | Mac Mini M4 (16GB) | $599 one-time, 56% savings over 3yr cloud, macOS capabilities |
| Testing | Vitest | Fast, Vite-native, TypeScript-first |
| Build | Vite + tsup | VAB frontend via Vite, server components via tsup |

## Core Features (Priority Order)

1. **Clean Slate** — Remove all dead framework code (AutoGen, CrewAI, LangGraph) from the existing VAB codebase. Strip types, generators, UI panels, and config options. Zero dead references.
2. **AUTOPILATE System Bundle Export** — Replace generic export with a System Bundle that packages everything for OpenClaw deployment: system.json manifest, per-agent CLAUDE.md configs, MCP server configs, PM2 ecosystem file, and .env.example.
3. **Systems Library + Deploy Bridge** — Server-side catalog of deployed systems with PostgreSQL registry. Deploy Bridge translates canvas state into OpenClaw agent configs, registers triggers, and starts PM2 processes. Dashboard shows deployed systems, execution history, cost, and health.
4. **OpenClaw Integration + Router Agent** — Connect to a running OpenClaw instance. Router Agent sits between messaging channels and the Systems Library — classifies inbound messages, gathers missing inputs via conversation, compiles briefs, triggers systems, maintains session context for feedback loops.
5. **Operator Agents + Self-Healing** — System Monitor (5-min cron, detects failures, auto-fixes and restarts), QA Remediation Agent (event-triggered on QA FAIL, reruns failed nodes with patched prompts), Optimization Agent (weekly cron, analyzes cost/quality/reliability and proposes improvements).

## Folder Structure

```
autopilate/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── AGENTS.md → CLAUDE.md (symlink)
├── docs/
│   ├── spec.md
│   ├── sprint-plan.md
│   ├── execution-playbook.md
│   └── verification-checklist.md
├── src/
│   ├── main.tsx                      # Vite entry point for VAB frontend
│   ├── App.tsx                       # Root component, routing
│   ├── canvas/                       # React Flow canvas, node types, edge types
│   │   ├── nodes/                    # Node components (Agent, Skill, Plugin, Tool, etc.)
│   │   ├── edges/                    # Edge components (delegation, data, control, event, failover)
│   │   └── store.ts                  # Zustand canvas state
│   ├── config/                       # Configure Wizard, Fixer Agent UI
│   │   ├── ConfigModal.tsx           # Per-node configuration panel
│   │   ├── ConfigureWizard.tsx       # Three-phase analysis modal
│   │   └── FixerTerminal.tsx         # Fixer Agent streaming output
│   ├── export/                       # Export Engine
│   │   ├── bundle-generator.ts       # AUTOPILATE System Bundle generator
│   │   ├── claude-md-generator.ts    # Per-agent CLAUDE.md generation
│   │   ├── pm2-config-generator.ts   # PM2 ecosystem file generation
│   │   └── types.ts                  # SystemManifest, SystemBundle types
│   ├── deploy/                       # Deploy Bridge
│   │   ├── deploy-bridge.ts          # Canvas → OpenClaw config translation
│   │   ├── trigger-factory.ts        # Cron/webhook/messaging/always-on triggers
│   │   ├── registry.ts               # PostgreSQL deployment registry client
│   │   └── pm2-manager.ts            # PM2 process lifecycle management
│   ├── library/                      # Systems Library
│   │   ├── systems-catalog.ts        # System CRUD, search, categorization
│   │   ├── SystemsDashboard.tsx      # Deployed systems overview UI
│   │   └── SystemDetail.tsx          # Per-system execution history, logs, health
│   ├── router/                       # Router Agent
│   │   ├── router-agent.ts           # Message classification, system matching
│   │   ├── input-gatherer.ts         # Conversational input collection
│   │   └── session-manager.ts        # Feedback loop session context
│   ├── operators/                    # Operator Agents
│   │   ├── system-monitor.ts         # 5-min health check + auto-fix
│   │   ├── qa-remediation.ts         # QA FAIL → targeted re-execution
│   │   └── optimization-agent.ts     # Weekly cost/quality/reliability analysis
│   ├── dashboard/                    # Dashboard UI
│   │   ├── Dashboard.tsx             # Main dashboard layout
│   │   ├── ExecutionHistory.tsx      # Per-system execution timeline
│   │   ├── CostTracker.tsx           # Cost per system, per execution
│   │   ├── HealthPanel.tsx           # System health status
│   │   └── LogStream.tsx             # Live log streaming via Redis pub/sub
│   ├── server/                       # Backend server
│   │   ├── index.ts                  # Express + WebSocket server entry
│   │   ├── routes/                   # API routes (systems, deploy, logs, health)
│   │   ├── db.ts                     # PostgreSQL connection + queries
│   │   ├── redis.ts                  # Redis pub/sub client
│   │   └── middleware/               # Auth, error handling, validation
│   ├── types/                        # Shared TypeScript types
│   │   ├── config.ts                 # Node/edge/canvas config types (CLEANED)
│   │   ├── system.ts                 # SystemManifest, DeploymentRecord, ExecutionLog
│   │   ├── openclaw.ts               # OpenClaw-compatible config types
│   │   └── operator.ts               # Operator agent types (monitor, QA, optimization)
│   └── shared/                       # Utilities
│       ├── logger.ts                 # Structured logging
│       ├── errors.ts                 # Typed error classes
│       └── constants.ts              # App-wide constants
├── tests/
│   ├── export/                       # Bundle generator tests
│   ├── deploy/                       # Deploy bridge tests
│   ├── router/                       # Router agent tests
│   ├── operators/                    # Operator agent tests
│   └── fixtures/                     # Test workflow JSONs, mock OpenClaw responses
└── dist/                             # Build output
```

## Database Schema

### deployments

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| system_name | varchar(255) | Human-readable system name |
| system_slug | varchar(128) | URL-safe identifier, unique |
| manifest_json | jsonb | Full SystemManifest |
| canvas_json | jsonb | VAB canvas state snapshot |
| openclaw_config | jsonb | Generated OpenClaw agent configs |
| trigger_type | varchar(50) | 'cron' | 'webhook' | 'messaging' | 'always-on' |
| trigger_config | jsonb | Cron expression, webhook URL, etc. |
| pm2_process_name | varchar(128) | PM2 process identifier |
| status | varchar(20) | 'deployed' | 'stopped' | 'errored' | 'archived' |
| secrets_encrypted | bytea | AES-256-GCM encrypted env vars |
| deployed_at | timestamptz | When last deployed |
| created_at | timestamptz | When first created |
| updated_at | timestamptz | Last modification |

### execution_logs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| deployment_id | uuid | FK → deployments.id |
| triggered_by | varchar(50) | 'cron' | 'webhook' | 'messaging' | 'manual' | 'operator' |
| trigger_input | jsonb | Brief/payload that triggered execution |
| status | varchar(20) | 'running' | 'completed' | 'failed' | 'qa_failed' |
| phases_completed | integer | Number of pipeline phases completed |
| phases_total | integer | Total pipeline phases |
| output_url | text | Vercel link, file path, etc. |
| output_type | varchar(50) | 'web_artifact' | 'document' | 'data' | 'notification' |
| cost_usd | decimal(10,4) | Total LLM cost for this execution |
| duration_seconds | integer | Wall clock time |
| qa_scores | jsonb | Per-dimension quality scores |
| error_message | text | If status = 'failed' |
| started_at | timestamptz | Execution start |
| completed_at | timestamptz | Execution end |

### operator_actions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| deployment_id | uuid | FK → deployments.id |
| operator_type | varchar(30) | 'monitor' | 'qa_remediation' | 'optimization' |
| action_type | varchar(50) | 'restart' | 'key_rotation' | 'prompt_patch' | 'model_swap' | 'config_change' |
| description | text | Human-readable action summary |
| before_state | jsonb | Config before change |
| after_state | jsonb | Config after change |
| auto_applied | boolean | True if auto-applied, false if awaiting approval |
| approved | boolean | Null if pending, true/false after decision |
| created_at | timestamptz | When action was taken |

## API Routes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/systems | List all deployed systems | Yes |
| POST | /api/systems | Register new system from bundle | Yes |
| GET | /api/systems/:slug | Get system details + recent executions | Yes |
| PUT | /api/systems/:slug | Update system config | Yes |
| DELETE | /api/systems/:slug | Archive system, stop PM2 process | Yes |
| POST | /api/systems/:slug/deploy | Deploy/redeploy to OpenClaw | Yes |
| POST | /api/systems/:slug/stop | Stop PM2 process | Yes |
| POST | /api/systems/:slug/trigger | Manual trigger execution | Yes |
| GET | /api/systems/:slug/logs | Get execution history | Yes |
| GET | /api/systems/:slug/logs/:id | Get single execution detail | Yes |
| WS | /api/systems/:slug/stream | Live log streaming via WebSocket | Yes |
| GET | /api/health | System health overview | No |
| GET | /api/operators/actions | Recent operator actions | Yes |
| POST | /api/operators/actions/:id/approve | Approve pending operator action | Yes |

## Key Decisions

- **OpenClaw as runtime, not fork:** We git clone and configure. Every OpenClaw update benefits us automatically with zero merge conflicts.
- **Mac Mini M4 as infrastructure:** 56% cost savings over 3yr vs cloud, macOS-specific capabilities (Peekaboo, AXorcist, Ollama on Apple Silicon).
- **PostgreSQL for registry, not SQLite:** Operator agents query execution history concurrently. SQLite locks under concurrent writes.
- **Redis for pub/sub, not polling:** Live log streaming requires real-time push. Redis pub/sub is simpler than WebSocket fan-out from PM2.
- **PM2 over launchd for workflows:** PM2 gives us process-level metrics, log aggregation, and programmatic restart. launchd for the gateway itself.
- **System Bundles as ZIP:** Self-contained deployment artifacts. Can be version-controlled, shared, and re-imported.
- **Router Agent as persistent process:** Must respond to messages in real-time. Cannot be cron-triggered. Runs as always-on OpenClaw agent.
- **AES-256-GCM for secrets:** Encrypted at rest in PostgreSQL. Decrypted only at process startup into environment variables.
- **Phase-based re-execution for QA:** Only re-run failed pipeline phases, not entire systems. Saves cost and time.

## Third-Party Integrations

| Service | Purpose | Integration Pattern |
|---------|---------|-------------------|
| Anthropic Claude API | LLM for all agent execution, Configure Wizard, Fixer Agent | SDK in server, API key in env |
| OpenAI API | Alternative models, Oracle fallback | SDK in server, API key in env |
| Vercel | Web artifact deployment (landing pages, dashboards) | CLI deploy from agent, token in env |
| Slack | Messaging channel for Router Agent, operator notifications | OpenClaw Slack plugin, bot token in env |
| WhatsApp | Messaging channel via WhatsApp Business API | OpenClaw WhatsApp plugin |
| Telegram | Messaging channel | OpenClaw Telegram plugin |
| Tavily | Web research for market research agents | API key in system secrets |
| Cloudflare | Tunnel for external webhook ingress | cloudflared daemon |

## Deployment

- Platform: Mac Mini M4, headless, always-on
- Network: Static LAN IP 192.168.1.100, Cloudflare Tunnel for external, Tailscale for remote dev
- Services managed by: Homebrew services (PostgreSQL, Redis), PM2 (OpenClaw gateway, deployed systems), launchd (Caddy, cloudflared)
- Deploy command: `npm run build && pm2 restart autopilate-server`
- Database migrations: TypeScript migration files in `src/server/migrations/`, run via `npm run migrate`
- Environment variables: `.env` for local dev, PostgreSQL secrets table for deployed system secrets
