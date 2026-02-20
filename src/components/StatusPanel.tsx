import { Settings, Package, Zap, FileText } from 'lucide-react';
import useStore from '../store/useStore';
import { ExportFramework, SkillSchema, FRAMEWORK_METADATA, SKILL_SCHEMA_METADATA } from '../types/config';

const frameworkIcons: Record<ExportFramework, React.ElementType> = {
  'vab-native': Package,
};

const frameworkColors: Record<ExportFramework, string> = {
  'vab-native': 'bg-indigo-100 text-indigo-700',
};

const schemaIcons: Record<SkillSchema, React.ElementType> = {
  agentskills: Zap,
  simple: FileText,
};

export const StatusPanel = () => {
  const { workflowConfig, setConfigModalOpen, nodes, edges } = useStore();

  const FrameworkIcon = frameworkIcons[workflowConfig.framework];
  const SchemaIcon = schemaIcons[workflowConfig.skillSchema];
  const frameworkMeta = FRAMEWORK_METADATA[workflowConfig.framework];
  const schemaMeta = SKILL_SCHEMA_METADATA[workflowConfig.skillSchema];

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Stats */}
      <div className="flex items-center gap-3 text-slate-500">
        <span className="font-mono">{nodes.length} nodes</span>
        <span className="text-slate-300">|</span>
        <span className="font-mono">{edges.length} edges</span>
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {/* Framework Badge */}
      <button
        onClick={() => setConfigModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 ${frameworkColors[workflowConfig.framework]}`}
        title={`Target: ${frameworkMeta.description}`}
      >
        <FrameworkIcon className="w-3.5 h-3.5" />
        {frameworkMeta.label}
      </button>

      {/* Skill Schema Badge */}
      <button
        onClick={() => setConfigModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 hover:ring-slate-300"
        title={`Schema: ${schemaMeta.description}`}
      >
        <SchemaIcon className="w-3.5 h-3.5" />
        {schemaMeta.label}
      </button>

      <div className="w-px h-4 bg-slate-200" />

      {/* Settings Button */}
      <button
        onClick={() => setConfigModalOpen(true)}
        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
        title="Workflow Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
};
