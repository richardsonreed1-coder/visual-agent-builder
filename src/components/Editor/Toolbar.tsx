import { useState, useRef, useEffect } from 'react';
import { ReactFlowInstance } from 'reactflow';
import {
  Play,
  Trash2,
  FileJson,
  FileText,
  Package,
  ChevronDown,
  Download,
  Upload,
  Save,
  Settings2,
  CheckCircle2,
  X,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { generateWorkflowJson, downloadFile } from '../../utils/export';
import { generateClaudeMdExecutable } from '../../utils/generateClaudeMdExecutable';
import { generateSystemBundle, BundleMetadata } from '../../export/bundle-generator';
import { downloadBundleAsZip } from '../../export/bundle-zip';
import { ExportDialog } from '../../features/export-import/components/ExportDialog';
import { ConfigureWizardModal } from '../ConfigureWizard/ConfigureWizardModal';

interface ToolbarProps {
  reactFlowInstance?: ReactFlowInstance | null;
  onImportClick?: () => void;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

export const Toolbar = ({ reactFlowInstance, onImportClick }: ToolbarProps = {}) => {
  const { nodes, edges, setNodes, setEdges, workflowConfig } = useStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showConfigureWizard, setShowConfigureWizard] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      setNodes([]);
      setEdges([]);
    }
  };

  const handleExportJson = () => {
    const json = generateWorkflowJson(nodes, edges);
    const filename = workflowConfig.name.toLowerCase().replace(/\s+/g, '-') + '.json';
    downloadFile(JSON.stringify(json, null, 2), filename, 'application/json');
    setShowExportMenu(false);
    showToast('JSON exported successfully');
  };

  const handleExportClaudeMd = () => {
    const md = generateClaudeMdExecutable(nodes, edges, workflowConfig.name);
    downloadFile(md, 'CLAUDE.md', 'text/markdown');
    setShowExportMenu(false);
    showToast('CLAUDE.md exported successfully');
  };

  const handleExportSystemBundle = async () => {
    if (nodes.length === 0) {
      showToast('Add some nodes to the canvas before exporting.', 'error');
      setShowExportMenu(false);
      return;
    }

    const agentNodes = nodes.filter((n) => n.data.type === 'AGENT');
    if (agentNodes.length === 0) {
      showToast('Add at least one agent node to export a system bundle.', 'error');
      setShowExportMenu(false);
      return;
    }

    try {
      const metadata: BundleMetadata = {
        name: workflowConfig.name,
        description: workflowConfig.description,
        version: workflowConfig.version,
        environment: workflowConfig.environment,
      };

      const bundle = generateSystemBundle(nodes, edges, metadata);
      await downloadBundleAsZip(bundle);
      setShowExportMenu(false);
      showToast(`System bundle "${workflowConfig.name}" exported as ZIP`);
    } catch (err) {
      setShowExportMenu(false);
      showToast('Failed to generate system bundle. Check console for details.', 'error');
      console.error('System bundle export error:', err);
    }
  };

  const handleRun = async () => {
    if (nodes.length === 0) {
      alert('Add some nodes to the canvas before running.');
      return;
    }

    const agentNodes = nodes.filter((n) => n.data.type === 'AGENT');
    if (agentNodes.length === 0) {
      alert('Add at least one agent node to run.');
      return;
    }

    try {
      const metadata: BundleMetadata = {
        name: workflowConfig.name,
        description: workflowConfig.description,
        version: workflowConfig.version,
        environment: workflowConfig.environment,
      };

      const bundle = generateSystemBundle(nodes, edges, metadata);
      await downloadBundleAsZip(bundle);
    } catch (err) {
      alert('Failed to generate run bundle. Check console for details.');
      console.error('Run bundle error:', err);
    }
  };

  return (
    <>
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-1.5 flex items-center gap-1">
          {/* Run Button */}
          <button
            onClick={handleRun}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <Play size={14} fill="currentColor" />
            <span>Run</span>
          </button>

          {/* Configure Button */}
          <button
            onClick={() => setShowConfigureWizard(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            title="AI-powered configuration wizard"
          >
            <Settings2 size={14} />
            <span>Configure</span>
          </button>

          <div className="w-px h-7 bg-slate-200 mx-1" />

          {/* Export Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                showExportMenu
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {showExportMenu && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[240px] z-50 overflow-hidden">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Export Options
                </div>
                <button
                  onClick={handleExportJson}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <FileJson size={14} className="text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Export JSON</p>
                    <p className="text-xs text-slate-400">Save/load canvas state</p>
                  </div>
                </button>
                <button
                  onClick={handleExportSystemBundle}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <Package size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Export System Bundle</p>
                    <p className="text-xs text-slate-400">Deployable ZIP with agents & config</p>
                  </div>
                </button>
                <button
                  onClick={handleExportClaudeMd}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-purple-50 rounded-lg">
                    <FileText size={14} className="text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Export CLAUDE.md</p>
                    <p className="text-xs text-slate-400">Execution protocol reference</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-7 bg-slate-200 mx-1" />

          {/* Save Workflow Button */}
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors active:scale-[0.98]"
            title="Save Workflow (.agent-workflow)"
          >
            <Save size={14} />
            <span>Save</span>
          </button>

          {/* Load Workflow Button */}
          <button
            onClick={onImportClick}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors active:scale-[0.98]"
            title="Load Workflow (.agent-workflow)"
          >
            <Upload size={14} />
            <span>Load</span>
          </button>

          <div className="w-px h-7 bg-slate-200 mx-1" />

          {/* Clear Button */}
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-[0.98]"
            title="Clear Canvas"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Phase 8: Save Workflow Dialog */}
      <ExportDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        reactFlowInstance={reactFlowInstance || null}
      />

      {/* Configure Wizard Modal */}
      <ConfigureWizardModal
        isOpen={showConfigureWizard}
        onClose={() => setShowConfigureWizard(false)}
      />

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            ) : (
              <X size={16} className="text-red-500 shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast((t) => ({ ...t, visible: false }))}
              className={`ml-2 p-0.5 rounded-md transition-colors ${
                toast.type === 'success'
                  ? 'hover:bg-emerald-100'
                  : 'hover:bg-red-100'
              }`}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
