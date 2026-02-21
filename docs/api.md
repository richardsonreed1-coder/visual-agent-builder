# API Reference: REST Endpoints

All REST endpoints require the `X-API-Key` header unless noted. The server runs on port 3001 by default. For Socket.io events, see [api-socket.md](api-socket.md).

## Health Check

**`GET /api/health`** — No auth required

```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T12:00:00.000Z",
  "uptime": 3600,
  "pools": {
    "BUILDER": { "primary": true, "backup": true, "model": "claude-sonnet-4-5-20250929" },
    "ARCHITECT": { "primary": true, "backup": false, "model": "claude-opus-4-5-20251101" }
  }
}
```

---

## Inventory

**`GET /api/inventory`** — Fetch hierarchical component tree

```bash
curl -H "X-API-Key: $KEY" http://localhost:3001/api/inventory
```

Response: `{ items: InventoryItem[] }` — nested tree with folders, files, bundles.

---

**`GET /api/component-content`** — Fetch file content

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string (query) | Yes | Filepath relative to inventory root |

```bash
curl -H "X-API-Key: $KEY" \
  "http://localhost:3001/api/component-content?path=agents/researcher.md"
```

Response: `{ content: string }`

Security: Rejects null bytes, normalizes paths, blocks traversal outside inventory root (403).

---

**`GET /api/inventory/search`** — Full-text + faceted search

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | No | Search query |
| `types` | string (CSV) | No | Filter by type: agent, skill, hook, command |
| `repos` | string (CSV) | No | Filter by repository |
| `buckets` | string (CSV) | No | Filter by capability bucket |
| `subcategories` | string (CSV) | No | Filter by subcategory |
| `limit` | number | No | Max results (default 100) |
| `offset` | number | No | Pagination offset (default 0) |

```bash
curl -H "X-API-Key: $KEY" \
  "http://localhost:3001/api/inventory/search?q=frontend&types=agent&limit=10"
```

Response: `{ items: FlattenedItem[], facets: SearchFacets, total, limit, offset }`

---

**`GET /api/inventory/bucket-counts`** — Capability bucket counts

```bash
curl -H "X-API-Key: $KEY" http://localhost:3001/api/inventory/bucket-counts
```

Response: `{ buckets: Record<string, number> }`

---

## Capabilities

**`GET /api/capabilities`** — List loaded capabilities

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string (query) | No | Filter: skill, hook, command |

```bash
curl -H "X-API-Key: $KEY" "http://localhost:3001/api/capabilities?type=skill"
```

Response: `{ count: number, capabilities: Capability[] }`

---

## Configuration

**`POST /api/configure-workflow`** — Deterministic workflow analysis

Request body: `{ nodes: Node[], edges: Edge[] }`

```bash
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"nodes":[],"edges":[]}' http://localhost:3001/api/configure-workflow
```

Response: `{ overallHealth, nodeIssues[], missingRequirements[], configurableNodeCount, estimatedCost }`

---

**`POST /api/configure-node`** — AI-powered node analysis (SSE streaming)

Rate limited: 10 req/min. Request body: `{ node: { id, type, label, config }, workflowContext? }`

```bash
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"node":{"id":"n1","type":"AGENT","label":"Writer","config":{}}}' \
  http://localhost:3001/api/configure-node
```

SSE events: `{"type":"chunk","text":"..."}` and `{"type":"result","suggestion":{...}}`

---

## Chat

**`POST /api/chat`** — Send message to Supervisor agent

Rate limited: 10 req/min.

Request body: `{ "message": "Create a research agent", "sessionId": "uuid" }`

```bash
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"message":"Create a research agent","sessionId":"abc-123"}' \
  http://localhost:3001/api/chat
```

Response: `{ success: true, sessionId: "abc-123", message: "..." }`

---

## Systems Registry

**`GET /api/systems`** — List all non-archived systems

```bash
curl -H "X-API-Key: $KEY" http://localhost:3001/api/systems
```

Response: `{ systems: DeploymentRecord[] }`

---

**`POST /api/systems`** — Register a new system from bundle

See [api-socket.md](api-socket.md) for the full SystemBundle schema. The request body includes `manifest`, `canvasJson`, `agentConfigs`, `mcpConfigs`, `pm2Ecosystem`, `envExample`, and `createdAt`.

```bash
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d @bundle.json http://localhost:3001/api/systems
```

Response: `201` with `DeploymentRecord`. Error: `409 DUPLICATE_SLUG` if slug exists.

---

**`GET /api/systems/:slug`** — Get a single system

```bash
curl -H "X-API-Key: $KEY" http://localhost:3001/api/systems/content-pipeline
```

Response: `DeploymentRecord` or `404 NOT_FOUND`

---

**`PUT /api/systems/:slug`** — Update system status

Request body: `{ "status": "stopped" }` — Valid: `deployed`, `stopped`, `errored`

```bash
curl -X PUT -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"status":"stopped"}' http://localhost:3001/api/systems/content-pipeline
```

Response: `{ success: true }`

---

**`DELETE /api/systems/:slug`** — Archive system (soft delete)

```bash
curl -X DELETE -H "X-API-Key: $KEY" http://localhost:3001/api/systems/content-pipeline
```

Response: `204 No Content`

---

## Deploy

**`POST /api/deploy`** — Full atomic deployment pipeline

Same request body as `POST /api/systems`. Runs the deploy bridge (write agents, MCPs, trigger, register, start PM2). Rolls back all artifacts on failure.

```bash
curl -X POST -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d @bundle.json http://localhost:3001/api/deploy
```

Response: `201` with `DeploymentRecord`

---

## Operator Actions

**`GET /api/operators/actions`** — List actions with filters

| Param | Type | Description |
|-------|------|-------------|
| `operator_type` | string | system_monitor, remediation, optimization |
| `approved` | string | true or false |
| `system_slug` | string | Filter by system |
| `limit` | number | Max results (default 50, max 200) |
| `offset` | number | Pagination offset |

```bash
curl -H "X-API-Key: $KEY" \
  "http://localhost:3001/api/operators/actions?operator_type=optimization&limit=10"
```

Response: `{ actions: OperatorAction[], total, limit, offset }`

---

**`GET /api/operators/actions/pending`** — Pending approvals

```bash
curl -H "X-API-Key: $KEY" \
  "http://localhost:3001/api/operators/actions/pending?system_slug=content-pipeline"
```

---

**`POST /api/operators/actions/:id/approve`** — Approve and apply

Merges config into deployment, restarts PM2. Error: `409 ALREADY_RESOLVED`.

```bash
curl -X POST -H "X-API-Key: $KEY" \
  http://localhost:3001/api/operators/actions/550e8400-.../approve
```

---

**`POST /api/operators/actions/:id/reject`** — Reject pending action

```bash
curl -X POST -H "X-API-Key: $KEY" \
  http://localhost:3001/api/operators/actions/550e8400-.../reject
```

Response: `{ success: true }`

---

## WebSocket Log Stream

**`GET /api/systems/:slug/stream`** — HTTP upgrade to WebSocket

Streams real-time execution logs. Uses `ws` library (not Socket.io).

```javascript
const ws = new WebSocket('ws://localhost:3001/api/systems/content-pipeline/stream');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```
