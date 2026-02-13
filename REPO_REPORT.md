# Visual Agent Builder - Comprehensive Repository Report

**Generated:** 2026-02-03
**Branch:** `main` (linear history, no branches)
**Total Commits:** 10
**Version:** 0.0.0 (pre-release)

---

## 1. Project Summary

Visual Agent Builder is a React-based drag-and-drop interface for designing AI agent workflows. Users drag component nodes (agents, skills, tools, plugins, commands, hooks) from a library panel onto a canvas, connect them with typed edges, configure properties, and export workflows to multiple frameworks (Claude Code, LangGraph, CrewAI, AutoGen).

The project consists of a **Vite + React frontend** and an **Express + Socket.io backend** that work together to provide real-time AI-powered workflow building with a three-agent orchestration pipeline (Supervisor, Architect, Builder).

---

## 2. Architecture Overview

### Frontend (React + Vite + TypeScript)

```
src/
├── components/
│   ├── Editor/           # Canvas, toolbar, nodes, edges
│   ├── Library/          # Component browser, search, buckets
│   ├── Properties/       # Node/edge configuration panel
│   ├── Chat/             # AI assistant chat panel
│   ├── Terminal/         # Runtime execution output
│   ├── ConfigModal.tsx   # Workflow-level settings
│   └── StatusPanel.tsx   # Footer status bar
├── store/useStore.ts     # Zustand state management (267 lines)
├── hooks/                # useHeadlessSession, useSocket
├── services/api.ts       # HTTP/fetch clients
├── types/core.ts         # Core type definitions (728 lines)
├── config/edgeConfig.ts  # Centralized edge styling (NEW)
├── utils/
│   ├── export.ts         # Main export logic (184 lines)
│   └── export/           # Multi-framework generators
│       ├── generators/   # vab-native, langgraph, crewai, autogen
│       └── skill-schemas/# AgentSkills.io, simple
└── constants/            # Buckets, subcategories, taxonomy
```

### Backend (Express + Socket.io + TypeScript)

```
server/
├── src/index.ts          # Express server (port 3001)
├── services/
│   ├── inventory.ts      # Filesystem scanner + search index
│   ├── bucketInference.ts# Capability classification
│   └── runtime.ts        # Execution simulation (NEW)
├── agents/
│   ├── supervisor.ts     # Intent routing (Gemini 2.0 Flash)
│   ├── architect.ts      # Plan generation (Claude)
│   └── builder.ts        # Step execution (Claude)
├── mcp/
│   ├── canvas-mcp.ts     # Canvas state MCP server
│   └── sandbox-mcp.ts    # Sandboxed environment
├── socket/handlers.ts    # Socket.io event handlers
└── sandbox/              # Demo/sample data
```

### Three-Panel Layout

| Panel | Component | Purpose |
|-------|-----------|---------|
| Left | `LibraryPanel` | Browse/search components, drag onto canvas |
| Center | `Canvas` | React Flow graph editor with typed edges |
| Right | `PropertiesPanel` | Configure selected node/edge properties |
| Floating | `ChatPanel` | AI assistant for natural language building |
| Floating | `TerminalPanel` | Runtime execution logs |

---

## 3. Key Technologies

### Frontend
- **React 18** + **TypeScript** - UI framework
- **React Flow 11** - Graph/canvas visualization
- **Zustand 4** - Lightweight state management
- **TanStack Query 5** - Server state + caching
- **react-hook-form 7** - Form handling with subscriptions
- **Tailwind CSS 3** - Utility-first styling
- **Socket.io Client 4** - Real-time communication
- **JSZip** - ZIP export generation
- **Lucide React** - Icon library

### Backend
- **Express 4** - HTTP server
- **Socket.io 4** - WebSocket server
- **Anthropic SDK** - Claude API (Architect + Builder agents)
- **Google Generative AI** - Gemini 2.0 (Supervisor intent routing)
- **MCP SDK** - Model Context Protocol integration
- **Chokidar 5** - Filesystem watching
- **SQLite3 + Sequelize** - Local persistence

