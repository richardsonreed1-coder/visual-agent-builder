# ARCHITECTURE REVIEW - Visual Agent Builder

**Reviewer:** Architecture Reviewer (Opus)
**Date:** February 13, 2026
**Scope:** Full codebase review of `shared/`, `src/`, and `server/` directories
**Role Constraint:** Read-only access to `src/` and `server/`; write access to `shared/` and `docs/` only

---

## 1. EXECUTIVE SUMMARY

The Visual Agent Builder codebase demonstrates solid foundational architecture with a clear
shared-type contract strategy (`shared/`), well-structured React Flow integration, and a
multi-agent orchestration pipeline (Supervisor -> Architect -> Builder). However, the review
identified **5 critical issues**, **8 high-priority issues**, and **12 medium-priority items**
across type safety, socket contract consistency, SOLID compliance, and code organization.

**Overall Architecture Health: 7/10**

| Area                        | Rating | Key Concern                                      |
|-----------------------------|--------|--------------------------------------------------|
| Shared Type Contracts       | 6/10   | Missing event, duplicate file, `any` leaks       |
| SOLID Compliance            | 6/10   | SRP violations in MCP/orchestrator, OCP in enrich|
| Separation of Concerns      | 7/10   | Good layering, but MCP files mix too many roles   |
| Type Safety                 | 5/10   | ~60+ `any` usages, `NodeConfig` index signature   |
| Error Handling              | 7/10   | Consistent try/catch, but inconsistent patterns   |
| Socket Event Contracts      | 6/10   | 1 missing event, 4 unnecessary `as any` casts     |
| State Management (Zustand)  | 8/10   | Good patterns, minor stale closure risks           |
| React Flow Integration      | 8/10   | Solid, well-commented phase history                |
| Code Organization           | 6/10   | 6 files over 500 lines, 1 duplicate file           |

---

## 2. SHARED TYPE CONTRACT ANALYSIS

### 2.1 Contract Files

| File | Lines | Consumers | Status |
|------|-------|-----------|--------|
| `shared/socket-events.ts` | 206 | 6 (3 server, 3 frontend) | Has gap |
| `shared/configure-types.ts` | 107 | 9 (2 server, 7 frontend) | Clean |
| `shared/subcategories.ts` | 255 | 2 (1 frontend re-export, 1 server via duplicate) | Has duplicate |

### 2.2 CRITICAL: Missing `canvas:update_edge` Event

**Location:** `shared/socket-events.ts` lines 169-189

The `ClientToServerEvents` interface defines 9 events. However, the server handler at
`server/socket/handlers.ts:350` registers a listener for `canvas:update_edge`:

```typescript
// server/socket/handlers.ts:350 — uses `as any` because event is NOT in contract
socket.on('canvas:update_edge' as any, async (payload: {
  edgeId: string;
  changes: { data?: Record<string, unknown> }
}) => { ... });
```

This event is **not declared** in `ClientToServerEvents`. The `as any` cast silences the
TypeScript compiler but breaks the type-safe contract that `shared/socket-events.ts` is
designed to provide.

**Fix required in `shared/socket-events.ts`:** Add to `ClientToServerEvents`:
```typescript
'canvas:update_edge': (payload: {
  edgeId: string;
  changes: { data?: Record<string, unknown> }
}) => void;
```

### 2.3 CRITICAL: Duplicate `subcategories.ts`

Two identical files exist:
- `shared/subcategories.ts` (255 lines) -- the canonical source
- `server/shared/subcategories.ts` (255 lines) -- byte-identical copy

The server file is consumed only by `server/services/bucketInference.ts` via import path
`../shared/subcategories`. The frontend file at `src/constants/subcategories.ts` correctly
re-exports from `../../shared/subcategories` (the canonical source).

**Drift risk:** If either copy is edited without updating the other, frontend and backend
will disagree on the subcategory taxonomy. This is a ticking time bomb.

**Fix:** Delete `server/shared/subcategories.ts` and update the import in
`server/services/bucketInference.ts` to point to `../../shared/subcategories`.

### 2.4 Unnecessary `as any` Casts on Valid Events

Four events in `server/socket/handlers.ts` use `as any` casts despite being properly
declared in `ClientToServerEvents`:

| Line | Event | In Contract? | Cast Needed? |
|------|-------|-------------|--------------|
| 231 | `system:start` | YES (line 183) | NO |
| 301 | `system:stop` | YES (line 184) | NO |
| 308 | `fixer:start` | YES (line 187) | NO |
| 343 | `fixer:stop` | YES (line 188) | NO |
| 350 | `canvas:update_edge` | **NO** | Yes (until added) |

The first four casts suggest the developer was unaware the events had been added to the
contract, or added the casts before updating the contract and never removed them.

**Fix:** Remove `as any` from lines 231, 301, 308, 343 after confirming the socket
instance is properly typed with `ClientToServerEvents`.

---

## 3. SOLID PRINCIPLES COMPLIANCE

### 3.1 Single Responsibility Principle (SRP) Violations

**`server/mcp/canvas-mcp.ts` (1,185 lines)** -- WORST OFFENDER

