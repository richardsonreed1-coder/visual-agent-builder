# AUTOPILATE — Sprint Plan

Every task has an exact prompt to paste into your agent terminal. Work through sprints in order. Within a sprint, tasks marked "parallel group" can run simultaneously in separate terminal panes.

---

## Sprint 1: Clean Slate (Day 1 — Solo Tasks)

Goal: Remove all dead framework code (AutoGen, CrewAI, LangGraph). The app compiles and runs with zero dead references. This is Phase 1 from the implementation plan.

### Task 1: Strip Dead Export Generators

- **Blast radius:** Medium (5-8 files)
- **Parallel safe:** No — touches shared export index and types
- **Estimated time:** 20 minutes
- **Dependencies:** None
- **Agent prompt:**
  "In the src/export/ directory (or wherever the export generators live), find and delete all generator files for AutoGen, CrewAI, and LangGraph. Update the generator index to only keep the VAB-native/AUTOPILATE exports. Also clean up any imports of these dead generators in other files. Search the entire codebase with grep for 'autogen', 'crewai', 'langgraph' (case-insensitive) and remove every reference. Make sure `npm run build` passes with zero errors after cleanup."
- **Verify:**
  - [ ] `grep -ri 'autogen\|crewai\|langgraph' src/` returns zero results
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes
  - [ ] Commit: `git commit -m "refactor(export): remove dead AutoGen/CrewAI/LangGraph generators" -- [files]`

### Task 2: Clean Config Types

- **Blast radius:** Medium (5-10 files — types ripple through imports)
- **Parallel safe:** No — types are imported everywhere
- **Estimated time:** 25 minutes
- **Dependencies:** Task 1
- **Agent prompt:**
  "In src/types/config.ts, remove the ExportFramework union members for 'autogen', 'crewai', and 'langgraph'. Remove the interfaces LangGraphOptions, CrewAIOptions, and AutoGenOptions. Search the entire codebase for any usage of these removed types and update or remove them. If ExportFramework had these as options, simplify it to just 'autopilate' or remove the union entirely if there's only one option left. Make sure all TypeScript compilation passes. Check ConfigModal.tsx, StatusPanel.tsx, and any export-related files for references to the dead types."
- **Verify:**
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] `grep -ri 'LangGraphOptions\|CrewAIOptions\|AutoGenOptions\|ExportFramework' src/` — only valid references remain
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "refactor(types): strip dead framework type definitions" -- [files]`

### Task 3: Clean ConfigModal UI

- **Blast radius:** Small (1-3 files)
- **Parallel safe:** No — depends on Task 2 type changes
- **Estimated time:** 15 minutes
- **Dependencies:** Task 2
- **Agent prompt:**
  "In src/config/ConfigModal.tsx, find and remove the option panels for LangGraph, CrewAI, and AutoGen configuration. This should be roughly 200+ lines of conditional rendering for framework-specific options. Remove the framework selector dropdown from the toolbar if it exists. Keep all AUTOPILATE-native configuration panels (model selection, system prompt, tools, MCP servers, skills, memory, thinking mode, token limits, temperature). Make sure the component renders correctly after cleanup. Also check the toolbar component for any framework selector dropdown and remove it."
- **Verify:**
  - [ ] ConfigModal renders without errors
  - [ ] No framework selector dropdown visible in toolbar
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "refactor(config): remove dead framework UI panels from ConfigModal" -- [files]`

### Task 4: Clean StatusPanel and Remaining References

- **Blast radius:** Small (3-5 files)
- **Parallel safe:** No — final cleanup sweep
- **Estimated time:** 15 minutes
- **Dependencies:** Task 3
- **Agent prompt:**
  "Do a final sweep of the entire codebase. Check StatusPanel.tsx for any dead framework references and clean them. Check all import statements across the project — any import that references deleted files should be removed. Run `npm run build && npm run lint` and fix any remaining issues. After this task, there should be zero references to AutoGen, CrewAI, or LangGraph anywhere in the project. Do a final grep to confirm: `grep -ri 'autogen\|crewai\|langgraph' src/`"
- **Verify:**
  - [ ] `grep -ri 'autogen\|crewai\|langgraph' src/` returns zero results
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes
  - [ ] App loads in browser without console errors
  - [ ] Commit: `git commit -m "refactor: complete dead framework cleanup — zero references remain" -- [files]`

---

## Sprint 2: System Bundle Export (Day 1-2 — Mostly Sequential)

Goal: Replace generic export with an AUTOPILATE System Bundle. Clicking "Export System Bundle" produces a ZIP with system.json manifest, per-agent CLAUDE.md files, MCP configs, PM2 ecosystem file, and .env.example.

### Task 5: Define SystemManifest and Bundle Types