---

## 4. Core Type System

### Node Types (11 total)
```
AGENT | SKILL | PLUGIN | TOOL | PROVIDER | HOOK | COMMAND | REASONING
DEPARTMENT | AGENT_POOL | MCP_SERVER
```

### Edge Types (6 total)
```
data (blue)       - Data flow between nodes
control (green)   - Control flow / sequencing
event (purple)    - Event-driven triggers
delegation (orange) - Task delegation
failover (red)    - Failure recovery paths
default (gray)    - Untyped connections
```

### Agent Roles (11 total, 4 categories)
- **Independent:** solo
- **Team:** specialist, member, executor, critic
- **Coordinator:** leader, orchestrator, router
- **Continuous:** auditor, monitor, planner

### Export Frameworks
1. **VAB-Native** - Claude Code format (settings.json + YAML agents)
2. **LangGraph** - Python state graph (TypedDict/Pydantic)
3. **CrewAI** - Role-based Python agents
4. **AutoGen** - Microsoft group chat agents

---

## 5. Commit History (Full)

| # | Hash | Date | Description |
|---|------|------|-------------|
| 1 | `5d6ad87` | - | Initial commit: Visual Agent Builder v1.0.0 |
| 2 | `a291ba9` | - | UX/UI redesign with modern styling and workflow config |
| 3 | `d9ef1e5` | - | Implement remaining config fields and locked field system |
| 4 | `6fc4181` | - | Add capability-based bucket organization with subcategories |
| 5 | `7c4cb11` | - | Implement headless controller with three-agent hierarchy |
| 6 | `2679e27` | Feb 1 | Fix: node type normalization and proper component rendering |
| 7 | `ea42d6e` | Feb 2 | Phase 5: UX polish - smart sizing, agent defaults, smoothstep edges |
| 8 | `f109aa5` | Feb 2 | Phase 5.1: Visual tuning - ghost config, edge colors, grid layout |
| 9 | `67bc89d` | Feb 2 | Phase 6: Interaction & runtime - clickable edges, terminal panel |
| 10 | `ae2e716` | Feb 2 | Phase 6.2: Final polish - solid lines, z-index, edge interaction |

---

## 6. Recent Changes (Last 5 Commits - Detailed)

### Phase 4 Fix: `2679e27` - Node Type Normalization (Feb 1)

**Problem:** AI-created nodes had mismatched types causing "No schema" errors and broken container rendering.

**Changes (4 files, +143 / -26 lines):**
- `server/mcp/canvas-mcp.ts` - Added `normalizeNodeType()` to convert lowercase → UPPERCASE types
- `src/hooks/useHeadlessSession.ts` - Use dynamic `componentType` instead of hardcoded `'custom'`
- `server/agents/architect.ts` - Updated system prompt guidelines
- `server/lib/anthropic-client.ts` - Corrected model IDs (`opus-4-5-20251101`, `sonnet-4-5-20250929`)

**Impact:** Fixed compatibility between AI agent output and frontend rendering pipeline.

---

### Phase 5: `ea42d6e` - UX Polish (Feb 2, 12:24)

**Theme:** Make the canvas look professional and agents immediately runnable.

**Changes:**
- Smart container sizing: Department (1800x1000px), Agent Pool (500x800px)
- Inject `AGENT_DEFAULTS` (provider: anthropic, model: sonnet-4, temperature: 0.7, role: specialist) on node creation
- Switched to `smoothstep` edge type for clean 90-degree routing
- Robust config extraction handling nested or flat payload data
- Updated Architect prompt: require capability connections, no orphan nodes
- Replaced `useReactFlow()` with Zustand store methods for context compatibility

---

### Phase 5.1: `f109aa5` - Visual Tuning (Feb 2, 14:48)

**Theme:** Fix visual bugs and add semantic meaning to edges.

