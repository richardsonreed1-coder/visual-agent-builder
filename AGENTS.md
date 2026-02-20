AGENTS.md
Project Overview
AUTOPILATE is an AI agent design and orchestration platform. It provides a visual builder (VAB) for designing multi-agent systems, an AI-powered configuration pipeline, and a deploy bridge that packages systems for execution on the OpenClaw runtime. The platform separates design-time intelligence (VAB + Configure Wizard + Fixer Agent) from runtime execution (OpenClaw Gateway + self-contained system pipelines). Systems designed in VAB are independent, self-contained pipelines — OpenClaw dispatches and triggers them but does not orchestrate their internals.
Stack: React 18 + Vite + TypeScript frontend, Express + Socket.io backend, PostgreSQL, Redis, PM2, OpenClaw runtime. Mac Mini M4 deployment target.
Essential Commands
bash# Frontend (React + Vite)
npm install                    # Install frontend dependencies
npm run dev                    # Start Vite dev server (default: localhost:5173)
npm run build                  # TypeScript compile + Vite build
npm run lint                   # ESLint with zero warnings policy

# Backend (Express + Socket.io)
cd server && npm install       # Install server dependencies
cd server && npm run dev       # Start with nodemon (localhost:3001)
cd server && npm start         # Production start with ts-node

# Tests
cd server && npm test          # Run server tests (Vitest)

# Database
psql $DATABASE_URL             # Connect to deployment registry
npm run migrate                # Run pending migrations

# Infrastructure
pm2 list                       # Check running processes
pm2 logs <process-name>        # Tail process logs
redis-cli ping                 # Verify Redis is running
Both frontend and backend must run simultaneously — frontend fetches inventory from http://localhost:3001/api and connects via Socket.io for real-time execution.
Git Operations

Atomic commits only: one logical change per commit
List every file path explicitly: git commit -m "message" -- path/to/file1 path/to/file2
Multiple agents may work in the same folder — only commit YOUR changes
NEVER run destructive git operations unless explicitly told to
Never amend commits without explicit approval
Commit message format: feat(scope):, fix(scope):, refactor(scope):, test(scope):, docs(scope):

Available Tools

Build: Poltergeist is running. Use polter autopilate instead of manual builds.
Vision: peekaboo image --app "Chrome" --analyze "description"
Hard problems: oracle -p "description" -f "src/**/*.ts"
Logs: pm2 logs <process-name> for runtime, psql $DATABASE_URL for queries
GitHub: use gh CLI, NOT the GitHub MCP

Architecture
Core Concepts
System: A self-contained multi-agent pipeline designed in VAB. Each system has an entry point, agent configs, MCP tool connections, and a trigger definition (cron, webhook, or on-demand). Systems run independently as PM2 processes.
OpenClaw: Open-source AI agent runtime (github.com/openclaw/openclaw). Provides gateway, messaging channels (WhatsApp, Telegram, Slack, Discord), cron service, browser automation, and daemon management. AUTOPILATE git-clones OpenClaw and uses it as the runtime layer.
Router Agent: Sits between OpenClaw messaging channels and the Systems Library. Classifies incoming requests, matches to deployed systems, gathers required inputs via follow-up questions, and triggers execution.
Operator Agents: Self-healing layer — System Monitor (cron: every 5 min), QA Remediation Agent (event: on QA FAIL), Optimization Agent (cron: weekly). These are themselves AUTOPILATE systems running on OpenClaw.
Frontend (src/)
State Management: Zustand store (src/store/useStore.ts) manages nodes, edges, selectedNode, libraryCategory, addToAgentMode, and workflowConfig.
Layout: Three-panel design in App.tsx — LibraryPanel (left), Canvas (center), PropertiesPanel (right) — plus bottom TerminalPanel and modal-based ConfigureWizard.
Data Flow:

LibraryPanel fetches inventory tree via TanStack Query from /api/inventory
Drag events set application/reactflow data with node type, label, and filepath
Canvas drop handler fetches component content via /api/component-content, creates nodes
Node selection updates selectedNode → PropertiesPanel renders config form
react-hook-form with auto-sync updates node config via updateNodeData()
"Add mode" in library panel allows clicking to attach skills/MCPs/commands to agents