- **Blast radius:** Small (2-3 files)
- **Parallel safe:** No — types used by all subsequent tasks
- **Estimated time:** 15 minutes
- **Dependencies:** Task 4
- **Agent prompt:**
  "Create src/export/types.ts with the core types for the AUTOPILATE System Bundle. Define a SystemManifest interface with: name (string), slug (string, URL-safe), description (string), version (string), category ('web-development' | 'content-production' | 'research' | 'data-analysis' | 'monitoring'), requiredInputs (array of {name, type, description, required}), outputType ('web_artifact' | 'document' | 'data' | 'notification'), estimatedCostUsd (number), triggerPattern ('cron' | 'webhook' | 'messaging' | 'always-on'), nodeCount (number), and edgeCount (number). Define a SystemBundle interface with: manifest (SystemManifest), canvasJson (the full React Flow state), agentConfigs (Record<string, AgentConfig> — one per agent node), mcpConfigs (array of MCP server registrations), pm2Ecosystem (PM2 ecosystem config object), envExample (Record<string, string> — env var names to descriptions), and createdAt (ISO string). Also create src/types/system.ts with DeploymentRecord and ExecutionLog types matching the database schema from spec.md."
- **Verify:**
  - [ ] `npx tsc --noEmit` passes
  - [ ] Types are importable from other modules
  - [ ] Commit: `git commit -m "feat(export): define SystemManifest and SystemBundle types" -- src/export/types.ts src/types/system.ts`

### Task 6: Build the Bundle Generator

- **Blast radius:** Medium (3-5 files)
- **Parallel safe:** No — core export logic
- **Estimated time:** 40 minutes
- **Dependencies:** Task 5
- **Agent prompt:**
  "Create src/export/bundle-generator.ts. This function takes the React Flow canvas state (nodes and edges from the Zustand store) and produces a SystemBundle object. It should: 1) Extract the manifest from canvas metadata (if the canvas has a name/description) or generate defaults. 2) Iterate over all agent-type nodes and generate an AgentConfig for each, including model selection, system prompt, tool grants, MCP server connections, and memory config from the node's data. 3) Collect all MCP server registrations across all nodes into a deduplicated list. 4) Generate a PM2 ecosystem config with one process per agent node, including env vars and memory limits. 5) Generate an .env.example listing all required API keys and secrets found across node configs. 6) Strip React Flow internal properties (selected, dragging, width, height) from the canvas JSON — only keep user-meaningful state. Export a function `generateSystemBundle(nodes, edges, metadata): SystemBundle`. Read the existing export code in the project to understand how canvas state is currently accessed."
- **Verify:**
  - [ ] Function compiles and is importable
  - [ ] `npx tsc --noEmit` passes
  - [ ] Commit: `git commit -m "feat(export): system bundle generator" -- src/export/bundle-generator.ts`

### Task 7: Build CLAUDE.md Generator

- **Blast radius:** Small (1-2 files)
- **Parallel safe:** Yes — parallel with Task 8
- **Estimated time:** 25 minutes
- **Dependencies:** Task 6
- **Agent prompt:**
  "Create src/export/claude-md-generator.ts. This generates a per-agent CLAUDE.md file from an AgentConfig. The output should be a Markdown string with sections: Agent Role (the system prompt), Tools (list of granted tools with one-liner descriptions), MCP Servers (server names and connection details), Model (model name and settings like temperature, max tokens), Memory (memory configuration), and Constraints (any limits or rules). The format should match what OpenClaw expects for agent configuration files. Export a function `generateClaudeMd(agentConfig: AgentConfig, systemContext: string): string` where systemContext is a brief description of the overall system this agent belongs to."
- **Verify:**
  - [ ] Output is valid Markdown
  - [ ] Contains all config sections from a test AgentConfig
  - [ ] `npx tsc --noEmit` passes
  - [ ] Commit: `git commit -m "feat(export): per-agent CLAUDE.md generator" -- src/export/claude-md-generator.ts`

### Task 8: Build PM2 Config Generator

- **Blast radius:** Small (1-2 files)
- **Parallel safe:** Yes — parallel with Task 7
- **Estimated time:** 20 minutes
- **Dependencies:** Task 6
- **Agent prompt:**
  "Create src/export/pm2-config-generator.ts. This generates a PM2 ecosystem config file (ecosystem.config.js format) from a SystemBundle. Each agent node becomes a PM2 app entry with: name (system slug + agent name), script (path to the OpenClaw agent runner), args (agent config path), env (required environment variables), max_memory_restart ('512M' default), autorestart (true), watch (false), and instances (1). Export a function `generatePm2Config(bundle: SystemBundle): object`. The output should be a valid PM2 ecosystem config object that can be JSON.stringified and written to a file."
- **Verify:**
  - [ ] Output matches PM2 ecosystem format
  - [ ] `npx tsc --noEmit` passes
  - [ ] Commit: `git commit -m "feat(export): PM2 ecosystem config generator" -- src/export/pm2-config-generator.ts`

### Task 9: Wire Up Export UI and ZIP Packaging

