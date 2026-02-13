# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Visual Agent Builder is a React-based drag-and-drop interface for designing AI agent workflows. Users drag component nodes (agents, skills, tools, plugins, commands, hooks) from a library panel onto a canvas, connect them with edges, configure properties (model, tools, permissions, skills, MCPs), and export the workflow as JSON or Markdown with YAML frontmatter.

## Essential Commands

```bash
# Frontend (React + Vite)
npm install                    # Install frontend dependencies
npm run dev                    # Start Vite dev server (default: localhost:5173)
npm run build                  # TypeScript compile + Vite build
npm run lint                   # ESLint with zero warnings policy

# Backend (Express)
cd server && npm install       # Install server dependencies
cd server && npm run dev       # Start with nodemon (localhost:3001)
cd server && npm start         # Production start with ts-node
```

Both frontend and backend must run simultaneously - frontend fetches inventory from `http://localhost:3001/api`.

## Architecture

### Frontend (`src/`)

**State Management**: Zustand store (`src/store/useStore.ts`) manages:
- `nodes` / `edges` - React Flow graph state
- `selectedNode` - Currently selected node for properties panel
- `libraryCategory` - Active category tab (agents, commands, skills, etc.)
- `addToAgentMode` - When true, library panel shows "add to agent" mode for skills/mcps/commands

**Layout**: Three-panel design in `App.tsx`:
- `LibraryPanel` (left) - File tree browser with drag-to-canvas, supports "add mode" for attaching skills/mcps to agents
- `Canvas` (center) - React Flow canvas with drag-drop, selection, connections, includes `Toolbar` for export/clear
- `PropertiesPanel` (right) - Comprehensive form for agent configuration (model, tools, permissions, skills, MCPs)

**Data Flow**:
1. `LibraryPanel` fetches inventory tree via TanStack Query from `/api/inventory`
2. Drag events set `application/reactflow` data with node type, label, and filepath
3. `Canvas` drop handler fetches component content via `/api/component-content`, creates nodes via `useStore.addNode()`
4. Node selection updates `selectedNode` in store
5. `PropertiesPanel` uses react-hook-form with auto-sync to update node config via `updateNodeData()`
6. "Add mode" in library panel allows clicking to add skills/mcps/commands to selected agent

**Node Types**: Defined in `src/types/core.ts` - AGENT, SKILL, PLUGIN, TOOL, PROVIDER, HOOK, COMMAND, REASONING.

**Key Components**:
- `src/components/Editor/Canvas.tsx` - React Flow wrapper with drop handling
- `src/components/Editor/Toolbar.tsx` - Export (JSON/MD) and clear canvas buttons
- `src/components/Editor/Nodes/CustomNode.tsx` - Visual node rendering with type-based colors
- `src/components/Library/LibraryPanel.tsx` - File tree with search, category tabs, add mode
- `src/components/Library/BundleCard.tsx` - Special card for plugin bundles (drag all components at once)
- `src/components/Properties/PropertiesPanel.tsx` - Full agent configuration UI (1400+ lines)

**Export**: `src/utils/export.ts` generates:
- `generateWorkflowJson()` - Full workflow JSON with nodes and edges
- `generateClaudeConfig()` - YAML frontmatter markdown for single agents, or multi-agent documentation
- `downloadFile()` - Browser download helper

### Backend (`server/`)

Express server with two endpoints:

- `GET /api/inventory` - Recursively scans configured directories (multiple repos) and returns hierarchical file tree with inferred categories (AGENT, SKILL, TOOL, etc.) based on path patterns. Supports bundles from `claude-code-main/plugins/`.

- `GET /api/component-content?path=<filepath>` - Returns markdown/JSON content of a component file. Validates path is within `INVENTORY_ROOT` for security.

**Inventory Service** (`server/services/inventory.ts`):
- `INVENTORY_ROOT` constant defines the base path to scan (currently hardcoded)
- `REPO_CONFIGS` array defines which repos and paths to scan for components
- `scanPluginBundles()` scans `claude-code-main/plugins/` for bundled component sets
- Supports nested MCP structures via `NESTED_MCP_CONFIGS`

## Key Libraries

- **React Flow** (`reactflow`) - Canvas rendering, node connections, drag-drop
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state and caching
- **react-hook-form** - Form state with subscription-based updates
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client

## Path Alias

`@/` maps to `src/` via Vite config for cleaner imports.

## Configuration

To point the inventory scanner at your component directories, edit `server/services/inventory.ts`:
1. Update `INVENTORY_ROOT` to your base directory
2. Modify `REPO_CONFIGS` to match your folder structure

## Swarm Protocol
For multi-agent team orchestration, read SWARM_DEVTEAM.md in the project root.
