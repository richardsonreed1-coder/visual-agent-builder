# AUTOPILATE — Verification & Shipping Checklist

Run through this before deploying to the Mac Mini production environment.

---

## Tests

- [ ] All unit tests pass: `npm run test`
- [ ] Integration tests pass: `npm run test -- tests/integration/`
- [ ] Export tests: `npm run test -- tests/export/`
- [ ] Deploy tests: `npm run test -- tests/deploy/`
- [ ] Router tests: `npm run test -- tests/router/`
- [ ] Operator tests: `npm run test -- tests/operators/`
- [ ] Edge cases tested:
  - [ ] Empty canvas export → clear error message, no crash
  - [ ] Deploy with OpenClaw not running → clear error, suggests starting OpenClaw
  - [ ] Router with no systems registered → all messages get direct answers
  - [ ] System Monitor with no processes → runs silently, no errors
  - [ ] QA Remediation with all dimensions passing → no action taken
  - [ ] Optimization Agent with no execution history → empty report, no errors
  - [ ] Missing DATABASE_URL → clear error on startup
  - [ ] Missing ANTHROPIC_API_KEY → clear error on first LLM call
  - [ ] Invalid webhook signature → rejected with 403
  - [ ] PM2 restart failure → error logged, not silently swallowed

## Code Quality

- [ ] No file exceeds 300 lines: `find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -n | tail -20`
- [ ] No dead code: `npx knip`
- [ ] No duplicated code: `npx jscpd src/`
- [ ] Formatting clean: `npx biome check src/`
- [ ] Linting clean: `npx biome lint src/`
- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] No dead framework references: `grep -ri 'autogen\|crewai\|langgraph' src/` returns zero results
- [ ] No `any` types: `grep -r ': any' src/ | grep -v node_modules | grep -v '\.d\.ts'`
- [ ] No console.log in production code: `grep -r 'console.log' src/ | grep -v tests/ | grep -v logger.ts`

## Dead Framework Cleanup Verification

- [ ] Zero AutoGen references: `grep -ri 'autogen' src/`
- [ ] Zero CrewAI references: `grep -ri 'crewai' src/`
- [ ] Zero LangGraph references: `grep -ri 'langgraph' src/`
- [ ] ExportFramework type has no dead options
- [ ] ConfigModal has no dead framework panels
- [ ] No dead generator files in src/export/
- [ ] StatusPanel has no dead framework references

## Export System Verification

- [ ] "Export System Bundle" produces a valid ZIP
- [ ] ZIP contains: system.json, canvas.json, agents/, mcp/, ecosystem.config.js, .env.example
- [ ] system.json contains valid SystemManifest
- [ ] Per-agent CLAUDE.md files contain correct config (model, prompt, tools, MCP)
- [ ] PM2 ecosystem config has one app per agent node
- [ ] .env.example lists all required API keys
- [ ] "Export JSON" save/load round-trips without data loss
- [ ] Canvas JSON doesn't contain React Flow internal properties (selected, dragging)
- [ ] Bundle from a 26-node pipeline (Web Design Team) generates correctly

## Deploy Bridge Verification

- [ ] Deploy creates files in correct OpenClaw directory structure
- [ ] Trigger factory generates correct configs:
  - [ ] Cron trigger: valid cron expression in config
  - [ ] Webhook trigger: endpoint registered
  - [ ] Messaging trigger: channel routing configured
  - [ ] Always-on trigger: daemon mode flags set