- **Blast radius:** Medium (4-6 files)
- **Parallel safe:** No — touches toolbar and export flow
- **Estimated time:** 30 minutes
- **Dependencies:** Tasks 7, 8
- **Agent prompt:**
  "Wire the bundle generator into the VAB toolbar. Replace the old export menu with three options: 'Export JSON' (save/load canvas state), 'Export System Bundle' (generates ZIP), and 'Export CLAUDE.md' (reference file). For the System Bundle export: call generateSystemBundle() with the current canvas state, generate CLAUDE.md files for each agent, generate the PM2 config, then package everything into a ZIP file using JSZip (install it if not already available). The ZIP structure should be: system.json (the manifest), canvas.json (the canvas state), agents/ (directory with one CLAUDE.md per agent node), mcp/ (directory with MCP server configs), ecosystem.config.js (PM2 config), and .env.example. Trigger a browser download of the ZIP. Add a brief confirmation toast or modal after successful export."
- **Verify:**
  - [ ] Clicking 'Export System Bundle' downloads a .zip file
  - [ ] ZIP contains all expected files (system.json, canvas.json, agents/, mcp/, ecosystem.config.js, .env.example)
  - [ ] 'Export JSON' still works for save/load
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(export): system bundle ZIP export with UI wiring" -- [files]`

### Task 10: Write Export Tests

- **Blast radius:** Small (new test files only)
- **Parallel safe:** Yes
- **Estimated time:** 20 minutes
- **Dependencies:** Task 9
- **Agent prompt:**
  "Write tests for the export system in tests/export/. Test the bundle generator with a mock canvas state containing 3 agent nodes and 2 edges. Verify the SystemManifest has correct node/edge counts. Verify each agent node produces an AgentConfig with model, system prompt, and tools. Test the CLAUDE.md generator produces valid Markdown with all sections. Test the PM2 config generator produces a valid ecosystem config with one app per agent. Create a minimal fixture in tests/fixtures/mock-canvas.json with a representative 3-node workflow. Use Vitest."
- **Verify:**
  - [ ] `npm run test -- tests/export/` passes
  - [ ] Commit: `git commit -m "test(export): bundle generator, CLAUDE.md generator, PM2 config tests" -- tests/export/ tests/fixtures/mock-canvas.json`

---

## Sprint 3: Deploy Bridge + Systems Library (Day 2-4)

Goal: Server-side deployment infrastructure. Deploy Bridge translates bundles into running OpenClaw processes. Systems Library catalogs deployed systems. Dashboard shows status.

### Task 11: PostgreSQL Schema and Migration

- **Blast radius:** Large (schema + migration files + DB client)
- **Parallel safe:** No — everything depends on this
- **Estimated time:** 30 minutes
- **Dependencies:** Sprint 2 complete
- **Agent prompt:**
  "Create the PostgreSQL schema for AUTOPILATE. Create a migration file at src/server/migrations/20260219_000001_initial_schema.ts with up() and down() functions. Create three tables: deployments (id uuid PK default gen_random_uuid(), system_name varchar(255), system_slug varchar(128) unique, manifest_json jsonb, canvas_json jsonb, openclaw_config jsonb, trigger_type varchar(50), trigger_config jsonb, pm2_process_name varchar(128), status varchar(20) default 'deployed', secrets_encrypted bytea, deployed_at timestamptz default now(), created_at timestamptz default now(), updated_at timestamptz default now()), execution_logs (id uuid PK, deployment_id uuid FK references deployments(id), triggered_by varchar(50), trigger_input jsonb, status varchar(20), phases_completed int, phases_total int, output_url text, output_type varchar(50), cost_usd decimal(10,4), duration_seconds int, qa_scores jsonb, error_message text, started_at timestamptz, completed_at timestamptz), and operator_actions (id uuid PK, deployment_id uuid FK, operator_type varchar(30), action_type varchar(50), description text, before_state jsonb, after_state jsonb, auto_applied boolean default false, approved boolean, created_at timestamptz default now()). Add indexes on deployment_id for both execution_logs and operator_actions. Also create src/server/db.ts with a pg Pool connection using DATABASE_URL env var, and a runMigrations() function that reads and executes migration files in order. Add a 'migrate' script to package.json."
- **Verify:**
  - [ ] `npm run migrate` creates all three tables
  - [ ] `psql $DATABASE_URL -c '\dt'` shows deployments, execution_logs, operator_actions
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(server): PostgreSQL schema and migration infrastructure" -- [files]`

### Task 12: Deployment Registry API

- **Blast radius:** Medium (4-6 files)
- **Parallel safe:** No — other tasks depend on the API
- **Estimated time:** 35 minutes
- **Dependencies:** Task 11
- **Agent prompt:**
  "Create the deployment registry module and API routes. Create src/deploy/registry.ts with functions: registerSystem(bundle: SystemBundle): Promise<DeploymentRecord>, getSystem(slug: string): Promise<DeploymentRecord | null>, listSystems(): Promise<DeploymentRecord[]>, updateSystemStatus(slug: string, status: string): Promise<void>, archiveSystem(slug: string): Promise<void>. All functions use the pg Pool from db.ts. Then create src/server/routes/systems.ts with Express routes: GET /api/systems (list all), POST /api/systems (register from bundle), GET /api/systems/:slug (get one), PUT /api/systems/:slug (update), DELETE /api/systems/:slug (archive). Use Zod for request validation. Return JSON responses with proper error handling (try/catch, typed errors). Also create the Express server entry at src/server/index.ts if it doesn't exist — basic Express app with JSON parsing, CORS for localhost:5173, and the systems routes mounted."
