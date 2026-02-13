import { Node, Edge } from 'reactflow';
import {
  DepartmentConfig,
  AgentPoolConfig,
  AgentConfig,
  MCPServerConfig,
  SkillConfig,
} from '../types/core';
import { getChildNodes, getNodesByType, slugify } from './exportHelpers';

// =============================================================================
// Graph analysis — infer execution order from edges
// =============================================================================

interface PhaseGroup {
  department?: Node;
  lead?: Node;
  agents: Node[];
  skills: Node[];
  mcps: Node[];
  order: number;
}

/**
 * Analyze the workflow graph to determine execution phases.
 *
 * Strategy:
 * 1. If departments exist, each department = one phase, ordered by delegation edges
 * 2. If no departments, use topological sort of agents via control/delegation edges
 * 3. Within each phase, the "lead" is the agent with role=leader or roleCategory=coordinator
 *    that has incoming delegation from the orchestrator
 * 4. Other agents in the phase are workers under that lead
 */
function analyzeExecutionPhases(nodes: Node[], edges: Edge[]): PhaseGroup[] {
  const departments = getNodesByType(nodes, 'DEPARTMENT');
  const agents = getNodesByType(nodes, 'AGENT');
  const skills = getNodesByType(nodes, 'SKILL');
  const mcpServers = getNodesByType(nodes, 'MCP_SERVER');

  // Find the orchestrator (agent with role=orchestrator)
  const orchestrator = agents.find(a => {
    const config = a.data.config as AgentConfig;
    return config.role === 'orchestrator' || config.roleCategory === 'coordinator';
  });

  // Get delegation/control edges (these define execution order)
  const delegationEdges = edges.filter(e => {
    const edgeType = (e.data?.edgeType || e.type || '').toLowerCase();
    return edgeType === 'delegation' || edgeType === 'control';
  });

  // --- Department-based grouping ---
  if (departments.length > 0) {
    // Order departments by delegation chain from orchestrator
    const deptOrder = orderByDelegation(
      orchestrator?.id,
      departments.map(d => d.id),
      delegationEdges,
      nodes
    );

    return deptOrder.map((deptId, index) => {
      const dept = departments.find(d => d.id === deptId) || departments[index];
      const deptAgents = getAgentsInDepartment(dept, nodes);
      const lead = deptAgents.find(a => {
        const config = a.data.config as AgentConfig;
        return config.role === 'leader' || config.roleCategory === 'coordinator';
      });
      const workers = deptAgents.filter(a => a.id !== lead?.id);

      // Find skills attached to agents in this department
      const agentIds = new Set(deptAgents.map(a => a.id));
      const deptSkills = skills.filter(s => {
        return edges.some(e =>
          (agentIds.has(e.source) && e.target === s.id) ||
          (agentIds.has(e.target) && e.source === s.id)
        );
      });

      // Find MCPs attached to agents in this department
      const deptMcps = mcpServers.filter(m => {
        return edges.some(e =>
          (agentIds.has(e.source) && e.target === m.id) ||
          (agentIds.has(e.target) && e.source === m.id)
        );
      });

      return {
        department: dept,
        lead,
        agents: workers,
        skills: deptSkills,
        mcps: deptMcps,
        order: index,
      };
    });
  }

  // --- Flat agent grouping (no departments) ---
  // Group agents by their delegation chains from orchestrator
  const phases: PhaseGroup[] = [];
  const visited = new Set<string>();

  if (orchestrator) {
    visited.add(orchestrator.id);
    const delegatees = getDelegatees(orchestrator.id, delegationEdges);

    delegatees.forEach((targetId, index) => {
      const lead = agents.find(a => a.id === targetId);
      if (!lead || visited.has(lead.id)) return;
      visited.add(lead.id);

      // Find workers under this lead
      const workers = getDelegatees(lead.id, delegationEdges)
        .map(wId => agents.find(a => a.id === wId))
        .filter((a): a is Node => a !== undefined && !visited.has(a.id));
      workers.forEach(w => visited.add(w.id));

      const groupAgentIds = new Set([lead.id, ...workers.map(w => w.id)]);
      const groupSkills = skills.filter(s =>
        edges.some(e =>
          (groupAgentIds.has(e.source) && e.target === s.id) ||
          (groupAgentIds.has(e.target) && e.source === s.id)
        )
      );

      phases.push({
        lead,
        agents: workers,
        skills: groupSkills,
        mcps: [],
        order: index,
      });
    });
  }

  // Add any unvisited agents as a final phase
  const remaining = agents.filter(a => !visited.has(a.id));
  if (remaining.length > 0) {
    phases.push({
      agents: remaining,
      skills: [],
      mcps: [],
      order: phases.length,
    });
  }

  return phases;
}