- [ ] PM2 process starts and reaches 'online' status
- [ ] Deployment record created in PostgreSQL
- [ ] Redeployment updates existing record (doesn't duplicate)
- [ ] Stop button stops PM2 process and updates status
- [ ] Archive removes process and marks as archived
- [ ] Atomic cleanup: if PM2 fails, written files are cleaned up

## Systems Dashboard Verification

- [ ] Dashboard lists all deployed systems
- [ ] Status badges show correct state (deployed/stopped/errored)
- [ ] System detail shows execution history
- [ ] System detail shows PM2 process status
- [ ] Action buttons work: Stop, Restart, Redeploy, Archive
- [ ] Status polling updates every 10 seconds
- [ ] Manual trigger button works

## Router Agent Verification

- [ ] 'build a landing page' → matches Web Design System
- [ ] 'write a blog post about AI' → matches Content Factory
- [ ] 'what time is it in Tokyo' → direct answer, no system trigger
- [ ] 'build me a website' → matches Web Design, asks for missing inputs
- [ ] Input gathering asks natural questions for missing fields
- [ ] Compiled brief contains all required inputs
- [ ] Session persists after system delivers output
- [ ] Feedback after output delivery → routes as revision, not new trigger
- [ ] 'start over' after output → recognized as direction change, restarts system

## Operator Agent Verification

- [ ] System Monitor detects crashed PM2 process within 5 minutes
- [ ] Monitor correctly diagnoses: expired API key, rate limit, timeout, OOM
- [ ] Monitor applies correct fix for each diagnosis type
- [ ] Monitor restarts process after fixing
- [ ] Monitor logs action to operator_actions table
- [ ] QA Remediation activates on QA FAIL event
- [ ] QA maps failed dimensions to correct pipeline nodes
- [ ] QA patches only affected nodes' prompts
- [ ] QA re-executes only affected phases
- [ ] QA stops after 3 iterations if still failing
- [ ] QA escalates to user after max iterations
- [ ] Optimization Agent runs weekly
- [ ] Optimization generates categorized recommendations
- [ ] Low-risk changes auto-applied
- [ ] High-risk changes stored as pending for approval
- [ ] Approval API applies pending changes correctly

## Visual QA

- [ ] VAB canvas renders correctly after cleanup
- [ ] Node types display with correct colors and icons
- [ ] Edge types display with correct styles
- [ ] ConfigModal opens and shows all config fields
- [ ] Deploy modal opens with all trigger options
- [ ] Systems Dashboard renders with system cards
- [ ] System detail page renders execution history
- [ ] Log streaming panel displays live output
- [ ] Operator actions panel shows recent actions
- [ ] No console errors in browser DevTools

## API Behavior

- [ ] All endpoints return correct status codes (200, 201, 400, 401, 404, 500)
- [ ] Error responses follow format: `{ error: string, code: string, status: number }`
- [ ] X-API-Key authentication rejects unauthorized requests with 401
- [ ] Rate limiter rejects excessive requests with 429
- [ ] CORS allows localhost:5173 and Caddy hostname
- [ ] WebSocket /api/systems/:slug/stream connects and streams
- [ ] Zod validation rejects malformed request bodies with 400

## Performance

- [ ] Bundle generation for 26-node pipeline completes in < 5 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] System detail with 100 execution logs loads in < 3 seconds
- [ ] Log streaming has < 500ms latency from PM2 to dashboard
- [ ] Database queries use indexes (no sequential scans on large tables)
- [ ] WebSocket connections don't leak on navigation

## Security

- [ ] No hardcoded API keys: `grep -r 'sk-\|sk_\|password.*=' src/ | grep -v test`
- [ ] `.env` is in `.gitignore`
- [ ] Secrets encrypted at rest in PostgreSQL (AES-256-GCM)
- [ ] API key authentication on all /api/ routes except /api/health
- [ ] Webhook signatures verified (HMAC-SHA256)
- [ ] PostgreSQL listens on localhost only
- [ ] Redis listens on localhost only
- [ ] Fixer Agent sandbox validates paths (no path traversal)
- [ ] Rate limiting active on API
- [ ] Cloudflare Tunnel is the only external surface

## Database

- [ ] All migrations run cleanly on fresh database: `npm run migrate`
- [ ] Migrations are reversible (down functions work)
- [ ] Indexes exist: deployment_id on execution_logs, deployment_id on operator_actions
- [ ] jsonb queries use parameterized `$1::jsonb` (no string interpolation)
- [ ] Connection pool configured (not creating new connections per query)

## Infrastructure (Mac Mini Production)

- [ ] PostgreSQL service running: `brew services list | grep postgresql`
- [ ] Redis service running: `brew services list | grep redis`
- [ ] OpenClaw gateway running: `pm2 list | grep openclaw`
- [ ] Caddy reverse proxy configured and running
- [ ] Cloudflare Tunnel active and routing correctly
- [ ] Tailscale connected for remote access
- [ ] launchd configured for auto-start on boot (Caddy, cloudflared)
- [ ] PM2 startup configured: `pm2 startup` + `pm2 save`
- [ ] Static LAN IP configured (192.168.1.100)

---

## Pre-Ship Script

```bash
# Run all checks in sequence
npm run build
npx tsc --noEmit
npx biome check src/
npx biome lint src/
npm run test
npx knip
grep -ri 'autogen\|crewai\|langgraph' src/ && echo "DEAD CODE FOUND — FIX BEFORE SHIP" && exit 1
find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -n | tail -5
echo "All checks passed."

# Deploy to Mac Mini
# 1. Push to main
git push origin main

# 2. On Mac Mini: pull and rebuild
ssh user@vab-server.local
cd ~/Projects/autopilate
git pull
npm install
npm run build
npm run migrate
pm2 restart autopilate-server
pm2 list
```

---

## Post-Deploy Smoke Test

```bash
# On Mac Mini (or via Tailscale/SSH)

# 1. Health check
curl http://localhost:3001/api/health

# 2. Systems API responds
curl -H "X-API-Key: $API_KEY" http://localhost:3001/api/systems

# 3. VAB frontend loads
curl -s http://localhost:5173 | head -5  # or check via Cloudflare Tunnel URL

# 4. OpenClaw gateway running
pm2 list | grep openclaw

# 5. PostgreSQL accessible
psql $DATABASE_URL -c 'SELECT count(*) FROM deployments'

# 6. Redis pub/sub working
redis-cli ping  # should return PONG

# 7. Operator agents scheduled
pm2 list | grep monitor
pm2 list | grep optimization
```
