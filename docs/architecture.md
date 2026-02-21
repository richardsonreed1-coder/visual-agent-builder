# Architecture Overview

AUTOPILATE separates **design-time intelligence** (VAB + Configure Wizard + Fixer Agent) from **runtime execution** (OpenClaw Gateway + PM2 processes + operator agents). Systems designed in the Visual Agent Builder are self-contained pipelines that OpenClaw dispatches but does not orchestrate internally.

## Component Diagram

```mermaid
graph TB
    subgraph "Frontend — React 18 + Vite"
        VAB[VAB Canvas<br/>React Flow]
        Store[Zustand Store<br/>useStore.ts]
        LP[Library Panel<br/>Inventory Tree]
        PP[Properties Panel<br/>react-hook-form]
        CW[Configure Wizard<br/>3-Phase AI Config]
        TP[Terminal Panel<br/>Streaming Logs]
        Chat[Chat Panel<br/>Router Interface]
        DM[Deploy Modal<br/>Trigger Config]
    end

    subgraph "Backend — Express + Socket.io"
        API[REST API<br/>Express Routes]
        SIO[Socket.io Server<br/>Real-time Events]
        OB[Orchestrator Bridge<br/>Workflow → Execution]
        CA[Config Analyzer<br/>AI Gap Analysis]
        DB_BRIDGE[Deploy Bridge<br/>Atomic Deploys]
        REG[Registry Service<br/>PostgreSQL CRUD]
        RT[Runtime Service<br/>Claude API Streaming]
    end

    subgraph "AI Agents"
        SUP[Supervisor<br/>Gemini Flash]
        ARCH[Architect<br/>Claude Opus]
        BUILD[Builder<br/>Claude Sonnet]
        FIX[Fixer Agent<br/>Config Remediation]
    end

    subgraph "Operator Agents"
        SM[System Monitor<br/>5-min cron]
        QA[QA Remediation<br/>on QA FAIL]
        OPT[Optimization<br/>Weekly cron]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>deployments<br/>execution_logs<br/>operator_actions)]
        REDIS[(Redis<br/>Pub/Sub + Sessions)]
    end

    subgraph "OpenClaw Runtime"
        GW[Gateway]
        RA[Router Agent]
        SL[Systems Library]
        MC[Messaging Channels<br/>WhatsApp, Telegram,<br/>Slack, Discord]
        PM2[PM2 Process Manager]
    end

    VAB <--> Store
    LP -->|drag-drop| VAB
    Store --> PP
    PP -->|updateNodeData| Store
    Store --> CW
    Store --> DM

    LP -->|GET /api/inventory| API
    CW -->|POST /api/configure/*| API
    DM -->|POST /api/deploy| API
    Chat -->|POST /api/chat| API

    TP <-->|execution:log, agentResult| SIO
    Chat <-->|session:message| SIO

    API --> CA
    API --> DB_BRIDGE
    API --> REG
    SIO --> OB
    OB --> RT

    SUP --> ARCH
    ARCH --> BUILD
    SIO --> SUP
    SIO --> FIX

    DB_BRIDGE --> REG
    DB_BRIDGE --> PM2
    REG --> PG

    SM --> PG
    QA --> PG
    OPT --> PG

    SM --> PM2
    GW --> RA
    RA --> SL
    MC --> GW
    PM2 --> SL
```

## Folder Structure