function getAgentsInDepartment(dept: Node, nodes: Node[]): Node[] {
  const directAgents = getChildNodes(dept.id, nodes).filter(n => n.data.type === 'AGENT');
  const pools = getChildNodes(dept.id, nodes).filter(n => n.data.type === 'AGENT_POOL');
  const poolAgents = pools.flatMap(pool =>
    getChildNodes(pool.id, nodes).filter(n => n.data.type === 'AGENT')
  );
  return [...directAgents, ...poolAgents];
}

function getDelegatees(sourceId: string, delegationEdges: Edge[]): string[] {
  return delegationEdges
    .filter(e => e.source === sourceId)
    .map(e => e.target);
}

function orderByDelegation(
  orchestratorId: string | undefined,
  targetIds: string[],
  delegationEdges: Edge[],
  nodes: Node[]
): string[] {
  if (!orchestratorId) return targetIds;

  // Find delegation order from orchestrator → leads → departments
  const ordered: string[] = [];
  const remaining = new Set(targetIds);

  // Check edges from orchestrator to agents, then map agents to departments
  const delegatees = getDelegatees(orchestratorId, delegationEdges);

  delegatees.forEach(agentId => {
    const agent = nodes.find(n => n.id === agentId);
    if (!agent) return;

    // Find which department this agent belongs to
    let parentId = agent.parentId;
    while (parentId) {
      if (remaining.has(parentId)) {
        ordered.push(parentId);
        remaining.delete(parentId);
        break;
      }
      const parent = nodes.find(n => n.id === parentId);
      parentId = parent?.parentId;
    }
  });

  // Add any remaining departments not in the delegation chain
  remaining.forEach(id => ordered.push(id));

  return ordered;
}

// =============================================================================
// Executable CLAUDE.md generator
// =============================================================================

