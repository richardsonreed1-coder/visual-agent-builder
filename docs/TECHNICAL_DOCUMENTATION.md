# Visual Agent Builder - Technical Documentation

**Version:** 1.0.0
**Last Updated:** January 2026
**Architecture:** React + TypeScript + Vite

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Role System](#3-role-system)
4. [Configuration Schema](#4-configuration-schema)
5. [Component Library](#5-component-library)
6. [State Management](#6-state-management)
7. [Export System](#7-export-system)
8. [Migration & Compatibility](#8-migration--compatibility)
9. [API Reference](#9-api-reference)
10. [Development Guide](#10-development-guide)

---

## 1. Executive Summary

### 1.1 Purpose

Visual Agent Builder is a React-based drag-and-drop interface for designing AI agent workflows. It enables users to visually compose multi-agent systems by dragging component nodes onto a canvas, connecting them with edges, configuring properties, and exporting the workflow as production-ready configuration files.

### 1.2 Key Features

- **Visual Workflow Design**: Drag-and-drop canvas powered by React Flow
- **Role-Based Configuration**: 11 agent roles across 4 categories with context-aware UI
- **16 Configuration Sections**: Comprehensive agent settings from identity to monitoring
- **Dynamic Form System**: Schema-driven forms with conditional visibility
- **Multi-Format Export**: ZIP bundles with YAML frontmatter, JSON, and settings files
- **Backward Compatibility**: Automatic migration for legacy workflow formats

### 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18.2 |
| Language | TypeScript 5.2 |
| Build Tool | Vite 5.x |
| State Management | Zustand 4.5 |
| Canvas | React Flow 11.10 |
| Forms | react-hook-form 7.x |
| Data Fetching | TanStack Query 5.x |
| Styling | Tailwind CSS 3.4 |

---

## 2. Architecture Overview

### 2.1 Directory Structure

```
visual-agent-builder/
├── src/
│   ├── components/
│   │   ├── Canvas/           # React Flow canvas wrapper
│   │   ├── LibraryPanel/     # Component browser sidebar
│   │   ├── Properties/       # Configuration panel
│   │   │   ├── fields/       # Form field components
│   │   │   ├── schemas.ts    # Node type schemas
│   │   │   └── DynamicForm.tsx
│   │   └── nodes/            # Custom React Flow nodes
│   ├── store/
│   │   └── useStore.ts       # Zustand state management
│   ├── types/
│   │   └── core.ts           # TypeScript type definitions
│   ├── utils/
│   │   ├── export.ts         # Basic export utilities
│   │   ├── exportDirectory.ts # ZIP export with file structure
│   │   ├── roleManager.ts    # Role metadata and visibility
│   │   └── workflowMigration.ts # Legacy workflow migration
│   └── App.tsx               # Main layout component
├── server/                   # Express backend for inventory
└── docs/                     # Documentation
```

### 2.2 Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  LibraryPanel   │────▶│     Canvas       │────▶│ PropertiesPanel │
│  (Drag Source)  │     │  (React Flow)    │     │  (DynamicForm)  │
└─────────────────┘     └────────┬─────────┘     └────────┬────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌────────────────────────────────────┐
                        │         Zustand Store              │
                        │  (nodes, edges, selectedNode)      │
                        └────────────────┬───────────────────┘
                                         │
                                         ▼
                        ┌────────────────────────────────────┐
                        │         Export System              │
                        │  (generateDirectoryStructure)      │
                        └────────────────────────────────────┘
```

### 2.3 Node Types

The system supports 8 primary node types:

| Type | Description | Container |
|------|-------------|-----------|
| `DEPARTMENT` | Top-level organizational container | Yes |
| `AGENT_POOL` | Group of related agents | Yes |
| `AGENT` | Individual AI agent | No |
| `SKILL` | Reusable capability | No |
| `PLUGIN` | External integration | No |
| `TOOL` | Atomic tool/function | No |
| `MCP_SERVER` | Model Context Protocol server | No |
| `HOOK` | Event-driven automation | No |
| `COMMAND` | Slash command definition | No |

---

## 3. Role System

### 3.1 Role Categories

The role system organizes 11 agent roles into 4 functional categories:

```typescript
type AgentRoleCategory = 'independent' | 'team' | 'coordinator' | 'continuous';
```

#### Category Definitions

| Category | Purpose | Section Visibility |
|----------|---------|-------------------|
| **Independent** | Work alone without coordination | 11 sections |
| **Team** | Execution-focused roles in coordinated groups | 12 sections (+delegation) |
| **Coordinator** | Manage and orchestrate other agents | 14 sections (+subagent, pal, delegation) |
| **Continuous** | Ongoing monitoring and auditing | 12 sections (+monitoring, -tools) |

### 3.2 Role Definitions

```typescript
// Role to Category Mapping (ROLE_CATEGORY_MAP)
{
  // Independent: work alone, planning, review
  solo: 'independent',
  specialist: 'independent',
  planner: 'independent',
  auditor: 'independent',
  critic: 'independent',

  // Team: execution-focused
  member: 'team',
  executor: 'team',

  // Coordinator: manage and orchestrate
  leader: 'coordinator',
  orchestrator: 'coordinator',
  router: 'coordinator',

  // Continuous: ongoing monitoring
  monitor: 'continuous',
}
```

### 3.3 Role Metadata

Each role has associated metadata defined in `roleManager.ts`:

```typescript
interface RoleMetadata {
  role: AgentRole;
  category: AgentRoleCategory;
  displayName: string;
  description: string;
  icon: string;              // Lucide icon name
  defaultTemperature: number;
  lockedFields?: Partial<Record<keyof AgentConfig, unknown>>;
}
```

#### Role Details

| Role | Category | Temperature | Special Behavior |
|------|----------|-------------|------------------|
| Solo | Independent | 0.7 | General-purpose |
| Specialist | Independent | 0.5 | Domain expertise |
| Planner | Independent | 0.6 | Task breakdown |
| Auditor | Independent | 0.3 | Compliance review |
| Critic | Independent | 0.3 | Work validation |
| Member | Team | 0.7 | Task execution |
| Executor | Team | 0.0 | **Temperature locked** |
| Leader | Coordinator | 0.5 | Team orchestration |
| Orchestrator | Coordinator | 0.4 | Multi-team coordination |
| Router | Coordinator | 0.2 | Task routing |
| Monitor | Continuous | 0.1 | Health monitoring |

### 3.4 Two-Step Role Selection

The UI implements a cascading dropdown for role selection:

```
┌─────────────────────────────────┐
│ Role Category                   │
│ ┌─────────────────────────────┐ │
│ │ Independent              ▼  │ │
│ └─────────────────────────────┘ │
│ Work alone without coordination │
├─────────────────────────────────┤
│ Role                            │
│ ┌─────────────────────────────┐ │
│ │ Planner                  ▼  │ │
│ └─────────────────────────────┘ │
│ Creates detailed plans...       │
└─────────────────────────────────┘
```

**Category → Role Mapping:**

- **Independent**: Solo, Specialist, Planner, Auditor, Critic
- **Team**: Member, Executor
- **Coordinator**: Leader, Orchestrator, Router
- **Continuous**: Monitor

---

## 4. Configuration Schema

### 4.1 Section Architecture

The AGENT node type supports 16 configuration sections:

```typescript
interface SectionSchema {
  id: string;
  label: string;
  icon: string;
  description?: string;
  defaultOpen: boolean;
  collapsible: boolean;
  visibleWhen?: {
    field: string;           // Field to watch (e.g., 'role')
    values?: string[];       // Show when value matches
    categories?: string[];   // Show when category matches
  };
}
```

### 4.2 Section Catalog

| # | Section ID | Label | Visibility |
|---|------------|-------|------------|
| 1 | `identity` | Identity | All roles |
| 2 | `role` | Agent Role | All roles |
| 3 | `model` | Model | All roles |
| 4 | `permissions` | Permissions | All roles |
| 5 | `tools` | Tools | All except `monitor` |
| 6 | `capabilities` | Capabilities | All roles |
| 7 | `prompt` | System Prompt | All roles |
| 8 | `advanced` | Advanced | All roles |
| 9 | `subagent` | Sub-Agent Config | Coordinator only |
| 10 | `pal` | PAL Orchestration | Coordinator only |
| 11 | `delegation` | Delegation | Coordinator + Team |
| 12 | `execution` | Execution | Executor only |
| 13 | `guardrails` | Guardrails | All roles |
| 14 | `observability` | Observability | All roles |
| 15 | `memory` | Memory & Context | All roles |
| 16 | `monitoring` | Monitoring | Continuous only |

### 4.3 Field Types

The form system supports 13 field types:

```typescript
type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'roleSelect'    // Two-step category → role selector
  | 'number'
  | 'slider'
  | 'checkbox'
  | 'chips'         // Tag array
  | 'capabilities'  // Browse + "when to use" config
  | 'array'         // Dynamic list
  | 'object'        // Nested editor
  | 'keyvalue'      // Key-value pairs
  | 'color';        // Color picker
```

### 4.4 Configuration Interfaces

#### Core AgentConfig

```typescript
interface AgentConfig {
  // Identity
  name: string;
  teamName?: string;
  description?: string;

  // Hierarchy
  pool?: string;
  department?: string;
  role: AgentRole;
  roleCategory?: AgentRoleCategory;

  // Model
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;

  // Capabilities
  tools?: string[];
  skills?: CapabilityConfig[];
  mcps?: CapabilityConfig[];
  commands?: CapabilityConfig[];

  // Permissions
  permissionMode: PermissionMode;

  // Extended Sections
  guardrails?: GuardrailsConfig;
  observability?: ObservabilityConfig;
  memory?: MemoryConfig;
  subAgentConfig?: SubAgentConfig;
  palConfig?: PALConfig;
  delegation?: DelegationConfig;
  execution?: ExecutionConfig;
  monitoring?: MonitoringConfig;
}
```

#### GuardrailsConfig

```typescript
interface GuardrailsConfig {
  tokenLimit?: number;          // Max tokens per session
  costCap?: number;             // Max cost in dollars
  contentFilters?: {
    profanity?: boolean;
    pii?: boolean;
    injection?: boolean;
  };
  timeoutSeconds?: number;
  maxRetries?: number;
}
```

#### ObservabilityConfig

```typescript
interface ObservabilityConfig {
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    destinations?: string[];
  };
  metrics?: {
    enabled?: boolean;
    exportInterval?: number;
  };
  tracing?: {
    enabled?: boolean;
    samplingRate?: number;
  };
}
```

#### MemoryConfig

```typescript
interface MemoryConfig {
  contextPersistence?: 'none' | 'session' | 'persistent';
  memoryType?: 'short-term' | 'long-term' | 'both';
  maxContextTokens?: number;
  summarizationThreshold?: number;
}
```

#### SubAgentConfig (Coordinator)

```typescript
interface SubAgentConfig {
  spawnRules?: {
    maxSubagents?: number;
    autoSpawn?: boolean;
    inheritConfig?: boolean;
  };
  communication?: 'sync' | 'async' | 'event-driven';
  resultAggregation?: 'merge' | 'first' | 'vote' | 'custom';
}
```

#### PALConfig (Coordinator)

```typescript
interface PALConfig {
  planPhase?: {
    enabled?: boolean;
    maxPlanningTokens?: number;
    requireApproval?: boolean;
  };
  allocatePhase?: {
    strategy?: 'sequential' | 'parallel' | 'adaptive';
    maxConcurrency?: number;
  };
  learnPhase?: {
    enabled?: boolean;
    feedbackLoop?: boolean;
    memoryIntegration?: boolean;
  };
}
```

#### DelegationConfig (Coordinator + Team)

```typescript
interface DelegationConfig {
  allowDelegation?: boolean;
  delegationStrategy?: 'capability-based' | 'load-balanced' | 'round-robin';
  escalationPath?: string[];
  autoDelegate?: boolean;
}
```

#### ExecutionConfig (Executor)

```typescript
interface ExecutionConfig {
  executionMode?: 'strict' | 'adaptive' | 'exploratory';
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
    exponential?: boolean;
  };
  checkpointing?: boolean;
  rollbackOnFailure?: boolean;
}
```

#### MonitoringConfig (Continuous)

```typescript
interface MonitoringConfig {
  healthChecks?: {
    interval?: number;
    endpoints?: string[];
    thresholds?: Record<string, number>;
  };
  alerts?: {
    enabled?: boolean;
    channels?: string[];
    escalation?: boolean;
  };
  dashboards?: string[];
}
```

---

## 5. Component Library

### 5.1 Form Field Components

Located in `src/components/Properties/fields/`:

| Component | File | Purpose |
|-----------|------|---------|
| TextField | `TextField.tsx` | Text/number input |
| TextAreaField | `TextAreaField.tsx` | Multi-line text |
| SelectField | `SelectField.tsx` | Dropdown select |
| RoleSelectField | `RoleSelectField.tsx` | Two-step role selector |
| SliderField | `SliderField.tsx` | Range slider |
| CheckboxField | `CheckboxField.tsx` | Boolean toggle |
| ChipsField | `ChipsField.tsx` | Tag array |
| CapabilityField | `CapabilityField.tsx` | Skills/commands with config |
| ArrayField | `ArrayField.tsx` | Dynamic list |
| ObjectField | `ObjectField.tsx` | Nested object editor |

### 5.2 RoleSelectField Implementation

The role selector implements a two-step dropdown pattern:

```typescript
// Category options
const CATEGORY_OPTIONS = [
  { value: 'independent', label: 'Independent', description: '...' },
  { value: 'team', label: 'Team', description: '...' },
  { value: 'coordinator', label: 'Coordinator', description: '...' },
  { value: 'continuous', label: 'Continuous', description: '...' },
];

// Roles by category
const ROLES_BY_CATEGORY = {
  independent: ['solo', 'specialist', 'planner', 'auditor', 'critic'],
  team: ['member', 'executor'],
  coordinator: ['leader', 'orchestrator', 'router'],
  continuous: ['monitor'],
};
```

**Behavior:**
1. User selects category from first dropdown
2. Second dropdown populates with roles for that category
3. First role in category is auto-selected
4. Both `role` and `roleCategory` fields are updated in form state

### 5.3 DynamicForm Rendering

The `DynamicForm` component handles schema-driven rendering:

```typescript
const DynamicForm = ({ node, schema }: DynamicFormProps) => {
  // Watch role for visibility calculations
  const currentRole = watch('role') as AgentRole;

  // Memoize visible sections
  const visibleSectionIds = useMemo(() => {
    return new Set(
      schema.sections
        .filter(section => isSectionVisibleForRole(section, currentRole))
        .map(s => s.id)
    );
  }, [schema.sections, currentRole]);

  // Render sections and fields
  return (
    <div className="space-y-4">
      {schema.sections.map(section => {
        if (!visibleSectionIds.has(section.id)) return null;
        // ... render section with fields
      })}
    </div>
  );
};
```

### 5.4 Conditional Field Visibility

Fields support conditional rendering based on other field values:

```typescript
interface FieldSchema {
  conditional?: {
    field: string;           // Field to watch
    value: any;              // Required value
    operator?: 'eq' | 'neq' | 'in' | 'exists';
  };
}

// Example: Show only when planning is enabled
{
  key: 'palConfig.planPhase.maxPlanningTokens',
  conditional: {
    field: 'palConfig.planPhase.enabled',
    value: true
  },
}
```

---

## 6. State Management

### 6.1 Zustand Store

The application uses Zustand for lightweight state management:

```typescript
interface StoreState {
  // Canvas state
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;

  // Library state
  libraryCategory: string;
  addToAgentMode: boolean;

  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  setSelectedNode: (node: Node | null) => void;
  updateNodeData: (nodeId: string, newData: any) => void;

  // Hierarchy helpers
  addChildNode: (parentId: string, node: Node) => void;
  moveNodeToParent: (nodeId: string, parentId: string | null) => void;
  getChildNodes: (parentId: string) => Node[];

  // Edge helpers
  setEdgeType: (edgeId: string, edgeType: EdgeType) => void;
}
```

### 6.2 Migration on Load

The store automatically migrates legacy workflows:

```typescript
setNodes: (nodes) => {
  // Apply migration for legacy workflows if needed
  const migratedNodes = needsMigration(nodes)
    ? migrateWorkflow(nodes)
    : nodes;
  set({ nodes: migratedNodes });
},
```

### 6.3 Node Data Structure

```typescript
interface NodeData {
  label: string;
  nodeType: NodeType;
  config: AgentConfig | SkillConfig | /* other configs */;
}

// Example node
{
  id: 'agent-1',
  type: 'custom',
  position: { x: 100, y: 100 },
  data: {
    label: 'Research Agent',
    nodeType: 'AGENT',
    config: {
      name: 'Research Agent',
      role: 'specialist',
      roleCategory: 'independent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.5,
      // ...
    }
  }
}
```

---

## 7. Export System

### 7.1 Export Structure

The `generateDirectoryStructure` function creates a complete project export:

```
exported-workflow/
├── CLAUDE.md              # Main configuration with all agents
├── .claude/
│   └── settings.json      # Permission settings
├── agents/
│   ├── research-agent.md  # Individual agent files
│   └── executor-agent.md
├── skills/
│   └── data-analysis.md
├── hooks/
│   └── pre-commit.json
└── commands/
    └── generate-report.md
```

### 7.2 YAML Frontmatter Format

Agent files use YAML frontmatter with hierarchical config:

```yaml
---
name: Research Agent
pool: Research Pool
team: Data Team
role: specialist
roleCategory: independent
provider: anthropic
model: claude-sonnet-4-20250514
temperature: 0.5
tools: [Read, Edit, Bash, Glob, Grep, WebSearch]
skills: [data-analysis, report-generation]
permissionMode: default
guardrails:
  tokenLimit: 100000
  costCap: 10
  contentFilters:
    profanity: true
    pii: true
    injection: true
observability:
  logging:
    level: info
    destinations: [console, file]
  metrics:
    enabled: true
    exportInterval: 60
memory:
  contextPersistence: session
  memoryType: short-term
  maxContextTokens: 8000
description: |
  Specialized research agent for data analysis
  and report generation tasks.
---

You are a research specialist focused on...
```

### 7.3 Nested Config Export

The `exportNestedConfig` helper handles hierarchical YAML:

```typescript
const exportNestedConfig = (
  lines: string[],
  obj: Record<string, unknown>,
  indent: number
): void => {
  const spaces = ' '.repeat(indent);

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      exportNestedConfig(lines, value, indent + 2);
    } else if (Array.isArray(value)) {
      lines.push(`${spaces}${key}: [${value.join(', ')}]`);
    } else if (typeof value === 'string') {
      lines.push(`${spaces}${key}: "${value}"`);
    } else {
      lines.push(`${spaces}${key}: ${value}`);
    }
  });
};
```

### 7.4 ZIP Bundle Generation

Uses JSZip for client-side bundle creation:

```typescript
import JSZip from 'jszip';

const exportAsZip = async (nodes: Node[], edges: Edge[]) => {
  const zip = new JSZip();
  const files = generateDirectoryStructure(nodes, edges);

  Object.entries(files).forEach(([path, content]) => {
    zip.file(path, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  // Trigger download...
};
```

---

## 8. Migration & Compatibility

### 8.1 Legacy Role Migration

The system automatically migrates workflows from the legacy 5-role format:

```typescript
// Legacy role mapping
const LEGACY_ROLE_MAP: Record<string, AgentRole> = {
  solo: 'solo',
  leader: 'leader',
  executor: 'executor',
  critic: 'critic',
  worker: 'member',  // Renamed
  default: 'solo',
};
```

### 8.2 Migration Detection

```typescript
const needsMigration = (nodes: Node[]): boolean => {
  return nodes.some((node) => {
    if (node.data?.nodeType !== 'AGENT') return false;
    const config = node.data?.config;

    // Check for legacy 'worker' role
    if (config.role === 'worker') return true;

    // Check for missing roleCategory
    if (config.role && !config.roleCategory) return true;

    return false;
  });
};
```

### 8.3 Migration Process

```typescript
const migrateNodeConfig = (config: Record<string, unknown>) => {
  const migrated = { ...config };

  // Map legacy 'worker' to 'member'
  if (config.role === 'worker') {
    migrated.role = 'member';
  }

  // Add roleCategory if missing
  const role = migrated.role as AgentRole;
  if (role && !migrated.roleCategory) {
    migrated.roleCategory = ROLE_CATEGORY_MAP[role];
  }

  // Apply role defaults for new config sections
  const roleDefaults = getRoleDefaults(role);
  if (!migrated.guardrails) {
    migrated.guardrails = roleDefaults.guardrails;
  }
  // ... other sections

  return migrated;
};
```

---

## 9. API Reference

### 9.1 Role Manager API

**`getRoleCategory(role: AgentRole): AgentRoleCategory`**

Returns the category for a given role.

**`getVisibleSections(role: AgentRole): Set<SectionId>`**

Returns the set of visible section IDs for a role.

**`isSectionVisible(sectionId: SectionId, role: AgentRole): boolean`**

Checks if a specific section should be visible.

**`getLockedFields(role: AgentRole): Partial<Record<keyof AgentConfig, unknown>>`**

Returns fields that are locked (read-only) for a role.

**`getRoleDefaults(role: AgentRole): Partial<AgentConfig>`**

Returns default configuration values for a role.

**`getRoleOptionsGrouped(): Record<AgentRoleCategory, RoleOption[]>`**

Returns role options grouped by category for UI.

### 9.2 Export API

**`generateDirectoryStructure(nodes: Node[], edges: Edge[]): Record<string, string>`**

Generates a complete file structure for export.

**`generateAgentMarkdown(agent: Node, pool?: Node, department?: Node): string`**

Generates YAML frontmatter markdown for an agent.

**`generateClaudeMd(nodes: Node[], edges: Edge[]): string`**

Generates the main CLAUDE.md configuration file.

### 9.3 Schema API

**`getFieldsForSection(nodeType: NodeType, sectionId: string): FieldSchema[]`**

Returns all fields belonging to a section.

**`getSchemaDefaults(nodeType: NodeType): Record<string, unknown>`**

Returns default values for all fields of a node type.

**`getModelsForProvider(provider: string): ModelOption[]`**

Returns available models for a given provider.

---

## 10. Development Guide

### 10.1 Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit
```

### 10.2 Adding a New Role

1. **Update `core.ts`**:
   ```typescript
   export type AgentRole = /* ... */ | 'newrole';

   export const ROLE_CATEGORY_MAP = {
     // ...
     newrole: 'independent', // or appropriate category
   };
   ```

2. **Update `roleManager.ts`**:
   ```typescript
   export const ROLE_METADATA = {
     // ...
     newrole: {
       role: 'newrole',
       category: 'independent',
       displayName: 'New Role',
       description: 'Description...',
       icon: 'IconName',
       defaultTemperature: 0.7,
     },
   };
   ```

3. **Update `RoleSelectField.tsx`**:
   ```typescript
   const ROLES_BY_CATEGORY = {
     independent: [/* ... */, { value: 'newrole', label: 'New Role', description: '...' }],
   };
   ```

### 10.3 Adding a New Section

1. **Define section in `schemas.ts`**:
   ```typescript
   {
     id: 'newsection',
     label: 'New Section',
     icon: 'IconName',
     defaultOpen: false,
     collapsible: true,
     visibleWhen: { field: 'role', categories: ['coordinator'] },
   }
   ```

2. **Add fields**:
   ```typescript
   {
     key: 'newsection.field1',
     label: 'Field 1',
     type: 'text',
     section: 'newsection',
   }
   ```

3. **Add config interface in `core.ts`**:
   ```typescript
   interface NewSectionConfig {
     field1?: string;
   }

   interface AgentConfig {
     // ...
     newsection?: NewSectionConfig;
   }
   ```

4. **Update export in `exportDirectory.ts`**:
   ```typescript
   if (config.newsection && Object.keys(config.newsection).length > 0) {
     lines.push('newsection:');
     exportNestedConfig(lines, config.newsection, 2);
   }
   ```

### 10.4 Adding a New Field Type

1. **Create component in `fields/`**:
   ```typescript
   export const NewFieldType = ({ field, watch, setValue, errors }) => {
     // Implementation
   };
   ```

2. **Export from `fields/index.ts`**:
   ```typescript
   export { NewFieldType } from './NewFieldType';
   ```

3. **Add to `FieldType` union in `schemas.ts`**:
   ```typescript
   type FieldType = /* ... */ | 'newtype';
   ```

4. **Add case in `DynamicForm.tsx`**:
   ```typescript
   case 'newtype':
     return <NewFieldType key={field.key} /* props */ />;
   ```

### 10.5 Testing Checklist

- [ ] Role selection updates visible sections
- [ ] Category change auto-selects first role
- [ ] Locked fields show lock indicator
- [ ] Export includes all configured sections
- [ ] Legacy workflows migrate correctly
- [ ] Build completes without TypeScript errors

---

## Appendix A: Section Visibility Matrix

| Section | Independent | Team | Coordinator | Continuous |
|---------|:-----------:|:----:|:-----------:|:----------:|
| Identity | ✓ | ✓ | ✓ | ✓ |
| Role | ✓ | ✓ | ✓ | ✓ |
| Model | ✓ | ✓ | ✓ | ✓ |
| Permissions | ✓ | ✓ | ✓ | ✓ |
| Tools | ✓ | ✓ | ✓ | ✗ |
| Capabilities | ✓ | ✓ | ✓ | ✓ |
| System Prompt | ✓ | ✓ | ✓ | ✓ |
| Advanced | ✓ | ✓ | ✓ | ✓ |
| Sub-Agent Config | ✗ | ✗ | ✓ | ✗ |
| PAL Orchestration | ✗ | ✗ | ✓ | ✗ |
| Delegation | ✗ | ✓ | ✓ | ✗ |
| Execution | ✗ | executor | ✗ | ✗ |
| Guardrails | ✓ | ✓ | ✓ | ✓ |
| Observability | ✓ | ✓ | ✓ | ✓ |
| Memory & Context | ✓ | ✓ | ✓ | ✓ |
| Monitoring | ✗ | ✗ | ✗ | ✓ |

---

## Appendix B: Provider Models

| Provider | Models |
|----------|--------|
| Anthropic | claude-sonnet-4-20250514, claude-opus-4-20250514, claude-3-5-haiku-20241022 |
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo, o1-preview, o1-mini |
| Google | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash |
| AWS Bedrock | anthropic.claude-sonnet-4-20250514-v1:0, anthropic.claude-opus-4-20250514-v1:0 |
| Azure | gpt-4o (Azure), gpt-4-turbo (Azure) |

---

## Appendix C: Tool Options

Available tools for agent configuration:

```
Read, Edit, Write, MultiEdit, Bash, Glob, Grep,
WebFetch, WebSearch, TodoRead, TodoWrite, Task,
NotebookEdit, AskFollowupQuestion
```

---

*Document generated for Visual Agent Builder v1.0.0*