**Changes:**
- **Ghost Config Fix:** Empty strings no longer overwrite agent defaults during creation
- **Semantic Edge Colors:** delegation=orange, data=blue, control=green, event=purple (via `EDGE_STYLES` in BaseEdge)
- **Container Sizing:** Increased to Department (2200x1200), Agent Pool (850x700)
- **Grid Layout:** 3-column layout for agents in pools, horizontal for pools in departments
- **Architect Guidelines:** Added rules #8 (connect to people) and #9 (semantic edge types)

---

### Phase 6: `67bc89d` - Interaction & Runtime (Feb 2, 19:11)

**Theme:** Make the workflow interactive and executable.

**New Files (3):**
- `src/components/Terminal/TerminalPanel.tsx` (228 lines) - Run/Stop/Clear runtime panel
- `src/components/Terminal/index.ts` - Barrel export
- `server/services/runtime.ts` (204 lines) - System validation and execution simulation

**Changes (14 files, +791 / -48 lines):**
- Edge type made REQUIRED in `canvas_connect_nodes` MCP tool
- Edge click handler + selection state in Canvas
- `system:start` / `system:stop` socket events
- `useSocket` hook now exposes raw socket for direct emission
- `interactionWidth: 20` for easier edge clicking (20px hit area)
- Canvas MCP expanded with validation tools

---

### Phase 6.2: `ae2e716` - Final Polish (Feb 2, 19:49)

**Theme:** Fix remaining visual artifacts and add auto-generated content.

**Key Fixes:**
- **Phantom Dashed Lines:** Added explicit `strokeDasharray: 'none'` for solid edge types
- **Edge Interaction:** Added `focusable`, `interactionWidth: 20`, `cursor: 'pointer'` props
- **Container Z-Index:** Containers now use `zIndex: -1` + `pointerEvents: 'none'` so clicks pass through to children
- **Auto System Prompts:** `generateDefaultSystemPrompt()` creates context-aware prompts for new agents
- **Department Height:** Reduced from 1200px to 900px to prevent overlap
- **TypeScript Fixes:** Proper config typing, removed unused imports
- **React Flow Fix:** Use `elementsSelectable` instead of deprecated `edgesSelectable`

---

## 7. Uncommitted Changes (Working Directory)

There are **12 modified files** and **2 new untracked files** not yet committed:

### Modified Files

| File | Change Summary |
|------|---------------|
| `server/mcp/canvas-mcp.ts` | +6/-1 - Minor MCP server updates |
| `server/socket/handlers.ts` | +22/-1 - Additional socket event handlers |
| `src/components/Editor/Canvas.tsx` | +56/-25 - Canvas interaction improvements |
| `src/components/Editor/EdgeTypeSelector.tsx` | +3/-1 - Edge type selector tweaks |
| `src/components/Editor/Edges/BaseEdge.tsx` | +38 removed lines - Simplified edge rendering |
| `src/components/Editor/Edges/index.ts` | +1 - Added DefaultEdge export |
| `src/components/Editor/Nodes/GroupNode.tsx` | +7/-1 - Group node styling updates |
| `src/components/Properties/PropertiesPanel.tsx` | +131/-1 - Major properties panel expansion |
| `src/hooks/useHeadlessSession.ts` | +49 removed / simplified - Headless session refactor |
| `src/store/useStore.ts` | +39/-1 - New store actions/state |
| `src/types/core.ts` | +11/-1 - New type definitions |
| `src/utils/export.ts` | +5/-1 - Export utility updates |

**Total uncommitted:** +264 / -104 lines across 12 files

### New Untracked Files

| File | Purpose |
|------|---------|
| `src/components/Editor/Edges/DefaultEdge.tsx` | New default edge component (196 bytes) |
| `src/config/edgeConfig.ts` | Centralized edge styling configuration (2,215 bytes) |

