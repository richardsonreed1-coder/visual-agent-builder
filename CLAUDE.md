# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

AUTOPILATE is an AI agent design and orchestration platform. It provides a visual builder (VAB) for designing multi-agent systems, an AI-powered configuration pipeline, and a deploy bridge that packages systems for execution on the OpenClaw runtime.

The platform separates design-time intelligence (VAB + Configure Wizard + Fixer Agent) from runtime execution (OpenClaw Gateway + self-contained system pipelines). Systems designed in VAB are independent, self-contained pipelines — OpenClaw dispatches and triggers them but does not orchestrate their internals.

## Essential Commands

```bash
# Frontend (React + Vite)
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
```

Both frontend and backend must run simultaneously — frontend fetches inventory from `http://localhost:3001/api` and connects via Socket.io for real-time execution.

## Architecture

### Core Concepts

**System**: A self-contained multi-agent pipeline designed in VAB. Each system has an entry point, agent configs, MCP tool connections, and a trigger definition (cron, webhook, or on-demand). Systems run independently as PM2 processes.

**OpenClaw**: Open-source AI agent runtime (github.com/openclaw/openclaw). Provides gateway, messaging channels (WhatsApp, Telegram, Slack, Discord), cron service, browser automation, and daemon management. AUTOPILATE git-clones OpenClaw and uses it as the runtime layer.

**Router Agent**: Sits between OpenClaw messaging channels and the Systems Library. Classifies incoming requests, matches to deployed systems, gathers required inputs via follow-up questions, and triggers execution.

**Operator Agents**: Self-healing layer — System Monitor (cron: every 5 min), QA Remediation Agent (event: on QA FAIL), Optimization Agent (cron: weekly). These are themselves AUTOPILATE systems running on OpenClaw.

### Frontend (`src/`)

**State Management**: Zustand store (`src/store/useStore.ts`) manages nodes, edges, selectedNode, libraryCategory, addToAgentMode, and workflowConfig.

**Layout**: Three-panel design in `App.tsx` — LibraryPanel (left), Canvas (center), PropertiesPanel (right) — plus bottom TerminalPanel and modal-based ConfigureWizard.

**Data Flow**:
1. LibraryPanel fetches inventory tree via TanStack Query from `/api/inventory`
2. Drag events set `application/reactflow` data with node type, label, and filepath
3. Canvas drop handler fetches component content via `/api/component-content`, creates nodes
4. Node selection updates selectedNode → PropertiesPanel renders config form
5. react-hook-form with auto-sync updates node config via `updateNodeData()`
6. "Add mode" in library panel allows clicking to attach skills/MCPs/commands to agents

**Node Types**: Defined in `src/types/core.ts` — AGENT, SKILL, PLUGIN, TOOL, PROVIDER, HOOK, COMMAND, REASONING.

**Key Components**:
- `src/components/Editor/Canvas.tsx` — React Flow wrapper with drop handling
- `src/components/Editor/Toolbar.tsx` — Export, run, save/load, configure buttons
- `src/components/Editor/Nodes/CustomNode.tsx` — Visual node rendering with type-based colors
- `src/components/Library/LibraryPanel.tsx` — File tree with search, category tabs, add mode
- `src/components/Properties/PropertiesPanel.tsx` — Full agent configuration UI
- `src/components/ConfigureWizard/` — 3-phase AI-powered config analysis and suggestion
- `src/components/Terminal/TerminalPanel.tsx` — Streaming execution output

**Export System** (`src/utils/export/`):
- `generators/vab-native/` — AUTOPILATE System Bundle (CLAUDE.md + agent files + MCP configs + settings)
- `src/utils/export.ts` — JSON workflow export (save/load)
- `src/utils/generateClaudeMdExecutable.ts` — Executable CLAUDE.md with inferred execution phases

### Backend (`server/`)

Express + Socket.io server:

**REST API**:
- `GET /api/inventory` — Scans configured directories, returns hierarchical file tree with inferred categories
- `GET /api/component-content?path=<filepath>` — Returns component file content

**Socket Events** (real-time):
- `system:start` / `system:stop` — Workflow execution lifecycle
- `fixer:launch` — Launch Fixer Agent (Claude Code CLI or Anthropic API fallback)
- `fixer:apply-patches` — Apply fixes back to node configs in store
- `execution:log`, `execution:step-start`, `agent:result`, `execution:report` — Streaming output

**Key Services**:
- `server/services/orchestrator-bridge.ts` — Converts canvas state to ParsedWorkflow to ExecutionPlan
- `server/services/runtime.ts` — Agent execution via Claude API with streaming
- `server/services/session-store.ts` — File-backed session persistence
- `server/services/configuration-analyzer.ts` — AI-powered config gap analysis

### Shared (`shared/`)

- `shared/socket-events.ts` — Socket event type definitions shared between frontend and backend

## Key Libraries

- **React Flow** (`reactflow`) — Canvas rendering, node connections, drag-drop
- **Zustand** — Lightweight state management
- **TanStack Query** — Server state and caching
- **react-hook-form** — Form state with subscription-based updates
- **Socket.io** — Real-time bidirectional communication
- **Tailwind CSS** — Styling
- **Lucide React** — Icons
- **Axios** — HTTP client

## Path Alias

`@/` maps to `src/` via Vite config for cleaner imports.

## Configuration

To point the inventory scanner at your component directories, edit `server/services/inventory.ts`:
1. Update `INVENTORY_ROOT` to your base directory
2. Modify `REPO_CONFIGS` to match your folder structure