- **Verify:**
  - [ ] `curl localhost:3001/api/systems` returns `[]`
  - [ ] POST with a test bundle creates a deployment record
  - [ ] GET by slug returns the created record
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(deploy): deployment registry API with CRUD routes" -- [files]`

### Task 13: Deploy Bridge — Canvas to OpenClaw Translation

- **Blast radius:** Medium (3-5 files)
- **Parallel safe:** No — core deploy logic
- **Estimated time:** 45 minutes
- **Dependencies:** Task 12
- **Agent prompt:**
  "Create src/deploy/deploy-bridge.ts. This is the critical translation layer between AUTOPILATE canvas state and OpenClaw runtime configuration. The main function `deploySystem(bundle: SystemBundle, openclawRoot: string): Promise<DeploymentRecord>` should: 1) Write per-agent CLAUDE.md config files to OpenClaw's expected directory (openclawRoot/agents/system-slug/agent-name/). 2) Write MCP server configs to the appropriate OpenClaw config directory. 3) Generate the trigger configuration based on bundle.manifest.triggerPattern — for cron, create a cron job config; for webhook, register a webhook endpoint; for messaging, configure the channel routing; for always-on, set daemon mode. Create src/deploy/trigger-factory.ts with a function per trigger type. 4) Register the system in the PostgreSQL deployment registry. 5) Start the PM2 process using the generated ecosystem config. Create src/deploy/pm2-manager.ts with functions: startProcess(config), stopProcess(name), restartProcess(name), getProcessStatus(name), listProcesses(). Use PM2's programmatic API (pm2 npm package). After starting, poll for 'online' status before returning success. The deploySystem function should be atomic — if any step fails, clean up partial artifacts."
- **Verify:**
  - [ ] Deploy a test bundle — files appear in OpenClaw directory
  - [ ] PM2 process starts and shows 'online' status
  - [ ] Deployment record appears in PostgreSQL
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(deploy): deploy bridge with OpenClaw translation, trigger factory, PM2 management" -- [files]`

### Task 14: Deploy UI — Button and Deployment Modal

- **Blast radius:** Small (2-4 files)
- **Parallel safe:** Yes — after Task 13
- **Estimated time:** 25 minutes
- **Dependencies:** Task 13
- **Agent prompt:**
  "Add a Deploy button to the VAB toolbar next to the Export button. Clicking it opens a deployment modal with: System Name (auto-populated from canvas name), System Slug (auto-generated from name, editable), Trigger Type (dropdown: Cron Schedule, Webhook, Messaging Channel, Always-On), trigger-specific config fields (cron expression input for cron, webhook URL display for webhook, channel selector for messaging), and a Deploy button. On submit, the modal calls the bundle generator, then POST /api/systems to register, then calls the deploy bridge endpoint to push to OpenClaw. Show a progress indicator during deployment and a success/error state at the end. Keep the modal under 300 lines — if it's getting long, extract the trigger config fields into a separate component."
- **Verify:**
  - [ ] Deploy button visible in toolbar
  - [ ] Modal opens with all fields
  - [ ] Trigger type changes show appropriate config fields
  - [ ] Successful deploy shows confirmation
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(deploy): deployment modal with trigger configuration" -- [files]`

### Task 15: Systems Dashboard

- **Blast radius:** Medium (4-6 files — new dashboard module)
- **Parallel safe:** Yes — parallel with Task 14
- **Estimated time:** 35 minutes
- **Dependencies:** Task 12
- **Agent prompt:**
  "Create the Systems Dashboard at src/library/SystemsDashboard.tsx and src/library/SystemDetail.tsx. The dashboard is a new page/panel (add routing if the app has a router, or a tab if it's single-page). SystemsDashboard lists all deployed systems from GET /api/systems as cards showing: system name, status (deployed/stopped/errored with color badge), trigger type, last execution time, total executions count, and total cost. Each card links to SystemDetail. SystemDetail shows: system overview (name, description, trigger config, deployed date), execution history (table of recent executions with status, duration, cost, output link), PM2 process status (online/stopped/errored), and action buttons (Stop, Restart, Redeploy, Archive). Fetch data from the systems API. Use polling every 10 seconds for status updates (we'll add WebSocket streaming later). Keep each component under 300 lines."
- **Verify:**
  - [ ] Dashboard renders with system cards
  - [ ] Clicking a card shows system detail
  - [ ] Status badges update on poll
  - [ ] Action buttons call appropriate API endpoints
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(library): systems dashboard and detail views" -- [files]`

### Task 16: Deploy Bridge Tests