Node Types: Defined in src/types/core.ts — AGENT, SKILL, PLUGIN, TOOL, PROVIDER, HOOK, COMMAND, REASONING.
Key Components:

src/components/Editor/Canvas.tsx — React Flow wrapper with drop handling
src/components/Editor/Toolbar.tsx — Export, run, save/load, configure buttons
src/components/Editor/Nodes/CustomNode.tsx — Visual node rendering with type-based colors
src/components/Library/LibraryPanel.tsx — File tree with search, category tabs, add mode
src/components/Properties/PropertiesPanel.tsx — Full agent configuration UI
src/components/ConfigureWizard/ — 3-phase AI-powered config analysis and suggestion
src/components/Terminal/TerminalPanel.tsx — Streaming execution output

Export System (src/utils/export/):

generators/vab-native/ — AUTOPILATE System Bundle (CLAUDE.md + agent files + MCP configs + settings)
src/utils/export.ts — JSON workflow export (save/load)
src/utils/generateClaudeMdExecutable.ts — Executable CLAUDE.md with inferred execution phases

Backend (server/)
Express + Socket.io server:
REST API:

GET /api/inventory — Scans configured directories, returns hierarchical file tree with inferred categories
GET /api/component-content?path=<filepath> — Returns component file content

Socket Events (real-time):

system:start / system:stop — Workflow execution lifecycle
fixer:launch — Launch Fixer Agent (Claude Code CLI or Anthropic API fallback)
fixer:apply-patches — Apply fixes back to node configs in store
execution:log, execution:step-start, agent:result, execution:report — Streaming output

Key Services:

server/services/orchestrator-bridge.ts — Converts canvas state to ParsedWorkflow to ExecutionPlan
server/services/runtime.ts — Agent execution via Claude API with streaming
server/services/session-store.ts — File-backed session persistence
server/services/configuration-analyzer.ts — AI-powered config gap analysis

Shared (shared/)

shared/socket-events.ts — Socket event type definitions shared between frontend and backend

Module Boundaries

src/components/ never imports from server/ directly — all communication via REST API or Socket.io
src/utils/export/ reads from the Zustand store and src/types/ only
server/services/ is the only layer that touches external APIs (Claude, filesystem)
shared/ has zero imports from src/ or server/ — pure type definitions
src/store/useStore.ts is the single source of truth for canvas state

Key Libraries

React Flow (reactflow) — Canvas rendering, node connections, drag-drop
Zustand — Lightweight state management
TanStack Query — Server state and caching
react-hook-form — Form state with subscription-based updates
Socket.io — Real-time bidirectional communication
Tailwind CSS — Styling
Lucide React — Icons
Axios — HTTP client

Path Alias
@/ maps to src/ via Vite config for cleaner imports.
Configuration
To point the inventory scanner at your component directories, edit server/services/inventory.ts:

Update INVENTORY_ROOT to your base directory
Modify REPO_CONFIGS to match your folder structure

Naming Conventions

Files: kebab-case.ts for modules, PascalCase.tsx for React components
Exports: named exports only, no default exports (except React components which use default)
Types/Interfaces: PascalCase, suffixed with purpose: SystemManifest, DeploymentRecord, ExecutionLog
Functions: camelCase, verb-first: generateBundle, deploySystem, classifyMessage
Constants: SCREAMING_SNAKE for true constants: MAX_FIXER_ITERATIONS, QA_THRESHOLD
Database: snake_case for tables and columns: execution_logs, deployment_id

TypeScript Rules

Strict mode (strict: true in tsconfig)
No any — use unknown and narrow with type guards
Prefer interface over type for object shapes
Use discriminated unions for variant types: { kind: 'cron'; expression: string } | { kind: 'webhook'; url: string }
All async functions return explicit Promise<T> types
Errors: throw typed errors extending AutopilateError base class in shared/errors.ts
No classes unless genuinely needed (prefer plain functions + types)

React Rules

