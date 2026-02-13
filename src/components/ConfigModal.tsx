import { useState, useEffect } from 'react';
import { X, Settings, Sparkles, Package, GitBranch, Users, Bot, Check, FileText, Zap } from 'lucide-react';
import useStore from '../store/useStore';
import {
  WorkflowConfig,
  ExportFramework,
  SkillSchema,
  FRAMEWORK_METADATA,
  SKILL_SCHEMA_METADATA,
  DEFAULT_VAB_NATIVE_OPTIONS,
  DEFAULT_LANGGRAPH_OPTIONS,
  DEFAULT_CREWAI_OPTIONS,
  DEFAULT_AUTOGEN_OPTIONS,
} from '../types/config';

const FrameworkIcon = ({ framework }: { framework: ExportFramework }) => {
  const iconMap = {
    'vab-native': Package,
    langgraph: GitBranch,
    crewai: Users,
    autogen: Bot,
  };
  const Icon = iconMap[framework];
  return <Icon className="w-5 h-5" />;
};

const FrameworkCard = ({
  framework,
  selected,
  onClick,
}: {
  framework: ExportFramework;
  selected: boolean;
  onClick: () => void;
}) => {
  const meta = FRAMEWORK_METADATA[framework];
  const colorClasses = {
    indigo: selected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300',
    purple: selected ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500' : 'border-slate-200 hover:border-purple-300',
    teal: selected ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500' : 'border-slate-200 hover:border-teal-300',
    amber: selected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500' : 'border-slate-200 hover:border-amber-300',
  };
  const iconColorClasses = {
    indigo: selected ? 'text-indigo-600 bg-indigo-100' : 'text-slate-500 bg-slate-100',
    purple: selected ? 'text-purple-600 bg-purple-100' : 'text-slate-500 bg-slate-100',
    teal: selected ? 'text-teal-600 bg-teal-100' : 'text-slate-500 bg-slate-100',
    amber: selected ? 'text-amber-600 bg-amber-100' : 'text-slate-500 bg-slate-100',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-start p-3 rounded-xl border-2 transition-all ${colorClasses[meta.color as keyof typeof colorClasses]}`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <Check className="w-4 h-4 text-green-600" />
        </div>
      )}
      <div className={`p-2 rounded-lg mb-2 ${iconColorClasses[meta.color as keyof typeof iconColorClasses]}`}>
        <FrameworkIcon framework={framework} />
      </div>
      <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
      <span className="text-xs text-slate-500 text-left">{meta.description}</span>
    </button>
  );
};

const SkillSchemaCard = ({
  schema,
  selected,
  onClick,
}: {
  schema: SkillSchema;
  selected: boolean;
  onClick: () => void;
}) => {
  const meta = SKILL_SCHEMA_METADATA[schema];
  const Icon = schema === 'agentskills' ? Zap : FileText;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500'
          : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <Check className="w-4 h-4 text-green-600" />
        </div>
      )}
      <div className={`p-2 rounded-lg ${selected ? 'text-indigo-600 bg-indigo-100' : 'text-slate-500 bg-slate-100'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
          {meta.recommended && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-100 rounded">
              Recommended
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{meta.description}</span>
      </div>
    </button>
  );
};

// Framework-specific options panels
const VABNativeOptionsPanel = ({
  options,
  onChange,
}: {
  options: NonNullable<WorkflowConfig['frameworkOptions']['vabNative']>;
  onChange: (options: NonNullable<WorkflowConfig['frameworkOptions']['vabNative']>) => void;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Include Hooks</label>
      <input
        type="checkbox"
        checked={options.includeHooks}
        onChange={(e) => onChange({ ...options, includeHooks: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Include MCP</label>
      <input
        type="checkbox"
        checked={options.includeMcp}
        onChange={(e) => onChange({ ...options, includeMcp: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Include Commands</label>
      <input
        type="checkbox"
        checked={options.includeCommands}
        onChange={(e) => onChange({ ...options, includeCommands: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Generate README</label>
      <input
        type="checkbox"
        checked={options.generateReadme}
        onChange={(e) => onChange({ ...options, generateReadme: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
  </div>
);

const LangGraphOptionsPanel = ({
  options,
  onChange,
}: {
  options: NonNullable<WorkflowConfig['frameworkOptions']['langgraph']>;
  onChange: (options: NonNullable<WorkflowConfig['frameworkOptions']['langgraph']>) => void;
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-sm text-slate-600 mb-1">State Schema</label>
      <select
        value={options.stateSchema}
        onChange={(e) => onChange({ ...options, stateSchema: e.target.value as typeof options.stateSchema })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="typed-dict">TypedDict</option>
        <option value="pydantic">Pydantic</option>
        <option value="dataclass">Dataclass</option>
      </select>
    </div>
    <div>
      <label className="block text-sm text-slate-600 mb-1">Checkpointer</label>
      <select
        value={options.checkpointer}
        onChange={(e) => onChange({ ...options, checkpointer: e.target.value as typeof options.checkpointer })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="memory">Memory</option>
        <option value="sqlite">SQLite</option>
        <option value="postgres">PostgreSQL</option>
        <option value="none">None</option>
      </select>
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Async Mode</label>
      <input
        type="checkbox"
        checked={options.asyncMode}
        onChange={(e) => onChange({ ...options, asyncMode: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Streaming</label>
      <input
        type="checkbox"
        checked={options.streamingEnabled}
        onChange={(e) => onChange({ ...options, streamingEnabled: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
  </div>
);

const CrewAIOptionsPanel = ({
  options,
  onChange,
}: {
  options: NonNullable<WorkflowConfig['frameworkOptions']['crewai']>;
  onChange: (options: NonNullable<WorkflowConfig['frameworkOptions']['crewai']>) => void;
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-sm text-slate-600 mb-1">Process Type</label>
      <select
        value={options.processType}
        onChange={(e) => onChange({ ...options, processType: e.target.value as typeof options.processType })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="sequential">Sequential</option>
        <option value="hierarchical">Hierarchical</option>
      </select>
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Verbose Output</label>
      <input
        type="checkbox"
        checked={options.verbose}
        onChange={(e) => onChange({ ...options, verbose: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Enable Memory</label>
      <input
        type="checkbox"
        checked={options.memoryEnabled}
        onChange={(e) => onChange({ ...options, memoryEnabled: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Enable Cache</label>
      <input
        type="checkbox"
        checked={options.cacheEnabled}
        onChange={(e) => onChange({ ...options, cacheEnabled: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
  </div>
);

const AutoGenOptionsPanel = ({
  options,
  onChange,
}: {
  options: NonNullable<WorkflowConfig['frameworkOptions']['autogen']>;
  onChange: (options: NonNullable<WorkflowConfig['frameworkOptions']['autogen']>) => void;
}) => (
  <div className="space-y-3">
    <div>
      <label className="block text-sm text-slate-600 mb-1">Conversation Pattern</label>
      <select
        value={options.conversationPattern}
        onChange={(e) => onChange({ ...options, conversationPattern: e.target.value as typeof options.conversationPattern })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="two-agent">Two Agent</option>
        <option value="group-chat">Group Chat</option>
        <option value="nested">Nested</option>
      </select>
    </div>
    <div>
      <label className="block text-sm text-slate-600 mb-1">Human Input Mode</label>
      <select
        value={options.humanInputMode}
        onChange={(e) => onChange({ ...options, humanInputMode: e.target.value as typeof options.humanInputMode })}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="NEVER">Never</option>
        <option value="TERMINATE">Terminate</option>
        <option value="ALWAYS">Always</option>
      </select>
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Code Execution</label>
      <input
        type="checkbox"
        checked={options.codeExecutionEnabled}
        onChange={(e) => onChange({ ...options, codeExecutionEnabled: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
    <div className="flex items-center justify-between">
      <label className="text-sm text-slate-600">Use Docker</label>
      <input
        type="checkbox"
        checked={options.useDocker}
        onChange={(e) => onChange({ ...options, useDocker: e.target.checked })}
        className="rounded text-indigo-600 focus:ring-indigo-500"
      />
    </div>
  </div>
);

export const ConfigModal = () => {
  const { workflowConfig, setWorkflowConfig, isConfigModalOpen, setConfigModalOpen } = useStore();
  const [localConfig, setLocalConfig] = useState<WorkflowConfig>(workflowConfig);

  // Sync local config when modal opens
  useEffect(() => {
    if (isConfigModalOpen) {
      setLocalConfig(workflowConfig);
    }
  }, [isConfigModalOpen, workflowConfig]);

  const handleFrameworkChange = (framework: ExportFramework) => {
    // Ensure framework options exist for the selected framework
    const frameworkOptions = { ...localConfig.frameworkOptions };
    if (framework === 'vab-native' && !frameworkOptions.vabNative) {
      frameworkOptions.vabNative = DEFAULT_VAB_NATIVE_OPTIONS;
    } else if (framework === 'langgraph' && !frameworkOptions.langgraph) {
      frameworkOptions.langgraph = DEFAULT_LANGGRAPH_OPTIONS;
    } else if (framework === 'crewai' && !frameworkOptions.crewai) {
      frameworkOptions.crewai = DEFAULT_CREWAI_OPTIONS;
    } else if (framework === 'autogen' && !frameworkOptions.autogen) {
      frameworkOptions.autogen = DEFAULT_AUTOGEN_OPTIONS;
    }
    setLocalConfig({ ...localConfig, framework, frameworkOptions });
  };

  const handleSave = () => {
    setWorkflowConfig(localConfig);
    setConfigModalOpen(false);
  };

  const handleCancel = () => {
    setLocalConfig(workflowConfig);
    setConfigModalOpen(false);
  };

  if (!isConfigModalOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Workflow Configuration</h2>
                <p className="text-sm text-white/70">Configure export target and options</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Workflow Identity */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={localConfig.name}
                  onChange={(e) => setLocalConfig({ ...localConfig, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="My Workflow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Version
                </label>
                <input
                  type="text"
                  value={localConfig.version}
                  onChange={(e) => setLocalConfig({ ...localConfig, version: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="1.0.0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                value={localConfig.description}
                onChange={(e) => setLocalConfig({ ...localConfig, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                rows={2}
                placeholder="Describe your workflow..."
              />
            </div>
          </div>

          {/* Target Framework */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Target Framework</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['vab-native', 'langgraph', 'crewai', 'autogen'] as ExportFramework[]).map((fw) => (
                <FrameworkCard
                  key={fw}
                  framework={fw}
                  selected={localConfig.framework === fw}
                  onClick={() => handleFrameworkChange(fw)}
                />
              ))}
            </div>
          </div>

          {/* Skill Schema */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Skill Schema</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['agentskills', 'simple'] as SkillSchema[]).map((schema) => (
                <SkillSchemaCard
                  key={schema}
                  schema={schema}
                  selected={localConfig.skillSchema === schema}
                  onClick={() => setLocalConfig({ ...localConfig, skillSchema: schema })}
                />
              ))}
            </div>
          </div>

          {/* Framework Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              {FRAMEWORK_METADATA[localConfig.framework].label} Options
            </h3>
            <div className="bg-slate-50 rounded-xl p-4">
              {localConfig.framework === 'vab-native' && localConfig.frameworkOptions.vabNative && (
                <VABNativeOptionsPanel
                  options={localConfig.frameworkOptions.vabNative}
                  onChange={(opts) =>
                    setLocalConfig({
                      ...localConfig,
                      frameworkOptions: { ...localConfig.frameworkOptions, vabNative: opts },
                    })
                  }
                />
              )}
              {localConfig.framework === 'langgraph' && localConfig.frameworkOptions.langgraph && (
                <LangGraphOptionsPanel
                  options={localConfig.frameworkOptions.langgraph}
                  onChange={(opts) =>
                    setLocalConfig({
                      ...localConfig,
                      frameworkOptions: { ...localConfig.frameworkOptions, langgraph: opts },
                    })
                  }
                />
              )}
              {localConfig.framework === 'crewai' && localConfig.frameworkOptions.crewai && (
                <CrewAIOptionsPanel
                  options={localConfig.frameworkOptions.crewai}
                  onChange={(opts) =>
                    setLocalConfig({
                      ...localConfig,
                      frameworkOptions: { ...localConfig.frameworkOptions, crewai: opts },
                    })
                  }
                />
              )}
              {localConfig.framework === 'autogen' && localConfig.frameworkOptions.autogen && (
                <AutoGenOptionsPanel
                  options={localConfig.frameworkOptions.autogen}
                  onChange={(opts) =>
                    setLocalConfig({
                      ...localConfig,
                      frameworkOptions: { ...localConfig.frameworkOptions, autogen: opts },
                    })
                  }
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