- **Blast radius:** Small (new test files only)
- **Parallel safe:** Yes
- **Estimated time:** 25 minutes
- **Dependencies:** Task 13
- **Agent prompt:**
  "Write tests for the deploy bridge in tests/deploy/. Test the trigger factory generates correct configs for each trigger type (cron, webhook, messaging, always-on). Test the PM2 manager by mocking PM2's programmatic API — verify startProcess calls pm2.start with correct config, verify restartProcess polls for online status. Test the deploy bridge's atomic cleanup — if PM2 start fails, verify that written files are cleaned up and the deployment record is not created. Test the registry functions against a test PostgreSQL database (create a test DB, run migrations, execute tests, drop DB). Use Vitest."
- **Verify:**
  - [ ] `npm run test -- tests/deploy/` passes
  - [ ] Commit: `git commit -m "test(deploy): deploy bridge, trigger factory, PM2 manager, registry tests" -- tests/deploy/`

---

## Sprint 4: OpenClaw Integration + Router Agent (Day 4-6)

Goal: Connect to a running OpenClaw instance. Router Agent classifies messages, gathers inputs, triggers systems, maintains session context.

### Task 17: OpenClaw Gateway Connection

- **Blast radius:** Medium (3-5 files)
- **Parallel safe:** No — router and log streaming depend on this
- **Estimated time:** 30 minutes
- **Dependencies:** Sprint 3 complete
- **Agent prompt:**
  "Create src/server/openclaw-client.ts — the client that connects AUTOPILATE to the running OpenClaw gateway. It should: 1) Connect to OpenClaw's WebSocket API (read the OpenClaw docs for the exact protocol). 2) Subscribe to system events: agent execution started, execution completed, execution failed, log output. 3) Forward execution events to our PostgreSQL execution_logs table. 4) Forward log output to Redis pub/sub channels keyed by deployment slug for live streaming to the dashboard. Export functions: connectToGateway(url: string), subscribeToSystem(slug: string), unsubscribeFromSystem(slug: string). Handle reconnection with exponential backoff. Read OpenClaw's gateway documentation or source code to understand the exact WebSocket message format."
- **Verify:**
  - [ ] Client connects to OpenClaw gateway
  - [ ] Events from OpenClaw appear in execution_logs table
  - [ ] Log output published to Redis channels
  - [ ] Reconnects after disconnect
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(server): OpenClaw gateway WebSocket client with event forwarding" -- [files]`

### Task 18: Live Log Streaming

- **Blast radius:** Small (2-3 files)
- **Parallel safe:** Yes — after Task 17
- **Estimated time:** 20 minutes
- **Dependencies:** Task 17
- **Agent prompt:**
  "Add WebSocket-based live log streaming to the dashboard. In the server, create a WebSocket endpoint at /api/systems/:slug/stream that subscribes to the Redis pub/sub channel for that system slug and forwards messages to the WebSocket client. In the dashboard, update SystemDetail.tsx (or create a new LogStream.tsx component) to connect to this WebSocket and display streaming log output in a scrollable terminal-style panel. Use a monospace font, auto-scroll to bottom, with a toggle to pause auto-scroll. Keep the log panel under 300 lines."
- **Verify:**
  - [ ] WebSocket connects when viewing system detail
  - [ ] Log output appears in real-time during execution
  - [ ] Auto-scroll works and can be paused
  - [ ] WebSocket disconnects cleanly on navigation away
  - [ ] Commit: `git commit -m "feat(dashboard): live log streaming via WebSocket + Redis pub/sub" -- [files]`

### Task 19: Router Agent — Message Classification

- **Blast radius:** Medium (3-4 files)
- **Parallel safe:** No — core router logic
- **Estimated time:** 40 minutes
- **Dependencies:** Task 17
- **Agent prompt:**
  "Create src/router/router-agent.ts — the Router Agent that sits between OpenClaw messaging channels and the Systems Library. The router receives inbound messages from OpenClaw (via the gateway client events) and makes one of three decisions: 1) Direct answer — simple question, respond directly without triggering a system. 2) Clarify — message maps to a system but lacks required inputs, enter input-gathering mode. 3) Trigger system — message clearly maps to a system with sufficient context. Create src/router/system-matcher.ts with a function `matchSystem(message: string, systemManifests: SystemManifest[]): { system: SystemManifest | null, confidence: number, missingInputs: string[] }`. Use Claude API for semantic classification — send the message along with all system manifests (descriptions, input requirements, capability keywords) and ask for a classification response. Parse the LLM response into the structured match result. Keep the Claude API call in a separate function so it can be mocked in tests."
- **Verify:**
  - [ ] 'build a landing page' matches a web design system manifest
  - [ ] 'what time is it' returns no system match (direct answer)
  - [ ] 'build me a website' matches web design but flags missing inputs
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(router): message classification and system matching" -- [files]`

### Task 20: Router Agent — Input Gathering and Session Management

