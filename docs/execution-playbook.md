# AUTOPILATE — Execution Playbook

Your daily workflow. Exact commands. Follow in order.

---

## Morning Setup

```bash
# 1. Open Ghostty
open -a Ghostty

# 2. Start your tmux workspace
tmux new-session -s autopilate

# 3. Create pane layout (4 panes: main agent, parallel agent, dev server, build)
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0 && tmux split-window -v

# 4. Pane 3 (bottom-right) — Start Poltergeist build watcher
cd ~/Projects/autopilate
poltergeist haunt

# 5. Pane 2 (bottom-left) — Start Vite dev server
cd ~/Projects/autopilate
npm run dev

# 6. Pane 0 (top-left) — Start your main agent
cd ~/Projects/autopilate
claude --dangerously-skip-permissions

# 7. Pane 1 (top-right) — Ready for parallel agent
cd ~/Projects/autopilate
# Start second agent when you have a parallel-safe task:
# claude --dangerously-skip-permissions

# 8. Pull latest
git pull

# 9. Verify services are running
brew services list  # PostgreSQL and Redis should be 'started'
pm2 list            # Shows OpenClaw gateway if already deployed
```

---

## Task Execution Loop

For each task in `docs/sprint-plan.md`:

### 1. Check blast radius before starting

| If blast radius is... | Then... |
|---|---|
| Small (1-3 files) | Run 2-3 tasks in parallel across panes |
| Medium (5-15 files) | Run 1-2 tasks in parallel, watch closely |
| Large (15+ files) | Solo — one agent, full attention |

### 2. Paste the agent prompt

Copy the exact prompt from `sprint-plan.md` and paste into the agent's terminal pane. Don't modify it unless you have a specific reason.

### 3. Watch the first 30 seconds

Is the agent reading files first? Good — let it work. Switch to another pane.

Is it immediately writing code without reading anything? Interrupt:

> "Stop. Read the existing code in src/ first. Understand the patterns, then implement."

Is it asking clarifying questions? Answer briefly and let it continue.

### 4. Assign parallel tasks

While agent 1 works on Task N, check the sprint plan. If the next task is marked as parallel-safe and doesn't depend on Task N, paste it into agent 2's pane.

**Sprint-specific parallelism notes:**
- Sprint 1 (Tasks 1-4): All sequential. One agent.
- Sprint 2 (Tasks 5-10): Tasks 7+8 can run simultaneously. Task 10 can parallel with anything.
- Sprint 3 (Tasks 11-16): Tasks 14+15 can parallel after Task 13. Task 16 can parallel.
- Sprint 4 (Tasks 17-21): Task 18 can parallel with Task 19 after Task 17. Task 21 can parallel.
- Sprint 5 (Tasks 22-26): Tasks 22+23+24 can all run in parallel. Task 26 after all three.
- Sprint 6 (Tasks 27-30): Tasks 28+29+30 can all parallel after Task 27.

### 5. Monitor and intervene

If an agent takes longer than the estimated time:

```
Press Escape
Type: "what's the status?"
```

Read the response. Then:

| Situation | Action |
|---|---|
| Making progress, just slow | "Continue. Take your time." |
| Going in wrong direction | "Stop. The approach should be [X]. Try again." |
| Stuck on a specific error | Copy the error → `oracle -p "Fix this error in the AUTOPILATE deploy bridge" -f "src/deploy/**/*.ts"` → paste solution back |
| Panicked and reverted work | Re-run the same prompt. Add: "You have enough time. The approach is correct." |
| Confused about OpenClaw config format | `summarize "https://docs.openclaw.ai/configuration" --json` → paste into agent |

### 6. Verify each completed task

Every task in the sprint plan has a "Verify" checklist. Run through it:

```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Lint
npx biome check src/

# Run tests (if test task)
npm run test

# Visual check for UI tasks
peekaboo image --app "Chrome" --analyze "Does the dashboard/modal/panel look correct?"

# Database check (for schema tasks)
psql $DATABASE_URL -c '\dt'

# PM2 check (for deploy tasks)
pm2 list
```

### 7. Commit

```bash
# Only commit the files this task touched
git add [SPECIFIC_FILES]
git commit -m "[TYPE](scope): [description]"
```

### 8. Move to next task

---

## Recovery Patterns

### Agent panics, starts reverting its own work

Re-run the same prompt. Add:

> "You have enough time. The approach is correct. Take it step by step."

Second run almost always works. Fresh context eliminates whatever reasoning path led to the panic.

### Agent stuck in a loop, trying the same fix repeatedly

```
Press Escape
"What's the status? What have you tried?"
```

Read the summary. Then redirect:

> "Try a different approach: [your idea]. Don't repeat what you already tried."

Or escalate:

```bash
oracle -p "The AUTOPILATE deploy bridge is stuck on [specific problem]. Here's what's been tried: [summary]." -f "src/deploy/**/*.ts"
```

Paste Oracle's response back into the agent.

### Agent made a mess — multiple files broken

```bash
# Find the bad commit
git log --oneline -10

# Surgical rollback
git revert [commit-hash]

# Assign the task to a fresh agent session
# Kill current session, start new one, paste the same prompt
```

Never manually fix agent code. Ask another agent.

### Agent hallucinating OpenClaw APIs

OpenClaw's configuration model is the most common hallucination source. Feed fresh docs:

```bash
summarize "https://docs.openclaw.ai/getting-started" --json
```