```
autopilate/
├── src/                            # React frontend (Vite + TypeScript)
│   ├── App.tsx                     # Root layout: 3-panel + terminal + chat
│   ├── main.tsx                    # React 18 entry point
│   ├── store/
│   │   └── useStore.ts             # Zustand store — single source of truth for canvas
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── Canvas.tsx          # React Flow wrapper, drag-drop, edge selection
│   │   │   ├── Toolbar.tsx         # Export, run, deploy, save/load buttons
│   │   │   ├── Nodes/             # CustomNode, DepartmentNode, AgentPoolNode, MCPServerNode
│   │   │   ├── Edges/             # DataEdge, ControlEdge, EventEdge, DelegationEdge, etc.
│   │   │   └── EdgeTypeSelector.tsx # Popup to choose edge type on new connection
│   │   ├── Library/
│   │   │   ├── LibraryPanel.tsx    # File tree with search, category tabs, add mode
│   │   │   ├── BucketView.tsx      # Capability bucket filtering
│   │   │   ├── SystemsDashboard.tsx # Gallery of deployed systems
│   │   │   └── SystemDetail.tsx    # Full system inspection view
│   │   ├── Properties/
│   │   │   ├── PropertiesPanel.tsx # Node/edge configuration panel
│   │   │   ├── DynamicForm.tsx     # Auto-sync form engine (react-hook-form)
│   │   │   ├── EdgeInspector.tsx   # Edge type inspector
│   │   │   ├── Schemas/           # Per-node-type configuration schemas
│   │   │   └── Fields/            # Reusable form field components (11 types)
│   │   ├── ConfigureWizard/
│   │   │   ├── ConfigureWizardModal.tsx  # 3-phase orchestrator
│   │   │   ├── WorkflowScanView.tsx      # Phase 1: topology scan
│   │   │   ├── NodeConfigView.tsx        # Phase 2: per-node suggestions
│   │   │   └── SummaryView.tsx           # Phase 3: review + apply
│   │   ├── Terminal/
│   │   │   ├── TerminalPanel.tsx   # Floating resizable log window
│   │   │   ├── AgentOutputBlock.tsx
│   │   │   └── ExecutionResultsPanel.tsx
│   │   ├── Chat/                   # AI chat interface (floating panel)
│   │   └── Deploy/
│   │       ├── DeployModal.tsx     # Deployment wizard
│   │       └── TriggerConfigFields.tsx
│   ├── services/
│   │   ├── api.ts                  # REST API client (inventory, deployments)
│   │   └── configureApi.ts         # Configure wizard API client
│   ├── hooks/
│   │   ├── useSocket.ts            # Socket.io client + event handlers
│   │   └── useHeadlessSession.ts   # Headless chat session wrapper
│   ├── types/
│   │   ├── core.ts                 # Node types, edge types, agent roles, configs
│   │   ├── config.ts               # WorkflowConfig, ModelProvider, defaults
│   │   ├── export.ts               # ExportFile, ExportResult, ValidationResult
│   │   └── system.ts               # DeploymentRecord, ExecutionLog
│   ├── export/
│   │   ├── bundle-generator.ts     # generateSystemBundle() — main export entry
│   │   ├── types.ts                # SystemBundle, SystemManifest, PM2 types
│   │   └── generators/vab-native/  # CLAUDE.md + agent file generators
│   ├── features/export-import/     # JSON workflow save/load
│   ├── utils/                      # Export helpers, role manager, migrations
│   ├── config/
│   │   └── edgeConfig.ts           # Edge type styling (colors, strokes, animation)
│   └── constants/                  # Taxonomy, buckets, subcategories
│
├── server/                         # Express + Socket.io backend
│   ├── src/
│   │   ├── index.ts                # Server entry: middleware, routes, Socket.io
│   │   └── middleware/
│   │       ├── auth.ts             # API key auth (timing-safe)
│   │       ├── rate-limiter.ts     # Sliding window (100/min global, 10/min AI)
│   │       ├── webhook-verify.ts   # HMAC-SHA256 signature verification
│   │       ├── validation.ts       # Zod schema validation
│   │       └── error-handler.ts    # Centralized error formatting
│   ├── routes/
│   │   ├── systems.ts              # CRUD for deployment registry
│   │   ├── deploy.ts               # Full deploy pipeline endpoint
│   │   └── operators.ts            # Operator action management + approvals
│   ├── services/
│   │   ├── deploy-bridge.ts        # Atomic deploy: canvas → OpenClaw
│   │   ├── registry.ts             # PostgreSQL CRUD + secret encryption
│   │   ├── pm2-manager.ts          # PM2 process lifecycle + status polling
│   │   ├── trigger-factory.ts      # Cron/webhook/messaging/daemon configs
│   │   ├── router-agent.ts         # Message classification + input gathering
│   │   ├── system-monitor.ts       # 5-min health check operator
│   │   ├── qa-remediation.ts       # QA failure remediation operator
│   │   ├── optimization-agent.ts   # Weekly optimization operator
│   │   ├── orchestrator-bridge.ts  # Canvas → ParsedWorkflow → execution
│   │   ├── runtime.ts              # Agent execution via Claude API
│   │   ├── configuration-analyzer.ts # AI-powered config gap analysis
│   │   ├── session-store.ts        # File-backed session persistence
│   │   ├── log-stream.ts           # WebSocket log streaming
│   │   └── inventory/              # Component scanner, parser, search, cache
│   ├── agents/
│   │   ├── supervisor.ts           # Intent routing (Gemini Flash)
│   │   ├── architect.ts            # Plan generation (Claude Opus)
│   │   └── builder.ts              # Plan execution via MCP tools (Claude Sonnet)
│   ├── socket/
│   │   ├── handlers.ts             # All Socket.io event handlers
│   │   └── emitter.ts              # Typed event emitters
│   ├── mcp/
│   │   ├── canvas/                 # Canvas MCP: create/connect/update/delete nodes
│   │   └── sandbox-mcp.ts          # Sandbox MCP: file operations
│   ├── lib/
│   │   ├── anthropic-client.ts     # Multi-workspace failover (Primary → Backup → Emergency)
│   │   ├── crypto.ts               # AES-256-GCM encryption
│   │   └── errors.ts               # Typed error hierarchy
│   ├── types/                      # Server-specific types (execution-plan, session, registry)
│   ├── migrations/                 # PostgreSQL migration files
│   ├── tests/                      # Vitest tests (deploy, router, operators, integration)
│   └── db.ts                       # PostgreSQL pool + migration runner
│
├── shared/                         # Shared types (zero imports from src/ or server/)
│   ├── socket-events.ts            # Socket.io event type definitions
│   ├── configure-types.ts          # Configure wizard types
│   └── subcategories.ts            # Category taxonomy (40+ subcategories)
│
├── docs/                           # Documentation
├── CLAUDE.md                       # Agent instructions + coding conventions
├── vite.config.ts                  # Vite config (path alias @/ → src/)
├── vitest.config.ts                # Frontend test config (jsdom)
└── tailwind.config.js              # Tailwind content scanning
```