This file handles at least 7 distinct responsibilities:
1. Node CRUD operations (create, read, update, delete)
2. Edge CRUD operations
3. Canvas state management (in-memory Maps)
4. Layout persistence (disk I/O for layout.json)
5. Layout algorithms (grid, hierarchical, force-directed)
6. Type normalization (lowercase-hyphenated to UPPERCASE_UNDERSCORE)
7. Config enrichment (`enrichNodeConfig` with per-type defaults)

**Recommended split:**
- `canvas-state.ts` -- In-memory state management
- `canvas-node-tools.ts` -- Node CRUD MCP tools
- `canvas-edge-tools.ts` -- Edge CRUD MCP tools
- `canvas-layout.ts` -- Layout algorithms and persistence
- `node-config-enrichment.ts` -- Config defaults per node type

**`server/services/orchestrator-bridge.ts` (936 lines)** -- SECOND WORST

Mixes:
1. Workflow conversion (canvas nodes/edges to workflow format)
2. Execution plan building
3. Agent execution orchestration
4. Fixer agent logic
5. Cost calculation
6. Local type definitions that overlap with shared types

### 3.2 Open/Closed Principle (OCP) Violation

**`enrichNodeConfig()` in `server/mcp/canvas-mcp.ts`**

Uses a `switch` statement over node types to generate default configurations:

```typescript
switch (normalizedType) {
  case 'AGENT': return { provider: 'anthropic', model: '...', ... };
  case 'SKILL': return { ... };
  case 'TOOL': return { ... };
  // etc.
}
```

Adding a new node type requires modifying this function. The OCP-compliant approach would
be a registry pattern:

```typescript
const CONFIG_ENRICHERS: Record<string, (config: unknown) => unknown> = {
  AGENT: enrichAgentConfig,
  SKILL: enrichSkillConfig,
  // New types added here without modifying the enrichNodeConfig function
};
```

### 3.3 Dependency Inversion Principle (DIP) Violation

**`server/agents/supervisor.ts`** directly imports concrete implementations:

```typescript
import { Architect } from './architect';
import { Builder } from './builder';
```

The Supervisor should depend on abstractions (interfaces) rather than concrete agent
implementations. This makes it impossible to substitute alternative architect/builder
implementations for testing or different orchestration strategies.

### 3.4 Interface Segregation Principle (ISP) -- Adequate

The shared types are reasonably well-segregated. `ServerToClientEvents` and
`ClientToServerEvents` are separate interfaces. Payload types are individually defined
rather than using a single monolithic payload.

### 3.5 Liskov Substitution Principle (LSP) -- Not Applicable

No class hierarchies or inheritance patterns to evaluate.

---

## 4. SEPARATION OF CONCERNS

### 4.1 Good Patterns

- **Shared types as single source of truth:** `shared/socket-events.ts` imported by both
  frontend (`src/hooks/useSocket.ts`) and backend (`server/socket/handlers.ts`, `server/socket/emitter.ts`)
- **Frontend re-export pattern:** `src/constants/subcategories.ts` re-exports from
  `../../shared/subcategories` rather than duplicating
- **Zustand store slices:** `src/store/useStore.ts` organizes state into 5 logical groups
  (Canvas, Library, Config, UI, Wizard) with clear separation
- **Edge config centralization:** `src/config/edgeConfig.ts` provides `getEdgeParams()`
  used by both `useHeadlessSession.ts` and `Canvas.tsx`

### 4.2 Concern Violations

| Location | Violation | Impact |
|----------|-----------|--------|
| `canvas-mcp.ts` | State + I/O + tools + layout in one file | Cannot test tools independently |
| `orchestrator-bridge.ts` | Conversion + execution + cost in one file | Cannot swap cost model |
| `configuration-analyzer.ts` | Analysis + prompt templates + AI calling | Prompt changes require touching analysis logic |
| `handlers.ts` | Event registration + business logic inline | No unit testing of handler logic |

---

## 5. TYPE SAFETY ANALYSIS

### 5.1 `any` Usage Inventory

Total `any` occurrences found: approximately 60+ across the codebase.

**Frontend hotspots:**
| File | Count | Worst Offender |
|------|-------|----------------|
| `src/store/useStore.ts` | 3 | `updateNodeData(id, data: any)` line 95 |
| `src/hooks/useHeadlessSession.ts` | 2 | `(payload as any).style` lines 142, 144 |
| `src/components/Properties/PropertiesPanel.tsx` | ~10 | Form value handling |
| `src/components/Properties/schemas.ts` | ~8 | Schema default values |
| `src/utils/export.ts` | ~5 | Node data extraction |

**Backend hotspots:**
| File | Count | Worst Offender |
|------|-------|----------------|
| `server/socket/handlers.ts` | 12 | `socket.on('...' as any, async (payload: any)` |
| `server/agents/builder.ts` | 5 | `executeAction` return `data?: any` |
| `server/services/orchestrator-bridge.ts` | 8 | Local type casts |
| `server/mcp/canvas-mcp.ts` | 6 | Tool result handling |
| `server/mcp/sandbox-mcp.ts` | 4 | File operation results |

### 5.2 CRITICAL: `NodeConfig` Index Signature

**Location:** `src/types/core.ts` lines 33-35

```typescript
export interface NodeConfig {
  [key: string]: unknown;
}
```

