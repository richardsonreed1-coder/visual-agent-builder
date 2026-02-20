# AUTOPILATE

AI agent design and orchestration platform. Design multi-agent systems visually, configure them with AI assistance, and deploy them to run on OpenClaw.

## What It Does

AUTOPILATE lets you design complex AI agent pipelines — like a research system with 12 coordinated agents — using a drag-and-drop visual builder. An AI-powered Configure Wizard analyzes your design for gaps, a Fixer Agent generates the missing configs, and a Deploy Bridge packages everything into a self-contained system that runs on the OpenClaw runtime.

**Design-time** (this repo): VAB canvas, Configure Wizard, Fixer Agent, Export Engine
**Runtime** (OpenClaw): Gateway, messaging channels, cron triggers, system execution, self-healing operators

## Quick Start

Prerequisites: Node.js v18+

```bash
# Install
npm install && cd server && npm install && cd ..

# Run (two terminals)
cd server && npm run dev       # Backend: localhost:3001
npm run dev                    # Frontend: localhost:5173
```

## Usage

1. **Design**: Drag agents, skills, tools, and MCPs from the library onto the canvas. Connect them with typed edges (delegation, data, control).
2. **Configure**: Click "Configure" to run the AI-powered gap analysis. Accept or reject suggestions per field.
3. **Fix**: Launch the Fixer Agent to auto-generate missing configs, API key placeholders, and system prompts.
4. **Export**: Export as an AUTOPILATE System Bundle — a deployable package with agent configs, MCP connections, execution protocol, and trigger definition.
5. **Run**: Execute the system directly from VAB for testing, or deploy to OpenClaw for production.

## Architecture

```
AUTOPILATE (Design)              OpenClaw (Runtime)
┌─────────────────────┐          ┌──────────────────────┐
│  VAB Canvas          │          │  Gateway              │
│  Configure Wizard    │  deploy  │  Router Agent         │
│  Fixer Agent         │ ──────► │  Systems Library      │
│  Export Engine       │          │  Operator Agents      │
│  Deploy Bridge       │          │  Messaging Channels   │
└─────────────────────┘          └──────────────────────┘
```

Systems designed in VAB are **independent pipelines**. OpenClaw dispatches and triggers them but does not orchestrate their internals. Each system manages its own agent coordination, phase ordering, and quality gates.

## Tech Stack

Frontend: React 18, TypeScript, React Flow, Zustand, TanStack Query, Tailwind CSS
Backend: Node.js, Express, Socket.io, Claude API
Runtime: OpenClaw, PM2, ClawHub

## Project Structure

```
src/
  components/
    Editor/          Canvas, Toolbar, custom nodes
    Library/         Component library panel
    Properties/      Node configuration forms
    ConfigureWizard/ AI-powered config analysis
    Terminal/        Streaming execution output
  store/             Zustand state management
  utils/export/      Export generators
  types/             TypeScript type definitions
server/
  services/          Orchestrator bridge, runtime, inventory, sessions
  socket/            Socket.io event handlers
shared/
  socket-events.ts   Shared event type definitions
```

See `CLAUDE.md` for detailed architecture documentation.