## Data Flow: Design → Deploy → Execute → Monitor

```mermaid
sequenceDiagram
    participant User
    participant VAB as VAB Canvas
    participant Store as Zustand Store
    participant Export as Bundle Generator
    participant API as Express API
    participant Deploy as Deploy Bridge
    participant PG as PostgreSQL
    participant PM2 as PM2
    participant OC as OpenClaw
    participant Monitor as System Monitor

    Note over User,VAB: 1. DESIGN
    User->>VAB: Drag components from Library
    VAB->>Store: addNode(), onConnect()
    User->>VAB: Configure agents in Properties Panel
    Store->>Store: updateNodeData() via react-hook-form

    Note over User,Export: 2. EXPORT
    User->>VAB: Click "Export System Bundle"
    VAB->>Export: generateSystemBundle(nodes, edges, config)
    Export-->>VAB: SystemBundle (manifest, agents, MCPs, PM2 config)

    Note over VAB,PM2: 3. DEPLOY
    User->>VAB: Click "Deploy" in DeployModal
    VAB->>API: POST /api/deploy (SystemBundle)
    API->>Deploy: deploySystem(bundle, openclawRoot)
    Deploy->>Deploy: Write agent CLAUDE.md files
    Deploy->>Deploy: Write MCP server configs
    Deploy->>Deploy: Create trigger config (cron/webhook/messaging)
    Deploy->>PG: INSERT INTO deployments
    Deploy->>PM2: startProcess(autopilate-{slug})
    Deploy-->>API: DeploymentRecord
    API-->>VAB: 201 Created

    Note over OC,PM2: 4. EXECUTE
    OC->>PM2: Trigger via cron/webhook/message
    PM2->>PM2: Run system pipeline
    PM2-->>PG: INSERT INTO execution_logs

    Note over Monitor,PG: 5. MONITOR
    Monitor->>PM2: Check process health (every 5 min)
    Monitor->>PG: Fetch recent errors
    Monitor->>Monitor: Diagnose via LLM
    Monitor->>PM2: Auto-restart if safe
    Monitor->>PG: Log operator_action
```

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Lightweight, selector-based, avoids re-render storms with React Flow |
| Canvas rendering | React Flow v11 | Mature node graph library with drag-drop, minimap, controls |
| Real-time comms | Socket.io | Bidirectional events for execution streaming, canvas sync |
| Server framework | Express | Simple, widely supported, paired with Socket.io |
| Database | PostgreSQL + jsonb | Relational structure for registries, flexible jsonb for configs |
| Process management | PM2 | Production Node.js process manager with monitoring, restart |
| AI failover | Multi-workspace | Primary → Backup workspace → Emergency model per role |
| Deployment | Atomic rollback | If any deploy step fails, all artifacts are cleaned up |
| Session persistence | File-backed JSON | Survives restarts, debounced writes, atomic rename |
| Form management | react-hook-form | Subscription-based updates with auto-sync to Zustand |

## Security Layers

1. **API Key Auth** — `X-API-Key` header with timing-safe comparison
2. **Rate Limiting** — Sliding window: 100 req/min global, 10 req/min for AI endpoints
3. **Webhook Verification** — HMAC-SHA256 signature validation
4. **Secret Encryption** — AES-256-GCM for deployment secrets at rest
5. **Path Traversal Protection** — Null byte rejection + path normalization + sandboxing
6. **Security Headers** — Helmet middleware
7. **CORS Locking** — Configurable origin allowlist
8. **Input Validation** — Zod schemas on all request bodies and query parameters