While this uses `unknown` (better than `any`), it provides no compile-time safety for
accessing specific config properties. Every consumer must cast or narrow, which often
leads to `as any` downstream. The typed alternatives (`AgentConfig`, `SkillConfig`, etc.)
exist in the same file but `NodeConfig` is what gets used in generic node handling.

**Recommendation:** Use a discriminated union:

```typescript
export type NodeConfig =
  | ({ type: 'AGENT' } & AgentConfig)
  | ({ type: 'SKILL' } & SkillConfig)
  | ({ type: 'TOOL' } & ToolConfig)
  // ...
```

### 5.3 Duplicated Type Definitions

Several types are defined in multiple locations rather than imported from shared:

| Type | Locations | Should Be In |
|------|-----------|-------------|
| `ToolResult<T>` | `canvas-mcp.ts`, `sandbox-mcp.ts` | `shared/` or `server/types/` |
| `CanvasNode` / `CanvasEdge` | `canvas-mcp.ts`, `orchestrator-bridge.ts` | `shared/` or `server/types/` |
| `WorkflowNode` / `WorkflowEdge` | `orchestrator-bridge.ts` (local) | `server/types/` |

---

## 6. ERROR HANDLING PATTERNS

### 6.1 Good Patterns

- **Socket error emission:** Consistent use of `socket.emit('error', { code, message })`
  for client-facing errors in `server/socket/handlers.ts`
- **Try/catch in agent execution:** `server/agents/builder.ts` wraps each step execution
  in try/catch with structured error results
- **Multi-workspace failover:** `server/lib/anthropic-client.ts` implements A -> B -> B
  failover with proper error logging at each stage

### 6.2 Inconsistencies

| Location | Issue |
|----------|-------|
| `server/agents/architect.ts` | Swallows JSON parse errors with fallback but logs no warning |
| `server/services/orchestrator-bridge.ts` | Some error paths return `undefined` silently |
| `server/mcp/canvas-mcp.ts` | `ToolResult` returns `{ success: false, error }` but callers don't always check |
| `server/socket/handlers.ts:288` | Catches error but uses generic `'Unknown error'` fallback |
| `src/hooks/useSocket.ts` | Socket connection errors logged to console only |

### 6.3 Missing Error Boundaries

- No React Error Boundary components found wrapping the Canvas or Properties panels
- Socket disconnection has no automatic retry with backoff (reconnection is Socket.io default only)

---

## 7. SOCKET EVENT CONTRACT CONSISTENCY

### 7.1 Server-to-Client (Emitter Compliance)

**Status: FULLY COMPLIANT**

All 14 events in `ServerToClientEvents` have corresponding emitter functions in
`server/socket/emitter.ts`. The emitter file is well-typed and uses the shared types
directly.

| Contract Event | Emitter Function | Match |
|----------------|-----------------|-------|
| `session:stateChange` | `emitSessionStateChange()` | YES |
| `session:message` | `emitSessionMessage()` | YES |
| `node:created` | `emitNodeCreated()` | YES |
| `node:updated` | `emitNodeUpdated()` | YES |
| `node:deleted` | `emitNodeDeleted()` | YES |
| `edge:created` | `emitEdgeCreated()` | YES |
| `edge:deleted` | `emitEdgeDeleted()` | YES |
| `execution:stepStart` | `emitExecutionStepStart()` | YES |
| `execution:stepComplete` | `emitExecutionStepComplete()` | YES |
| `execution:planComplete` | `emitExecutionPlanComplete()` | YES |
| `execution:log` | `emitExecutionLog()` | YES |
| `execution:agentResult` | `emitAgentResult()` | YES |
| `execution:report` | `emitExecutionReport()` | YES |
| `error` | `socket.emit('error', ...)` (inline) | YES |

### 7.2 Client-to-Server (Handler Compliance)

**Status: GAP FOUND**

| Contract Event | Handler | Match |
|----------------|---------|-------|
| `session:start` | Line 80 | YES |
| `session:message` | Line 109 | YES |
| `session:cancel` | Line 185 | YES |
| `execution:pause` | Line 196 | YES |
| `execution:resume` | Line 206 | YES |
| `canvas:sync` | Line 216 | YES |
| `system:start` | Line 231 (as any) | YES (cast unnecessary) |
| `system:stop` | Line 301 (as any) | YES (cast unnecessary) |
| `fixer:start` | Line 308 (as any) | YES (cast unnecessary) |
| `fixer:stop` | Line 343 (as any) | YES (cast unnecessary) |
| `canvas:update_edge` | Line 350 (as any) | **NOT IN CONTRACT** |

### 7.3 Frontend Client Compliance

**`src/hooks/useSocket.ts`** -- COMPLIANT

Uses `Socket<ServerToClientEvents, ClientToServerEvents>` type from socket.io-client.
All event subscriptions and emissions match the shared contract. However, `canvas:update_edge`
emission in the frontend would also need `as any` since it's missing from the contract.

---

## 8. STATE MANAGEMENT REVIEW (Zustand)

### 8.1 Store Structure

**`src/store/useStore.ts`** (321 lines) -- Well-organized into 5 slices:

1. **Canvas State** (lines 50-65): `nodes`, `edges`, `addNode`, `addEdge`, `setNodes`, `setEdges`, `updateNodeData`
2. **Library State** (lines 67-71): `libraryCategory`, `searchQuery`, `setLibraryCategory`, `setSearchQuery`
3. **Config State** (lines 73-78): `configExportFramework`, `setConfigExportFramework`
4. **UI State** (lines 80-90): `selectedNode`, `addToAgentMode`, `propertiesPanelWidth`, etc.
5. **Wizard State** (lines 92-99): `wizardState`, `setWizardState`

### 8.2 Good Patterns

- **Stale closure fix in `addEdge`** (lines 167-169): Uses `get()` to read fresh state
  instead of relying on closure-captured `edges` array. This prevents the documented bug
  where rapid edge creation from the Builder would drop edges.

```typescript
addEdge: (edge) => {
  const currentEdges = get().edges;  // Fresh read
  set({ edges: [...currentEdges, edge] });
},
```

### 8.3 Issues

**Stale closure risk in `useHeadlessSession.ts`:**

`handleNodeDeleted` and `handleEdgeDeleted` capture `nodes` and `edges` in their closures:

```typescript
// src/hooks/useHeadlessSession.ts:177-186
const handleNodeDeleted = useCallback((nodeId: string) => {
  setNodes(nodes.filter((node) => node.id !== nodeId));  // `nodes` is stale
  setEdges(edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
}, [nodes, edges, setNodes, setEdges]);
```

While the dependency array includes `nodes` and `edges`, this causes the callback to be
recreated on every state change, potentially causing re-registration of socket handlers.
A better pattern would use `get()` from the store (same fix applied to `addEdge`).

**Double-set in `updateNodeData`** (lines 191-195):

```typescript
updateNodeData: (nodeId, data) => {
  const node = get().nodes.find((n) => n.id === nodeId);
  if (!node) return;
  const updatedNodes = get().nodes.map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
  );
  set({ nodes: updatedNodes, selectedNode: /* ... */ });
},
```

This calls `get().nodes` twice. Minor performance concern, but the real issue is that
between the two `get()` calls, state could theoretically change in a concurrent scenario.

---

## 9. REACT FLOW INTEGRATION REVIEW

### 9.1 Node Type Mapping

**`src/hooks/useHeadlessSession.ts`** lines 45-57 maps server node types to React Flow
component types. This is clean and well-documented:

```typescript
const nodeTypeToComponent: Record<string, string> = {
  AGENT: 'customNode',
  SKILL: 'customNode',
  // ... 8 more mappings
  DEPARTMENT: 'departmentNode',
  AGENT_POOL: 'agentPoolNode',
  MCP_SERVER: 'mcpServerNode',
};
```

### 9.2 Container Handling

Container nodes (DEPARTMENT, AGENT_POOL) receive special treatment:
- Explicit sizing via `DEFAULT_SIZES` record
- `parentId` and `extent: 'parent'` for child containment
- `zIndex: 0` for containers vs `zIndex: 10` for agents (well-documented fix)
- `expandParent: true` for child nodes

### 9.3 Edge Configuration

Centralized in `src/config/edgeConfig.ts` via `getEdgeParams()`. The headless session
hook correctly uses this for server-initiated edge creation, ensuring visual consistency
between manual and automated edge creation.

### 9.4 Potential Issues

- **Type normalization duplication:** Both `useHeadlessSession.ts` (line 80) and
  `canvas-mcp.ts` perform `toUpperCase().replace(/-/g, '_')`. This should be a shared utility.
- **Style casting:** `(payload as any).style` at lines 142/144 bypasses the typed
  `CanvasNodePayload` which doesn't include a `style` property. If style is needed,
  it should be added to the shared payload type.

---

## 10. OVERSIZED FILES (> 500 lines)

| File | Lines | Recommended Action |
|------|-------|--------------------|
| `src/components/Properties/schemas.ts` | 1,863 | Split into per-node-type schema files |
| `server/mcp/canvas-mcp.ts` | 1,185 | Split into state/tools/layout/enrichment |
| `server/services/inventory.ts` | 944 | Split scanner, bundler, and config |
| `server/services/orchestrator-bridge.ts` | 936 | Split conversion/execution/cost |
| `src/components/Library/LibraryPanel.tsx` | 781 | Extract sub-components |
| `server/services/configuration-analyzer.ts` | 719 | Extract prompts, separate deterministic/AI |
| `src/utils/exportDirectory.ts` | 659 | Extract per-framework generators |
| `src/components/Properties/PropertiesPanel.tsx` | 566 | Extract field groups into sub-components |
| `server/mcp/sandbox-mcp.ts` | 562 | Acceptable (single concern: file ops) |
| `server/agents/architect.ts` | 535 | Acceptable (single concern: planning) |
| `src/utils/generateClaudeMdExecutable.ts` | 516 | Acceptable (template generation) |

---

## 11. CODE DUPLICATION AND DEAD CODE

### 11.1 Duplicate Code

| Item | Locations | Risk |
|------|-----------|------|
| `server/shared/subcategories.ts` | Exact copy of `shared/subcategories.ts` | Taxonomy drift |
| `ToolResult<T>` interface | `canvas-mcp.ts` + `sandbox-mcp.ts` | Type drift |
| `CanvasNode` / `CanvasEdge` types | `canvas-mcp.ts` + `orchestrator-bridge.ts` | Shape drift |
| Type normalization logic | `useHeadlessSession.ts` + `canvas-mcp.ts` | Behavior drift |