Functional components only
Zustand for canvas state (existing pattern in src/store/useStore.ts — don't migrate to other state libs)
React Flow for canvas (existing — don't abstract or wrap it further)
TanStack Query for server data fetching — don't use useEffect for data fetching
react-hook-form for config forms — follow the existing auto-sync pattern via updateNodeData()
Collocate components with their feature directory when used in only one place
Extract to shared only when used across 2+ feature directories

Framework-Specific Gotchas

React Flow: node data must be serializable JSON. No functions, no class instances in node data.
React Flow: when updating node data, always use setNodes with a new array reference, not mutation.
Zustand: never destructure the store at module level. Always use selectors: useStore(state => state.nodes) not useStore().
Vite: environment variables must be prefixed with VITE_ to be available in frontend code. Server-only secrets go in .env without prefix.
Socket.io: always handle disconnect and connect_error events on the client side. Reconnect logic is built-in but needs error UI.
PM2: pm2.restart() resolves before the process is fully restarted. Always poll pm2.describe() for 'online' status.
PostgreSQL jsonb: always use parameterized queries for jsonb values. Never string-interpolate JSON into SQL.
Redis pub/sub: subscriber connections cannot be used for other commands. Use separate connections.
Express async errors: unhandled promise rejections in route handlers crash the process. Always wrap async handlers.

Database & Migrations

Direct pg client with typed query helpers (no ORM)
Migration files: server/migrations/YYYYMMDD_HHMMSS_description.ts
Each migration exports up(client) and down(client) functions
NEVER auto-run migrations without explicit approval
Run migrations: npm run migrate
When multiple agents are running: only ONE agent touches schema at a time

Testing

Write tests AFTER implementing, IN THE SAME agent context
Tests in same context find real bugs. Tests in fresh context are generic.
Test runner: Vitest (cd server && npm test)
Test: export bundle generation, deploy bridge translation, router classification, operator actions, API routes
Skip: pure UI layout tweaks, React Flow visual positioning
Mock: Claude API calls (never call real APIs in tests), PM2 commands, OpenClaw gateway, Socket.io events
Fixtures: minimal test workflow JSONs in server/tests/fixtures/

Code Quality

Every file stays under 300 lines. Decompose before continuing.
Add code comments on tricky parts — helps future agent runs
No dead code
Formatting + linting: npm run lint (ESLint with zero warnings policy)
Type checking: npm run build (includes tsc)

Common Agent Failure Patterns

Dead framework references: NEVER introduce AutoGen, CrewAI, or LangGraph types, imports, or config options. These were removed in Phase 1. If you see them, delete them.
React Flow node data mutations: Always create new node objects when updating. React Flow does shallow comparison. Mutations cause stale renders.
Zustand store subscriptions: Don't subscribe to the entire store. Use selectors: useStore(state => state.nodes) not useStore().
updateNodeData pattern: Follow the existing react-hook-form auto-sync pattern. Don't bypass it with direct store mutations.
PM2 restart race conditions: After pm2.restart(), poll pm2.describe() until status is 'online'. Don't assume instant restart.
PostgreSQL jsonb injection: Always use $1::jsonb parameterized queries. Never JSON.stringify() into template literals.
Redis subscriber reuse: A Redis connection in subscribe mode cannot run GET/SET. Create separate connections.
Socket.io event naming: All events are defined in shared/socket-events.ts. Use the constants, don't hardcode event strings.
Vite env vars in server code: import.meta.env only works in frontend. Use process.env in server code.
OpenClaw config paths: OpenClaw expects configs in specific directories relative to its install root. Don't assume relative paths from AUTOPILATE's directory.
ClawHub skill versions: Always pin skill versions in deployed systems. Unpinned skills can break on updates.
Fixer Agent iteration limit: Hard cap at 25 iterations. Don't increase it.
QA remediation loop: Max 3 iterations. If QA still fails after 3 cycles, escalate to user. Don't loop forever.
Canvas JSON serialization: Before exporting, strip React Flow internal properties (selected, dragging, etc.). Only export user-meaningful state.
TanStack Query keys: Use consistent query keys for inventory data. Invalidate correctly after mutations.
Path alias in tests: @/ alias may not resolve in Vitest without explicit config. Check vitest.config.ts alias setup.