The uncommitted changes appear to be the beginning of a **Phase 7** that extracts edge configuration into a centralized config file (`src/config/edgeConfig.ts`), adds a `DefaultEdge` component, expands the properties panel significantly (+131 lines), and adds new store actions.

---

## 8. Development Phases Summary

| Phase | Commits | Focus |
|-------|---------|-------|
| **v1.0** | `5d6ad87` | Initial scaffold - React Flow canvas, library panel, properties panel |
| **Phase 2** | `a291ba9` | UX/UI redesign - Modern styling, workflow configuration modal |
| **Phase 3** | `d9ef1e5` | Configuration completeness - All form fields, locked field system |
| **Phase 4** | `6fc4181` - `2679e27` | Backend intelligence - Bucket organization, headless 3-agent controller, type normalization fixes |
| **Phase 5** | `ea42d6e` - `f109aa5` | Visual polish - Smart sizing, agent defaults, semantic edge colors, grid layout |
| **Phase 6** | `67bc89d` - `ae2e716` | Interaction & runtime - Clickable edges, terminal panel, execution simulation, auto system prompts |
| **Phase 7** | *(uncommitted)* | Edge config extraction, default edge component, properties panel expansion |

---

## 9. File Statistics

| Category | Files | Lines (approx) |
|----------|-------|----------------|
| Frontend Components | ~30 TSX | ~8,000 |
| Frontend Logic | ~15 TS | ~4,000 |
| Type Definitions | 3 TS | ~1,000 |
| Backend Services | ~8 TS | ~2,500 |
| Backend Agents | 3 TS | ~750 |
| Backend MCP/Socket | 4 TS | ~600 |
| Tests | 3 TS | ~300 |
| Config Files | 7 | ~200 |
| **Total** | **~73** | **~17,350** |

### Key Files by Size
- `src/types/core.ts` - 728 lines (type system)
- `src/components/Editor/Canvas.tsx` - 370 lines (canvas logic)
- `src/components/Properties/PropertiesPanel.tsx` - 304 lines (config panel)
- `src/store/useStore.ts` - 267 lines (state management)
- `src/utils/export.ts` - 184 lines (export generation)

---

## 10. Socket.io Event Protocol

### Session States
```
idle → routing → planning → executing → paused → completed → error
```

### Server → Client Events
- `session:stateChange` - Session lifecycle updates
- `session:message` - AI responses
- `node:created` / `edge:created` - Canvas mutations from AI
- `execution:stepStart` / `execution:stepComplete` - Runtime progress
- `execution:log` - Runtime output logs
- `error` - Error payloads

### Client → Server Events
- `session:start` - Create new AI session
- `session:message` - Send user message to AI
- `canvas:sync` - Sync canvas state to server
- `system:start` / `system:stop` - Control runtime execution

---

## 11. AI Agent Pipeline

```
User Message
    │
    ▼
┌──────────────┐
│  Supervisor   │  Gemini 2.0 Flash (fast intent classification)
│  (Router)     │  → BUILD | EDIT | QUERY | EXPORT | CONFIGURE
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Architect    │  Claude (plan generation)
│  (Planner)    │  → Execution plan with steps + dependencies
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Builder      │  Claude (step execution via Canvas MCP)
│  (Executor)   │  → Creates nodes, edges, configures properties
└──────────────┘
       │
       ▼
  Canvas Updates (via Socket.io)
```

---

## 12. Running the Project

```bash
# Terminal 1 - Backend
cd server && npm install && npm run dev    # Express on :3001

# Terminal 2 - Frontend
npm install && npm run dev                  # Vite on :5173
```

**Environment Variables** (server/.env):
```
GOOGLE_API_KEY=...      # Gemini 2.0 for Supervisor
ANTHROPIC_API_KEY=...   # Claude for Architect + Builder
INVENTORY_ROOT=...      # Path to component directories
```

---

*Report generated from repository at `/Users/reedrichardson/Desktop/claude-code-templates-main copy/visual-agent-builder`*