### 11.2 Dead Code

| Item | Location | Evidence |
|------|----------|----------|
| `simulateSystemStart()` | `server/services/runtime.ts` | Phase 6 artifact; only `validateSystem` is imported by handlers |
| `sequelize` / `sqlite3` | `server/package.json` dependencies | Not imported anywhere in server code |
| `setCurrentSessionId` export | `server/mcp/sandbox-mcp.ts` | Search found no consumers |

### 11.3 Overlapping API Routes

| Route | Socket Event | Overlap |
|-------|-------------|---------|
| `POST /api/chat` | `session:message` | Both accept user messages and route to agents |
| `GET /api/session/:id` | `session:stateChange` | Both provide session state (one poll, one push) |

The HTTP route is likely for initial/fallback use, but this should be documented to
prevent confusion about which path to use.

---

## 12. ACTIONABLE RECOMMENDATIONS

### Priority 1: CRITICAL (Blocks type safety)

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 1 | Add `canvas:update_edge` to `ClientToServerEvents` | `shared/socket-events.ts` | 5 min |
| 2 | Delete duplicate `server/shared/subcategories.ts`, fix import | `server/shared/`, `server/services/bucketInference.ts` | 10 min |
| 3 | Remove 4 unnecessary `as any` casts on socket events | `server/socket/handlers.ts` | 5 min |

### Priority 2: HIGH (Type safety improvements)

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 4 | Extract `ToolResult<T>` to `server/types/tool-result.ts` | `canvas-mcp.ts`, `sandbox-mcp.ts` | 15 min |
| 5 | Add `style?` property to `CanvasNodePayload` | `shared/socket-events.ts` | 5 min |
| 6 | Type `updateNodeData` parameter as `Partial<NodeData>` | `src/store/useStore.ts` | 10 min |
| 7 | Replace `any` in handler payloads with proper types | `server/socket/handlers.ts` | 30 min |
| 8 | Extract shared `CanvasNode`/`CanvasEdge` to `server/types/` | Multiple server files | 20 min |

### Priority 3: MEDIUM (Architecture improvements)

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 9 | Split `canvas-mcp.ts` into 4-5 focused modules | `server/mcp/` | 2-3 hrs |
| 10 | Split `schemas.ts` into per-node-type files | `src/components/Properties/` | 1-2 hrs |
| 11 | Split `orchestrator-bridge.ts` into focused modules | `server/services/` | 2-3 hrs |
| 12 | Fix stale closure in `handleNodeDeleted`/`handleEdgeDeleted` | `src/hooks/useHeadlessSession.ts` | 20 min |
| 13 | Remove dead code (`simulateSystemStart`, unused deps) | `server/services/runtime.ts`, `server/package.json` | 15 min |
| 14 | Create shared type normalization utility | `shared/utils.ts` | 15 min |
| 15 | Add `enrichNodeConfig` registry pattern (OCP fix) | `server/mcp/canvas-mcp.ts` | 1 hr |

---

## 13. AUDIT RECOMMENDATION TRACKING

The codebase audit (docs/CODEBASE_AUDIT.md section 11) identified **15 prioritized recommendations**.
This section maps each to the swarm task(s) addressing it and tracks current status.

### 13.1 Critical Issues (Section 11.1)

| # | Recommendation | Swarm Task | Status | Notes |
|---|----------------|-----------|--------|-------|
| 1 | Hardcoded Inventory Path | BE-004 | ASSIGNED | Make `INVENTORY_ROOT` configurable via env var |
| 2 | No Authentication | BE-001 | PARTIAL | BE-001 adds validation/rate-limiting but full auth (JWT/session) is out of scope for this sprint |
| 3 | Massive Schema File (1,863 lines) | None directly | NEEDS ATTENTION | FE-002 refactors PropertiesPanel but does not split schemas.ts. See section 15 for recommended split plan |
| 4 | No Environment Template | OPS-001 | ASSIGNED | `.env.example` is a deliverable of OPS-001 |
| 5 | Path Traversal Risk | BE-001 | ASSIGNED | BE-001 hardens API validation including path security |

### 13.2 High-Priority Issues (Section 11.2)

| # | Recommendation | Swarm Task | Status | Notes |
|---|----------------|-----------|--------|-------|
| 6 | Large MCP File (1,185 lines) | None directly | NEEDS ATTENTION | BE-003 validates MCP but does not split canvas-mcp.ts. See section 15 for recommended split plan |
| 7 | In-Memory Sessions | None | NEEDS ATTENTION | No task addresses session persistence (Redis/DB). Recommend adding to backlog |
| 8 | Missing Tests (<10% coverage) | QA-001 | ASSIGNED | Target: 70%+ coverage on critical paths |
| 9 | No CI/CD Pipeline | OPS-001 | ASSIGNED | `.github/workflows/ci.yml` is a deliverable of OPS-001 |
| 10 | TypeScript `any` Usage (83 occurrences) | FE-001, BE-001, INT-001 | IN PROGRESS | FE-001 audits frontend `any`, BE-001 hardens handlers, INT-001 validates contracts |