export const generateClaudeMdExecutable = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'AI-OS Workflow'
): string => {
  const agents = getNodesByType(nodes, 'AGENT');
  const skills = getNodesByType(nodes, 'SKILL');
  const mcpServers = getNodesByType(nodes, 'MCP_SERVER');

  // Find orchestrator
  const orchestrator = agents.find(a => {
    const config = a.data.config as AgentConfig;
    return config.role === 'orchestrator';
  });

  // Analyze execution phases
  const phases = analyzeExecutionPhases(nodes, edges);

  // Find quality auditor (agent with quality/audit in name or role)
  const qualityAuditor = agents.find(a => {
    const config = a.data.config as AgentConfig;
    const label = (config.name || a.data.label).toLowerCase();
    return label.includes('quality') || label.includes('auditor') || label.includes('qa');
  });

  const lines: string[] = [];

  // --- Header ---
  lines.push(`# ${name} — Execution Protocol`);
  lines.push('');
  lines.push(
    'You are executing a multi-phase pipeline. When you receive a task or brief, ' +
    'execute the phases below in strict sequential order. Each phase references agent ' +
    'configuration files that define your role, responsibilities, and deliverables for that phase.'
  );
  lines.push('');
  lines.push('> **Rule**: Never skip a phase. Never begin a phase until the previous ' +
    "phase's deliverables are complete. Write all outputs to the `output/` directory.");
  lines.push('');
  lines.push('---');
  lines.push('');

  // --- Phase generation ---
  let phaseNumber = 1;

  phases.forEach((phase) => {
    const phaseName = phase.department
      ? ((phase.department.data.config as DepartmentConfig).name || phase.department.data.label)
      : phase.lead
        ? ((phase.lead.data.config as AgentConfig).name || phase.lead.data.label).replace(/\s*Lead\s*/i, '')
        : `Phase ${phaseNumber}`;

    const phaseSlug = slugify(phaseName);
    lines.push(`## Phase ${phaseNumber}: ${phaseName}`);
    lines.push('');

    // Sub-phase for each worker agent
    let subPhase = 'A';

    // Workers first (the "doers")
    phase.agents.forEach(agent => {
      const config = agent.data.config as AgentConfig;
      const agentName = config.name || agent.data.label;
      const agentPath = getAgentPath(agent, nodes);

      lines.push(`### ${phaseNumber}${subPhase} — ${agentName}`);
      lines.push(`Read \`${agentPath}\` and adopt that role's system prompt.`);
      lines.push('');

      // List relevant skills
      const agentSkills = getConnectedSkills(agent, skills, edges);
      if (agentSkills.length > 0) {
        lines.push('**Skills:**');
        agentSkills.forEach(skill => {
          const skillConfig = skill.data.config as SkillConfig;
          const skillName = slugify(skillConfig.name || skill.data.label);
          lines.push(`- Refer to \`skills/${skillName}/SKILL.md\` for methodology`);
        });
        lines.push('');
      }

      // List relevant MCPs from agent config
      if (config.mcps && config.mcps.length > 0) {
        lines.push('**Execute using:**');
        config.mcps.forEach(mcp => {
          lines.push(`- **${mcp}** MCP`);
        });
        lines.push('');
      }

      // Deliverable output path
      lines.push(`**Deliverable:** Write \`output/${phaseSlug}/${slugify(agentName)}-output.md\``);
      lines.push('');

      subPhase = String.fromCharCode(subPhase.charCodeAt(0) + 1);
    });

    // Lead agent as review/synthesis step
    if (phase.lead) {
      const leadConfig = phase.lead.data.config as AgentConfig;
      const leadName = leadConfig.name || phase.lead.data.label;
      const leadPath = getAgentPath(phase.lead, nodes);

      lines.push(`### ${phaseNumber}${subPhase} — ${leadName} Review`);
      lines.push(`Read \`${leadPath}\` and adopt that role's system prompt.`);
      lines.push('');

      // Extract checklist from system prompt if available
      const checklist = extractChecklist(leadConfig);
      if (checklist.length > 0) {
        lines.push('**Execute — validate ALL items before proceeding:**');
        checklist.forEach(item => {
          lines.push(`- [ ] ${item}`);
        });
      } else {
        lines.push('**Execute:**');
        lines.push('- Review all sub-phase deliverables for completeness and quality');
        lines.push('- Ensure alignment with the original brief/requirements');
        lines.push('- Consolidate into a single phase brief');
      }
      lines.push('');

      lines.push(`**Deliverable:** Write \`output/${phaseSlug}/${phaseSlug}-brief.md\` consolidating all ${phaseName} work.`);
      lines.push('');
    }

    // Gate
    lines.push(`> **GATE**: Do NOT proceed to Phase ${phaseNumber + 1} until all ${phaseName} deliverables are complete.`);
    lines.push('');
    lines.push('---');
    lines.push('');

    phaseNumber++;
  });

  // --- Quality Assurance phase (if auditor exists) ---
  if (qualityAuditor) {
    const qaConfig = qualityAuditor.data.config as AgentConfig;
    const qaPath = getAgentPath(qualityAuditor, nodes);
    const qaSkills = getConnectedSkills(qualityAuditor, skills, edges);

    lines.push(`## Phase ${phaseNumber}: Quality Assurance`);
    lines.push('');
    lines.push(`Read \`${qaPath}\` and adopt that role's system prompt.`);
    if (qaSkills.length > 0) {
      qaSkills.forEach(skill => {
        const skillConfig = skill.data.config as SkillConfig;
        const skillName = slugify(skillConfig.name || skill.data.label);
        lines.push(`Refer to \`skills/${skillName}/SKILL.md\` for audit methodology.`);
      });
    }
    lines.push('');

    const qaChecklist = extractChecklist(qaConfig);
    if (qaChecklist.length > 0) {
      lines.push('**Execute — score each dimension 0-100:**');
      qaChecklist.forEach(item => {
        lines.push(`- [ ] **${item}** (≥85 required)`);
      });
    } else {
      lines.push('**Execute — score each dimension 0-100 (≥85 required to pass):**');
      lines.push('- [ ] Completeness: All required deliverables present');
      lines.push('- [ ] Quality: Meets professional standards');
      lines.push('- [ ] Consistency: All components aligned with brief');
    }
    lines.push('');

    lines.push('**Deliverable:** Write `output/qa/audit-report.md` with scores for each dimension.');
    lines.push('');

    // Remediation loop
    lines.push('### Remediation Loop');
    lines.push('If ANY dimension scores below 85:');
    lines.push('1. Identify the responsible phase');
    lines.push('2. Return to that phase with specific remediation instructions');
    lines.push('3. Re-execute only the failed items');
    lines.push('4. Re-run this Quality Assurance phase');
    lines.push('5. After 3 failed cycles, write `output/qa/escalation-report.md` with blockers');
    lines.push('');
    lines.push(`> **GATE**: Do NOT proceed to delivery until ALL dimensions score ≥85.`);
    lines.push('');
    lines.push('---');
    lines.push('');
    phaseNumber++;
  }

  // --- Delivery phase (orchestrator) ---
  if (orchestrator) {
    const orchPath = getAgentPath(orchestrator, nodes);

    lines.push(`## Phase ${phaseNumber}: Delivery`);
    lines.push('');
    lines.push(`Read \`${orchPath}\` and adopt that role's system prompt.`);
    lines.push('');
    lines.push('**Execute:**');
    lines.push('1. Compile final delivery package from all `output/` subdirectories');
    lines.push('2. Write `output/DELIVERY.md` with:');
    lines.push('   - Project summary');
    lines.push('   - Key decisions made during execution');
    lines.push('   - Recommendations for future iterations');
    lines.push('');
    lines.push('**Final deliverable:** `output/DELIVERY.md` is the completion signal.');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // --- MCP Servers reference ---
  if (mcpServers.length > 0) {
    lines.push('## Available MCP Servers');
    lines.push('');
    lines.push('Pre-configured in `.claude/mcp.json` and available throughout all phases:');
    lines.push('');
    lines.push('| Server | Command |');
    lines.push('|--------|---------|');
    mcpServers.forEach(mcp => {
      const config = mcp.data.config as MCPServerConfig;
      const serverName = config.name || mcp.data.label;
      lines.push(`| ${serverName} | \`${config.command || 'npx'}\` |`);
    });
    lines.push('');
  }

  // --- Agent reference table ---
  lines.push('## Agent Reference');
  lines.push('');
  lines.push('All agent configurations live in `agents/`. Each file contains YAML frontmatter ' +
    'with model settings and a system prompt. When a phase says "adopt that role," read the ' +
    'full file and follow its system prompt.');
  lines.push('');
  lines.push('| Agent | File | Role |');
  lines.push('|-------|------|------|');
  agents.forEach(agent => {
    const config = agent.data.config as AgentConfig;
    const agentName = config.name || agent.data.label;
    const agentPath = getAgentPath(agent, nodes);
    const role = config.role || config.roleCategory || 'worker';
    lines.push(`| ${agentName} | \`${agentPath}\` | ${role} |`);
  });
  lines.push('');

  return lines.join('\n');
};

// =============================================================================
// Helpers for the executable generator
// =============================================================================

/**
 * Get the file path for an agent node (matching the export directory structure)
 */
function getAgentPath(agent: Node, nodes: Node[]): string {
  const config = agent.data.config as AgentConfig;
  const pools = getNodesByType(nodes, 'AGENT_POOL');
  const departments = getNodesByType(nodes, 'DEPARTMENT');

  const pool = pools.find(p => agent.parentId === p.id);
  const department = pool
    ? departments.find(d => pool.parentId === d.id)
    : departments.find(d => agent.parentId === d.id);

  let path = 'agents/';
  if (department) {
    const deptConfig = department.data.config as DepartmentConfig;
    path += `${slugify(deptConfig.name || department.data.label)}/`;
  }
  if (pool) {
    const poolConfig = pool.data.config as AgentPoolConfig;
    path += `${slugify(poolConfig.name || pool.data.label)}/`;
  }
  path += `${slugify(config.name || agent.data.label)}.md`;

  return path;
}

/**
 * Find skills connected to an agent via edges
 */
function getConnectedSkills(agent: Node, skills: Node[], edges: Edge[]): Node[] {
  const connectedIds = new Set(
    edges
      .filter(e => e.source === agent.id || e.target === agent.id)
      .map(e => e.source === agent.id ? e.target : e.source)
  );
  return skills.filter(s => connectedIds.has(s.id));
}

/**
 * Extract checklist items from an agent's system prompt
 * Looks for markdown checklist patterns: - [ ] item
 */
function extractChecklist(config: AgentConfig): string[] {
  const prompt = config.systemPrompt || '';
  const matches = prompt.match(/- \[[ x]\] (.+)/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/- \[[ x]\] /, ''));
}

/**
 * Infer a deliverable description from agent config.
 * Exported for potential use by other generators.
 */
export function inferDeliverable(config: AgentConfig, phaseName: string, agentName: string): string {
  // Try to extract from system prompt
  const prompt = config.systemPrompt || '';
  const deliverableMatch = prompt.match(/deliverable[s]?[:\s]+(.+?)(?:\n|$)/i);
  if (deliverableMatch) return deliverableMatch[1].trim();
  return `${agentName} output for ${phaseName} phase`;
}