- **Blast radius:** Medium (3-4 files)
- **Parallel safe:** No — extends router
- **Estimated time:** 35 minutes
- **Dependencies:** Task 19
- **Agent prompt:**
  "Create src/router/input-gatherer.ts and src/router/session-manager.ts. The input gatherer handles conversational input collection when the router identified a system but has missing inputs. It should: 1) Read the system's requiredInputs from the manifest. 2) Identify which inputs are missing from the original message. 3) Generate natural conversational prompts for each missing input using Claude. 4) Collect responses via the messaging channel. 5) Compile all inputs into a structured brief (JSON). The session manager maintains context across a system's lifecycle. When a system produces output and delivers it, the session stays open for that messaging thread. If the user responds with feedback ('the hero section is too cramped'), the session manager recognizes it as referring to the most recent execution and routes it as a revision brief — not a new system trigger. Use Redis for session storage with a TTL of 24 hours. Export: `gatherInputs(systemManifest, message, channelId): Promise<Brief>` and `SessionManager` class with methods: createSession, getSession, updateSession, isRevisionFeedback."
- **Verify:**
  - [ ] Input gatherer asks for missing fields in natural language
  - [ ] Compiled brief contains all required inputs
  - [ ] Session persists across messages in same thread
  - [ ] Feedback after output delivery routes as revision, not new trigger
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(router): input gathering and session management for feedback loops" -- [files]`

### Task 21: Router Agent Tests

- **Blast radius:** Small (new test files only)
- **Parallel safe:** Yes
- **Estimated time:** 25 minutes
- **Dependencies:** Task 20
- **Agent prompt:**
  "Write tests for the router in tests/router/. Create test fixtures with 3-4 mock system manifests (web design, content factory, SEO audit). Test system-matcher.ts: mock the Claude API response and verify classification for 'build a landing page' (match web design, high confidence), 'write a blog post about AI' (match content factory), 'what time is it in Tokyo' (no match — direct answer), 'build me a website' (match web design, missing inputs flagged). Test input-gatherer.ts: mock conversational flow, verify brief compilation. Test session-manager.ts: create session, retrieve session, verify revision detection for post-output feedback. Mock all LLM calls and Redis."
- **Verify:**
  - [ ] `npm run test -- tests/router/` passes
  - [ ] Commit: `git commit -m "test(router): classification, input gathering, session management tests" -- tests/router/`

---

## Sprint 5: Operator Agents + Self-Healing (Day 6-8)

Goal: Deploy the three operator agents. System Monitor auto-fixes failures. QA Remediation handles quality issues. Optimization Agent improves systems over time.

### Task 22: System Monitor Agent

- **Blast radius:** Medium (3-4 files)
- **Parallel safe:** No — touches deploy and server modules
- **Estimated time:** 40 minutes
- **Dependencies:** Sprint 4 complete
- **Agent prompt:**
  "Create src/operators/system-monitor.ts — the System Monitor that runs on a 5-minute cron. It should: 1) List all PM2 processes for deployed AUTOPILATE systems via the pm2-manager. 2) Check for crashed, errored, or stalled processes. 3) Read recent execution logs from the deployment registry for error patterns. 4) Diagnose root causes by analyzing error output with Claude (expired API key, rate limit, malformed config, dependency failure, timeout, OOM). 5) Apply the appropriate fix: for expired keys, check if a rotation is possible; for rate limits, add a fallback model to the failover chain; for timeouts, increase the limit; for OOM, raise memory limit. 6) Restart the process via pm2-manager. 7) Log the action to the operator_actions table. 8) Send a notification summarizing what happened and what was fixed. Export a function `runSystemMonitor(): Promise<OperatorAction[]>` that returns all actions taken. Also create a cron registration function that schedules this to run every 5 minutes via OpenClaw's cron service."
- **Verify:**
  - [ ] Monitor detects a stopped PM2 process
  - [ ] Correct diagnosis for test error scenarios
  - [ ] Process restarts after fix
  - [ ] Action logged to operator_actions table
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(operators): system monitor with auto-diagnosis and self-healing" -- [files]`

### Task 23: QA Remediation Agent

- **Blast radius:** Medium (3-4 files)
- **Parallel safe:** Yes — parallel with Task 22 if touching different files
- **Estimated time:** 40 minutes
- **Dependencies:** Sprint 4 complete
- **Agent prompt:**
  "Create src/operators/qa-remediation.ts — the QA Remediation Agent that activates on QA FAIL events. It should: 1) Read the QA scores from the execution log (qa_scores jsonb field). 2) Identify which quality dimensions failed (below 85 threshold: Technical Quality, Accessibility, SEO, Strategic Alignment, Copy Quality, Brand Consistency, UX/Usability). 3) Map each failed dimension to the responsible pipeline node using a configurable mapping (Technical Quality → Frontend Engineer, Accessibility → UX/UI Architect, SEO → Perf & SEO Engineer, etc.). 4) Feed the QA auditor's specific recommendations as additional constraints into those nodes' system prompts by patching the deployment config. 5) Re-execute only the affected pipeline phases — not the entire system. Use the deploy bridge to update the affected agent configs and trigger a partial re-run. 6) After re-execution, check if QA passes. If not, repeat up to MAX_QA_ITERATIONS (3). 7) If still failing after 3 iterations, escalate to user with a summary. Log all actions to operator_actions. Export: `runQaRemediation(executionLog: ExecutionLog): Promise<OperatorAction[]>`"