Or point the agent at the OpenClaw source:

> "Read the OpenClaw source code in ~/Projects/openclaw/src/ to understand the actual config format. Don't guess."

### Agent hallucinating PM2 programmatic API

```bash
summarize "https://pm2.keymetrics.io/docs/usage/pm2-api/" --json
```

Paste the summary into the agent.

### Agent confused about React Flow state management

> "Read the existing canvas/store.ts to understand the Zustand store pattern. Follow the same pattern for new state. Don't introduce new state management."

### Hard logic bug — agent can't figure it out

```bash
oracle -p "Explain this bug and suggest a fix" -f "src/**/*.ts"
```

Paste Oracle's response back into your coding agent.

### Agent keeps saying "Done!" but output is wrong

Don't trust verbal confirmation. Always verify:

```bash
npm run build
npm run test
npx tsc --noEmit
# For deploy tasks: pm2 list
# For DB tasks: psql $DATABASE_URL -c 'SELECT count(*) FROM deployments'
```

### Context is rotting (agent repeats itself, contradicts earlier work)

Kill the session. Start fresh:

```bash
# Exit current agent session (Ctrl+C or /exit)
# Start fresh
claude --dangerously-skip-permissions
```

Watch for "Compacting..." messages — quality degrades after.

### Agent forgets it can run shell commands

> "Remember you can run shell commands. Try running `npm run build` to check your changes."

### Agent introduces dead framework references

If you see AutoGen, CrewAI, or LangGraph creeping back in:

> "Stop. We removed all AutoGen/CrewAI/LangGraph code in Sprint 1. Delete any references you just added. Run `grep -ri 'autogen\|crewai\|langgraph' src/` to verify."

---

## Sprint-by-Sprint Execution Guide

### Sprint 1: Clean Slate (Day 1 Morning, ~75 min)

All sequential. One agent, focused attention. Each task depends on the previous.

```
Pane 0: Task 1 (strip generators) → Task 2 (clean types) → Task 3 (clean ConfigModal) → Task 4 (final sweep)
Pane 1: Idle
```

### Sprint 2: System Bundle Export (Day 1 Afternoon, ~2 hrs wall)

Mostly sequential, with two parallel opportunities.

```
Pane 0: Task 5 (types) → Task 6 (bundle generator) → Task 7 (CLAUDE.md gen) → Task 9 (wire UI)
Pane 1: Task 8 (PM2 config gen — start after Task 6 done) → Task 10 (tests — start after Task 9)
```

### Sprint 3: Deploy Bridge + Library (Day 2-3, ~2.5 hrs wall)

Schema first, then API, then deploy bridge, then parallel UI tasks.

```
Pane 0: Task 11 (schema) → Task 12 (registry API) → Task 13 (deploy bridge) → Task 14 (deploy UI)
Pane 1: Task 15 (dashboard — start after Task 12) → Task 16 (tests — start after Task 13)
```

### Sprint 4: OpenClaw + Router (Day 4-5, ~2 hrs wall)

Gateway connection first, then parallel router and streaming work.

```
Pane 0: Task 17 (gateway client) → Task 19 (router classification) → Task 20 (input gathering)
Pane 1: Task 18 (log streaming — after Task 17) → Task 21 (router tests — after Task 20)
```

### Sprint 5: Operator Agents (Day 6-7, ~1.5 hrs wall)

All three operators can build in parallel, then tests.

```
Pane 0: Task 22 (system monitor) → Task 25 (approval API)
Pane 1: Task 23 (QA remediation) → Task 26 (operator tests)
Pane 2: Task 24 (optimization agent)
```

### Sprint 6: Polish + Integration (Day 8-9, ~1 hr wall)

Error handling first (touches many files), then parallel hardening.

```
Pane 0: Task 27 (error handling) → Task 28 (security)
Pane 1: Task 29 (integration tests — after Task 27)
Pane 2: Task 30 (README — after Task 27)
```

---

## End of Day

```bash
# 1. Review today's commits
git log --oneline --since="8 hours ago"

# 2. Run full test suite
npm run test

# 3. Build check
npm run build && npx tsc --noEmit

# 4. Lint
npx biome check src/

# 5. Check file sizes (300-line limit)
find src/ -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -n | tail -20

# 6. Verify no dead framework references crept back
grep -ri 'autogen\|crewai\|langgraph' src/ && echo "DEAD CODE FOUND" || echo "Clean"

# 7. Add any scar tissue to AGENTS.md
# If something went wrong today, tell your agent:
# "Add a note to the Common Agent Failure Patterns section of AGENTS.md about [what happened]"

# 8. Push
git push origin main
```

---

## Key Reminders

- **Retry before rewriting.** Bad result? Re-run the same prompt. Don't spend 10 minutes crafting a "better" one.
- **300-line file limit.** If any file approaches 300 lines, tell the agent to decompose it.
- **Tests in same context.** After each task, the SAME agent writes the tests. Don't open a fresh session.
- **Atomic commits.** One commit per completed task. Surgical rollback if needed.
- **Screenshots for UI work.** Use Peekaboo to verify ConfigModal, Dashboard, and Deploy Modal.
- **Feed OpenClaw docs before integration work.** Agents hallucinate config formats frequently. Use `summarize` on OpenClaw docs first.
- **Only one agent touches schema.** Database migrations are strictly solo tasks.
- **You are the Creative Director.** Architecture, taste, module boundaries, OpenClaw config patterns. Agents write code.