### 13.3 Medium-Priority Issues (Section 11.3)

| # | Recommendation | Swarm Task | Status | Notes |
|---|----------------|-----------|--------|-------|
| 11 | Error Handling Inconsistency | BE-001, FE-003 | PARTIAL | BE-001 adds error middleware; FE-003 adds error boundaries. No centralized error logging service |
| 12 | Performance Optimization | None | NEEDS ATTENTION | No task addresses inventory caching or LLM response caching |
| 13 | Dead Dependencies (Sequelize/SQLite3) | None | NEEDS ATTENTION | Should be removed in Phase 4 refactoring pass |
| 14 | Documentation Gaps | Arch-reviewer | PARTIAL | This document + audit cover architecture. API docs, contributing guide, changelog still missing |
| 15 | Code Splitting (files > 500 lines) | FE-002, BE-004 | PARTIAL | FE-002 splits PropertiesPanel; BE-004 may split inventory.ts. schemas.ts, canvas-mcp.ts, orchestrator-bridge.ts still need splitting |

### 13.4 Unaddressed Items Summary

The following recommendations have **no assigned swarm task** and need future attention:

1. **Session Persistence** (#7) -- In-memory sessions are lost on restart. Requires Redis or SQLite integration.
2. **Performance Caching** (#12) -- Inventory scan results should be cached with TTL. LLM responses should be cached by prompt hash.
3. **Dead Dependency Cleanup** (#13) -- `sequelize` and `sqlite3` in `server/package.json` appear unused. Run `npx knip` to verify.
4. **schemas.ts Split** (#3) -- 1,863 lines, not covered by any swarm task. See section 15.
5. **canvas-mcp.ts Split** (#6) -- 1,185 lines, not covered by any swarm task. See section 15.
6. **orchestrator-bridge.ts Split** -- 936 lines, not covered by any swarm task.

---

## 14. INT-001 TASK STATUS

**Task #9: INT-001 -- Validate shared type contracts between frontend & backend**

**Status:** COMPLETE (validation finished 2026-02-13)

### Validation Results

All three shared type files have been cross-referenced against their consumers in `src/` and `server/`.

**`shared/socket-events.ts` (217 lines) -- VALIDATED**

| Check | Result | Details |
|-------|--------|---------|
| All `ServerToClientEvents` (14 events) have emitter functions | PASS | `server/socket/emitter.ts` covers all 14 |
| All `ClientToServerEvents` (12 events) have handler registrations | PASS | `server/socket/handlers.ts` covers all 12 |
| `CanvasNodePayload` includes `style?` property | PASS | Line 52 -- enables typed style access in `useHeadlessSession.ts` |
| `CanvasEdgeUpdatePayload` matches handler usage | PASS | Lines 72-77 match the shape at `handlers.ts:350` |
| `canvas:update_edge` in `ClientToServerEvents` | PASS | Line 199 -- closes the contract gap |
| Frontend `useSocket.ts` uses shared types | PASS | `Socket<ServerToClientEvents, ClientToServerEvents>` |
| Frontend terminal components import payload types | PASS | `AgentResultPayload`, `ExecutionReportPayload` |

**`shared/configure-types.ts` (107 lines) -- VALIDATED**

| Check | Result | Details |
|-------|--------|---------|
| `ConfigSuggestion` used by both sides | PASS | Frontend: 5 ConfigureWizard components. Backend: `configuration-analyzer.ts` |
| `ConfigureWorkflowRequest` matches API endpoint | PASS | `POST /api/configure-workflow` accepts this shape |
| `ConfigureNodeRequest` matches SSE endpoint | PASS | `POST /api/configure-node` accepts this shape |
| No overlapping definitions in src/types/ or server/types/ | PASS | Clean separation |

**`shared/subcategories.ts` (255 lines) -- VALIDATED**

| Check | Result | Details |
|-------|--------|---------|
| Frontend re-export pattern is correct | PASS | `src/constants/subcategories.ts` re-exports from `../../shared/subcategories` |
| `Subcategory` interface matches all consumers | PASS | Both `bucketInference.ts` and frontend use same shape |
| No taxonomy mismatches between frontend and backend | PASS | Identical data used (via re-export or duplicate) |

### Fixes Previously Applied to `shared/`

1. **`canvas:update_edge` added to `ClientToServerEvents`** -- `shared/socket-events.ts` line 199
   - `CanvasEdgeUpdatePayload` interface at lines 72-77
   - Closes the contract gap that forced `as any` casts in handlers and PropertiesPanel

2. **`style?` property added to `CanvasNodePayload`** -- `shared/socket-events.ts` line 52
   - Enables typed access in `useHeadlessSession.ts` without unsafe casts

### Remaining Fixes (require `server/` or `src/` write access)

**For backend-engineer:**
1. Delete `server/shared/subcategories.ts` (exact duplicate of `shared/subcategories.ts`)
2. Update import in `server/services/bucketInference.ts` from `../shared/subcategories` to `../../shared/subcategories`
3. Remove 5 unnecessary `as any` casts from `server/socket/handlers.ts` lines 231, 301, 308, 343, 350
   (all events are now in the contract; casts are no longer needed)
4. Replace `payload: any` with proper types from shared contract in same file
5. Extract `ToolResult<T>` to `server/types/tool-result.ts` (duplicated in `canvas-mcp.ts` and `sandbox-mcp.ts`)

**For frontend-engineer:**
1. Remove complex cast in `src/components/Properties/PropertiesPanel.tsx:272-275`
   (`canvas:update_edge` is now in the contract -- use `socket?.emit('canvas:update_edge', ...)` directly)
2. Simplify `src/hooks/useHeadlessSession.ts:142-144` from
   `(payload as unknown as Record<string, unknown>).style` to `payload.style`
   (`style` property is now in `CanvasNodePayload`)

---

## 15. DETAILED FILE SPLITTING PLANS

Three files exceed the 500-line threshold by a wide margin and require modularization.
Each plan below includes recommended file structure, approximate line counts, and
dependency relationships between resulting modules.

### 15.1 `src/components/Properties/schemas.ts` (1,863 lines) -- CRITICAL

**Current structure:**
- Lines 1-86: Type definitions (`FieldType`, `FieldSchema`, `SectionSchema`, `NodeTypeSchema`)
- Lines 87-118: Common reusable fields (`identityFields`, `commonSections`)
- Lines 119-253: Provider/option constants (`providerOptions`, `modelsByProvider`, `toolOptions`, `roleOptions`)
- Lines 254-397: Container schemas (`DEPARTMENT`, `AGENT_POOL`)
- Lines 398-1354: Agent schema (956 lines -- the largest single schema)
- Lines 1355-1621: Capability schemas (`MCP_SERVER`, `SKILL`, `HOOK`)
- Lines 1622-1806: Simple schemas (`COMMAND`, `TOOL`, `PROVIDER`, `PLUGIN`, `REASONING`)
- Lines 1807-1863: Helper functions (`getSchemaForType`, `getFieldsForSection`)

**Recommended split (7 files):**

```
src/components/Properties/
├── schema-types.ts           (~86 lines)  -- FieldType, FieldSchema, SectionSchema, NodeTypeSchema
├── schema-constants.ts       (~167 lines) -- identityFields, commonSections, providerOptions, modelsByProvider
├── schemas/
│   ├── agent.ts              (~956 lines) -- AGENT schema (still large, but single-concern)
│   ├── containers.ts         (~134 lines) -- DEPARTMENT, AGENT_POOL schemas
│   ├── capabilities.ts       (~267 lines) -- MCP_SERVER, SKILL, HOOK schemas
│   ├── legacy.ts             (~183 lines) -- COMMAND, TOOL, PROVIDER, PLUGIN, REASONING schemas
│   └── index.ts              (~60 lines)  -- Registry: nodeSchemas Record + helper functions
```

**Dependency graph:**
```
schema-types.ts (foundation, no deps)
    ↓
schema-constants.ts (imports schema-types)
    ↓
schemas/agent.ts ─────────┐
schemas/containers.ts ────┤ (all import schema-types + schema-constants)
schemas/capabilities.ts ──┤
schemas/legacy.ts ────────┘
    ↓
schemas/index.ts (imports all schema modules, exports registry + helpers)
```

**Migration notes:**
- All existing imports of `schemas.ts` change to `schemas/index.ts` (or just `schemas/`)
- `getSchemaForType()` stays in the barrel file
- The AGENT schema remains large (~956 lines) but is a single, coherent schema definition.
  Further splitting by section (identity, model, tools, permissions, etc.) is possible but
  may reduce readability since sections reference each other.

### 15.2 `server/mcp/canvas-mcp.ts` (1,185 lines) -- CRITICAL

**Current structure:**
- Lines 1-54: Imports and node type mapping (`NODE_TYPE_MAP`)
- Lines 55-348: Node enrichment logic (default config generators, inference functions)
- Lines 349-468: `canvas_create_node` tool
- Lines 469-547: `canvas_connect_nodes` tool
- Lines 548-607: `canvas_update_property` tool
- Lines 608-662: `canvas_delete_node` tool
- Lines 663-711: `canvas_get_state` tool
- Lines 712-738: `canvas_clear` tool
- Lines 739-772: `canvas_sync_from_client` tool
- Lines 773-830: Helper functions (`calculateNextPosition`, `setNestedProperty`)
- Lines 831-902: Layout persistence (`persistLayout`, `loadPersistedLayout`)
- Lines 903-1038: `canvas_apply_layout` tool
- Lines 1039-1185: Tool registry definitions (MCP tool schemas)

**Recommended split (7 files):**

```
server/mcp/canvas/
├── types.ts                  (~60 lines)  -- Interfaces: CanvasNode, CanvasEdge, CreateNodeParams, ToolResult
├── state.ts                  (~30 lines)  -- In-memory canvas state (Maps) + accessor functions
├── enrichment.ts             (~293 lines) -- NODE_TYPE_MAP, enrichNodeConfig, generateDefaultSystemPrompt
├── tools.ts                  (~450 lines) -- All 7 tool handler functions (create, connect, update, delete, get, clear, sync)
├── layout.ts                 (~210 lines) -- Layout algorithms (grid, hierarchical) + persistence (persistLayout, loadPersistedLayout)
├── helpers.ts                (~60 lines)  -- calculateNextPosition, setNestedProperty
└── index.ts                  (~150 lines) -- Tool registry (MCP schema definitions) + re-exports
```

**Dependency graph:**
```
types.ts (foundation, no deps)
    ↓
state.ts (imports types)
    ↓
helpers.ts (imports types, state)
enrichment.ts (imports types)
    ↓
tools.ts (imports types, state, enrichment, helpers)
layout.ts (imports types, state, helpers)
    ↓
index.ts (imports all, exports CANVAS_TOOLS registry)
```

**Migration notes:**
- `server/mcp/canvas-mcp.ts` becomes `server/mcp/canvas/index.ts`
- Imports from other server files (`canvas-mcp.ts` → `canvas/`) should work with barrel
- The `enrichment.ts` module is the best candidate for the OCP registry pattern (recommendation #15)
- `tools.ts` at ~450 lines is acceptable since each tool function is independent

### 15.3 `server/services/inventory.ts` (944 lines)

**Current structure:**
- Lines 1-103: Type definitions and configuration constants (`INVENTORY_ROOT`, `NESTED_MCP_CONFIGS`)
- Lines 104-184: `REPO_CONFIGS` array (component path mappings, 80 lines)
- Lines 185-203: Type mappings and helper interfaces
- Lines 204-231: `parseReadme` helper
- Lines 232-273: `scanMcpDirectory` function
- Lines 274-315: `scanNestedMcps` function
- Lines 316-344: `parseAwesomeMcpList` function
- Lines 345-374: `parseComponentFile` function
- Lines 375-423: `scanComponentDir` function (recursive)
- Lines 424-526: `scanPluginBundles` function
- Lines 527-691: `scanInventory` function (main orchestrator, 164 lines)
- Lines 692-821: `buildSearchIndex` function (130 lines)
- Lines 822-856: `extractFacets` function
- Lines 857-944: `searchInventory` function

**Recommended split (5 files):**

```
server/services/inventory/
├── types.ts                  (~100 lines) -- All interfaces + INVENTORY_ROOT + NESTED_MCP_CONFIGS
├── config.ts                 (~100 lines) -- REPO_CONFIGS + TYPE_TO_NODE_TYPE mapping
├── parsers.ts                (~170 lines) -- parseReadme, parseComponentFile, parseAwesomeMcpList
├── scanners.ts               (~250 lines) -- scanMcpDirectory, scanNestedMcps, scanComponentDir, scanPluginBundles
├── search.ts                 (~160 lines) -- buildSearchIndex, extractFacets, searchInventory
└── index.ts                  (~170 lines) -- scanInventory orchestrator + re-exports
```

**Dependency graph:**
```
types.ts (foundation, no deps)
    ↓
config.ts (imports types)
    ↓
parsers.ts (imports types, config)
    ↓
scanners.ts (imports types, config, parsers)
    ↓
index.ts / scanInventory (imports types, config, scanners)
search.ts (imports types only -- independent of scanning)
```

**Migration notes:**
- `INVENTORY_ROOT` moves to `types.ts` but should be replaced with `process.env.INVENTORY_ROOT` (task BE-004)
- All existing imports of `inventory.ts` change to `inventory/` (barrel import via `index.ts`)
- `search.ts` is independent of the scanning pipeline -- it only consumes the output

---

## APPENDIX A: Files Reviewed

```
shared/socket-events.ts          (206 lines)
shared/configure-types.ts        (107 lines)
shared/subcategories.ts          (255 lines)
server/shared/subcategories.ts   (255 lines) -- DUPLICATE
server/src/index.ts              (310 lines)
server/socket/handlers.ts        (375 lines)
server/socket/emitter.ts         (163 lines)
server/types/execution-plan.ts   (207 lines)
server/types/session.ts          (59 lines)
server/agents/supervisor.ts      (468 lines)
server/agents/architect.ts       (535 lines)
server/agents/builder.ts         (449 lines)
server/services/runtime.ts       (204 lines)
server/services/orchestrator-bridge.ts (936 lines)
server/services/configuration-analyzer.ts (719 lines)
server/services/bucketInference.ts (416 lines)
server/services/inventory.ts     (944 lines)
server/mcp/canvas-mcp.ts         (1185 lines)
server/mcp/sandbox-mcp.ts        (562 lines)
server/lib/anthropic-client.ts   (184 lines)
server/watcher/skill-watcher.ts  (311 lines)
src/types/core.ts                (741 lines)
src/types/config.ts              (221 lines)
src/types/export.ts              (142 lines)
src/store/useStore.ts            (321 lines)
src/hooks/useSocket.ts           (219 lines)
src/hooks/useHeadlessSession.ts  (275 lines)
src/constants/subcategories.ts   (16 lines)
src/config/edgeConfig.ts         (reviewed)
src/components/Properties/schemas.ts (1863 lines)
src/components/Properties/PropertiesPanel.tsx (566 lines)
src/components/Library/LibraryPanel.tsx (781 lines)
src/utils/export.ts              (reviewed)
src/utils/exportDirectory.ts     (659 lines)
src/utils/generateClaudeMdExecutable.ts (516 lines)
```