- **Verify:**
  - [ ] Agent reads QA FAIL scores correctly
  - [ ] Maps failed dimensions to correct pipeline nodes
  - [ ] Patches only affected nodes' prompts
  - [ ] Re-execution runs only affected phases
  - [ ] Stops after 3 iterations if still failing
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(operators): QA remediation with targeted re-execution and iteration limit" -- [files]`

### Task 24: Optimization Agent

- **Blast radius:** Small (2-3 files)
- **Parallel safe:** Yes — parallel with Tasks 22, 23
- **Estimated time:** 30 minutes
- **Dependencies:** Task 12 (needs execution_logs data)
- **Agent prompt:**
  "Create src/operators/optimization-agent.ts — the Optimization Agent that runs on a weekly cron. It should: 1) Query the past week's execution history across all deployed systems from execution_logs. 2) Analyze cost per execution, duration, quality scores, failure rates, and model utilization patterns using Claude. 3) Identify three categories of optimization: cost optimization (e.g., downgrade models where quality is consistently high), reliability improvements (e.g., increase timeouts for frequently-timing-out nodes), and quality enhancements (e.g., add constraints to prompts for recurring QA issues). 4) Generate a structured optimization report with specific recommendations. 5) For each recommendation, indicate whether it's auto-appliable (low risk: timeout changes, cost optimizations below $20/month) or requires approval (structural: prompt rewrites, model swaps). 6) Auto-apply low-risk changes immediately and log to operator_actions. 7) Store approval-required changes as pending in operator_actions (approved = null). 8) Deliver the report via the messaging channel. Export: `runOptimizationAgent(): Promise<OptimizationReport>`"
- **Verify:**
  - [ ] Agent queries execution history correctly
  - [ ] Report contains categorized recommendations
  - [ ] Low-risk changes auto-applied
  - [ ] High-risk changes stored as pending
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(operators): weekly optimization agent with risk-based auto-apply" -- [files]`

### Task 25: Operator Action Approval API

- **Blast radius:** Small (2-3 files)
- **Parallel safe:** Yes
- **Estimated time:** 20 minutes
- **Dependencies:** Tasks 22-24
- **Agent prompt:**
  "Add API routes for operator action management. In src/server/routes/, create an operators route file with: GET /api/operators/actions (list recent actions, filterable by operator_type and approved status), GET /api/operators/actions/pending (list pending approvals), POST /api/operators/actions/:id/approve (approve a pending action and apply it), POST /api/operators/actions/:id/reject (reject a pending action). When an action is approved, the API should apply the change (call the appropriate deploy bridge function to update the system config and restart if needed). Add an Operator Actions panel to the dashboard showing recent actions and pending approvals with approve/reject buttons."
