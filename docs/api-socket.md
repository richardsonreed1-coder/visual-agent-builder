# API Reference: Socket.io Events & Schemas

Connection: `http://localhost:3001` with transports `['websocket', 'polling']`.

For REST endpoints, see [api.md](api.md).

## Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `session:start` | callback(sessionId) | Create new session, returns UUID |
| `session:message` | `{ sessionId, content }` | Send message to Supervisor agent |
| `session:cancel` | `{ sessionId }` | Cancel current execution |
| `execution:pause` | `{ sessionId }` | Pause running execution |
| `execution:resume` | `{ sessionId }` | Resume paused execution |
| `canvas:sync` | `{ nodes[], edges[] }` | Sync canvas state to server |
| `canvas:update_edge` | `{ edgeId, changes: { data? } }` | Update edge properties |
| `system:start` | `{ sessionId, nodes[], edges[], brief }` | Start workflow execution |
| `system:stop` | `{ sessionId }` | Stop workflow execution |
| `fixer:start` | `{ sessionId, prompt }` | Launch Fixer Agent |
| `fixer:stop` | `{ sessionId }` | Stop Fixer Agent |
| `fixer:apply-patches` | `{ sessionId }` | Apply fixer patches to canvas |

## Server → Client Events

### Session Events

| Event | Payload | When |
|-------|---------|------|
| `session:stateChange` | `{ sessionId, state, previousState? }` | Session state transitions |
| `session:message` | `{ sessionId, message: SessionMessage }` | Agent responses |

### Canvas Events

| Event | Payload | When |
|-------|---------|------|
| `node:created` | `{ nodeId, type, label, position, parentId?, data?, style? }` | Builder creates node |
| `node:updated` | `{ nodeId, changes: { position?, data?, label? } }` | Node properties change |
| `node:deleted` | `{ nodeId }` | Node removed |
| `edge:created` | `{ edgeId, sourceId, targetId, edgeType?, data? }` | Connection created |
| `edge:deleted` | `{ edgeId }` | Connection removed |

### Execution Events

| Event | Payload | When |
|-------|---------|------|
| `execution:stepStart` | `{ sessionId, planId, stepId, stepName, stepOrder, totalSteps }` | Step begins |
| `execution:stepComplete` | `{ ...stepStart, success, result?, error?, createdNodeId?, createdEdgeId? }` | Step finishes |
| `execution:planComplete` | `{ sessionId, planId, success }` | Full plan finishes |
| `execution:log` | `{ sessionId, output, stream, timestamp, source? }` | Streaming text output |
| `execution:agentResult` | See AgentResultPayload below | Agent phase completes |
| `execution:report` | See ExecutionReportPayload below | Final execution summary |

### Fixer Events

| Event | Payload | When |
|-------|---------|------|
| `fixer:patches-applied` | `{ sessionId, results[], totalApplied, totalFailed }` | Patches applied to canvas |

### Error Events

| Event | Payload | When |
|-------|---------|------|
| `error` | `{ code, message, details? }` | Any error condition |

---

## Session States

```
idle → routing → planning → executing → paused → completed
                                      ↘ error
```

| State | Description |
|-------|-------------|
| `idle` | No active operation |
| `routing` | Supervisor detecting intent / Router classifying message |
| `planning` | Architect generating execution plan |
| `executing` | Builder executing plan steps |
| `paused` | Execution paused by user |
| `completed` | All steps finished successfully |
| `error` | Execution failed |

---

## Payload Schemas

### SessionMessage

```typescript
{
  id: string;
  role: 'user' | 'supervisor' | 'architect' | 'builder' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    planId?: string;
    stepId?: string;
  };
}
```

### AgentResultPayload

```typescript
{
  sessionId: string;
  phaseIndex: number;
  phaseName: string;
  agentId: string;
  agentLabel: string;
  status: 'success' | 'failed' | 'skipped';
  output: string;
  tokensUsed: number;
  durationMs: number;
  cost: number;
}
```

### ExecutionReportPayload

```typescript
{
  sessionId: string;
  success: boolean;
  phases: Array<{
    name: string;
    agents: AgentResultPayload[];
    durationMs: number;
  }>;
  totalDurationMs: number;
  totalTokens: number;
  totalCost: number;
  qaScores?: Record<string, number>;
}
```

### FixerPatchResult

```typescript
{
  nodeLabel: string;
  fieldsApplied: string[];
  success: boolean;
  error?: string;
}
```

### Execution Log Source Tag

The `source` field on `execution:log` events routes output to the correct terminal tab:
- `workflow` — Main workflow execution output
- `fixer` — Fixer Agent output (displayed in fixer tab)

---

## SystemBundle Schema

Used by `POST /api/systems` and `POST /api/deploy`:

```typescript
{
  manifest: {
    name: string;                    // "Content Pipeline"
    slug: string;                    // "content-pipeline" (regex: /^[a-z0-9-]+$/)
    description: string;
    version: string;                 // "1.0.0"
    category: 'web-development' | 'content-production' | 'research' | 'data-analysis' | 'monitoring';
    requiredInputs: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
    outputType: 'web_artifact' | 'document' | 'data' | 'notification';
    estimatedCostUsd: number;
    triggerPattern: 'cron' | 'webhook' | 'messaging' | 'always-on';
    nodeCount: number;
    edgeCount: number;
  };
  canvasJson: object;                // Sanitized React Flow state
  agentConfigs: Record<string, {     // Per-agent config (keyed by slug)
    name: string;
    role: string;
    description?: string;
    systemPrompt?: string;
    provider?: string;
    model?: string;
    mcps: string[];
  }>;
  mcpConfigs: Array<{               // Deduplicated MCP servers
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  pm2Ecosystem: {                    // PM2 process definition
    apps: Array<{
      name: string;
      script: string;
      args?: string[];
      cwd?: string;
      env?: Record<string, string>;
      instances?: number;
      max_memory_restart?: string;
    }>;
  };
  envExample: Record<string, string>; // Required env vars (values blank)
  createdAt: string;                  // ISO 8601 timestamp
}
```

---

## AI Failover Strategy

The backend uses multi-workspace failover for Claude API calls:

```
Attempt 1: Primary workspace + Preferred model
    ↓ (429 Rate Limited or 529 Overloaded)
Attempt 2: Backup workspace + Preferred model
    ↓ (429 or 529)
Attempt 3: Backup workspace + Emergency model
    ↓ (failure)
Throw error
```

| Role | Preferred Model | Emergency Model | Max Tokens |
|------|----------------|-----------------|------------|
| ARCHITECT | claude-opus-4-5-20251101 | claude-sonnet-4-5-20250929 | 16384 |
| BUILDER | claude-sonnet-4-5-20250929 | claude-3-7-sonnet-20250219 | 8192 |

Non-retryable errors (400, 401, 403) fail immediately without attempting backup.