- **Verify:**
  - [ ] GET /api/operators/actions returns action history
  - [ ] Pending actions listed separately
  - [ ] Approving an action applies the change
  - [ ] Dashboard shows operator actions panel
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "feat(operators): action approval API and dashboard panel" -- [files]`

### Task 26: Operator Agent Tests

- **Blast radius:** Small (new test files only)
- **Parallel safe:** Yes
- **Estimated time:** 25 minutes
- **Dependencies:** Tasks 22-25
- **Agent prompt:**
  "Write tests for all three operator agents in tests/operators/. Test system-monitor: mock PM2 status to return a crashed process, mock Claude diagnosis, verify correct fix is applied and process restarted. Test qa-remediation: mock an execution log with QA FAIL scores, verify correct node mapping, verify prompt patching, verify iteration limit of 3. Test optimization-agent: mock execution history data, verify recommendations are categorized correctly, verify auto-apply logic for low-risk changes. Mock all external dependencies: PM2, Claude API, PostgreSQL, Redis."
- **Verify:**
  - [ ] `npm run test -- tests/operators/` passes
  - [ ] Commit: `git commit -m "test(operators): system monitor, QA remediation, optimization agent tests" -- tests/operators/`

---

## Sprint 6: Polish, Hardening, and Integration Testing (Day 8-10)

Goal: Error handling, security, configuration UI improvements, and end-to-end testing.

### Task 27: Comprehensive Error Handling

- **Blast radius:** Small changes across many files
- **Parallel safe:** No — touches many files
- **Estimated time:** 30 minutes
- **Dependencies:** All previous sprints
- **Agent prompt:**
  "Audit the entire codebase for error handling. Create src/shared/errors.ts with a base AutopilateError class and specific subclasses: DeploymentError, ExportError, RouterError, OperatorError, DatabaseError, OpenClawConnectionError. Each should include a code string, message, and optional cause. Replace all raw throws with typed errors. Ensure every Express route handler has try/catch wrapping with proper error responses. Ensure WebSocket connections handle errors and close events. Ensure PM2 operations handle failures gracefully. Ensure database queries handle connection errors. Edge cases to handle: empty canvas export (clear error), deploy with no OpenClaw running (clear error), router with no systems registered (direct answer mode), operator with no execution history (skip silently)."
- **Verify:**
  - [ ] Empty canvas export gives clear error message
  - [ ] Deploy without OpenClaw gives clear error
  - [ ] No unhandled promise rejections
  - [ ] `npm run build` succeeds
  - [ ] Commit: `git commit -m "fix: comprehensive typed error handling across all modules" -- [files]`

### Task 28: Security Hardening

- **Blast radius:** Small (3-5 files)
- **Parallel safe:** Yes — after Task 27
- **Estimated time:** 25 minutes
- **Dependencies:** Task 27
- **Agent prompt:**
  "Add security hardening. 1) Create src/server/middleware/auth.ts — API key authentication middleware that validates X-API-Key header against an env var. Apply to all /api/ routes except /api/health. 2) Implement secret encryption in the deployment registry: use Node.js crypto with AES-256-GCM to encrypt secrets_encrypted column. Create encrypt/decrypt helper functions. 3) Validate that CONDUIT_ALLOWED_PATHS equivalent restrictions exist for the Fixer Agent's filesystem access. 4) Add webhook signature verification (HMAC-SHA256) for incoming webhook triggers. 5) Ensure PostgreSQL and Redis only listen on localhost (verify in connection configs). 6) Add rate limiting middleware for the API (100 requests per minute per IP). Never hardcode API keys — verify with grep."
- **Verify:**
  - [ ] API calls without X-API-Key return 401
  - [ ] Secrets stored encrypted in database
  - [ ] `grep -r 'sk-\|sk_\|password' src/` — no hardcoded secrets
  - [ ] Rate limiter rejects excessive requests
  - [ ] Commit: `git commit -m "fix: security hardening — auth, encryption, rate limiting, webhook signatures" -- [files]`

### Task 29: Integration Tests

- **Blast radius:** Small (new test files only)
- **Parallel safe:** Yes — parallel with Task 28
- **Estimated time:** 35 minutes
- **Dependencies:** Task 27
- **Agent prompt:**
  "Write integration tests that test the full pipeline. Create tests/integration/. Test 1: Full export-to-deploy — create a mock 3-node canvas, generate a bundle, POST it to the systems API, verify deployment record created, verify PM2 config generated (mock PM2). Test 2: Router classification — register 3 test systems, send test messages, verify correct classification and routing. Test 3: Operator cycle — create a deployment with a mock failed execution, run the system monitor, verify it diagnoses and 'fixes' the issue. All integration tests use a test PostgreSQL database (separate from dev). Create a test setup that runs migrations before tests and drops the DB after."
- **Verify:**
  - [ ] `npm run test -- tests/integration/` passes
  - [ ] Tests use a separate test database
  - [ ] Commit: `git commit -m "test: end-to-end integration tests for export→deploy→route→operator pipeline" -- tests/integration/`

### Task 30: Documentation and README

- **Blast radius:** Small (2-3 files)
- **Parallel safe:** Yes
- **Estimated time:** 20 minutes
- **Dependencies:** All previous tasks
- **Agent prompt:**
  "Write a README.md for AUTOPILATE. Include: what it is (2-3 sentences), architecture overview (brief — point to docs/spec.md for detail), prerequisites (Node 20+, PostgreSQL, Redis, PM2, OpenClaw), quick start (clone, npm install, setup DB, configure env, start dev server, start OpenClaw), development commands (build, test, lint, migrate), project structure overview (brief folder descriptions), and links to docs/spec.md, docs/sprint-plan.md, and the whitepaper. Keep it concise and developer-focused. Also update package.json with correct metadata: name, version, description, scripts (dev, build, test, lint, migrate)."
- **Verify:**
  - [ ] README is clear and complete
  - [ ] All commands in README actually work
  - [ ] package.json scripts are correct
  - [ ] Commit: `git commit -m "docs: README, package.json metadata" -- README.md package.json`

---

## Task Summary

| Sprint | Tasks | Parallel? | Total Time Est. |
|--------|-------|-----------|-----------------|
| 1: Clean Slate | 1-4 | Sequential | 75 min |
| 2: System Bundle Export | 5-10 | Tasks 7+8 parallel, 10 parallel | 155 min (120 min wall) |
| 3: Deploy Bridge + Library | 11-16 | Tasks 14+15 parallel, 16 parallel | 195 min (150 min wall) |
| 4: OpenClaw + Router | 17-21 | Task 18 parallel, 21 parallel | 150 min (120 min wall) |
| 5: Operator Agents | 22-26 | Tasks 22+23+24 parallel, 26 parallel | 155 min (100 min wall) |
| 6: Polish + Integration | 27-30 | Tasks 28+29+30 parallel | 110 min (70 min wall) |

**Total estimated agent time:** ~14 hours
**Total wall clock time with parallel execution:** ~10.5 hours (~2 working days)
**Total calendar time with testing/debugging buffer:** 8-10 working days
