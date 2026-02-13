import { useState, useRef, useEffect } from 'react';
import { ReactFlowInstance } from 'reactflow';
import {
  Play,
  Trash2,
  FileJson,
  FileText,
  FolderArchive,
  ChevronDown,
  Download,
  Upload,
  Save,
  Eye,
  BookOpen,
  Settings2,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { generateWorkflowJson, downloadFile } from '../../utils/export';
import { generateDirectoryExport } from '../../utils/exportDirectory';
import { generateClaudeMdExecutable } from '../../utils/generateClaudeMdExecutable';
import { downloadAsZip, generateDirectoryTree } from '../../utils/zipGenerator';
import { ExportDialog } from '../../features/export-import/components/ExportDialog';
import { ConfigureWizardModal } from '../ConfigureWizard/ConfigureWizardModal';

interface ToolbarProps {
  reactFlowInstance?: ReactFlowInstance | null;
  onImportClick?: () => void;
}

export const Toolbar = ({ reactFlowInstance, onImportClick }: ToolbarProps = {}) => {
  const { nodes, edges, setNodes, setEdges, workflowConfig } = useStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showConfigureWizard, setShowConfigureWizard] = useState(false);
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
  };

  const handleExportMd = () => {
    const md = generateClaudeMdExecutable(nodes, edges, workflowConfig.name);
    downloadFile(md, 'CLAUDE.md', 'text/markdown');
    setShowExportMenu(false);
  };

  const handleExportZipWithFormat = async (format: 'executable' | 'documentary') => {
    const files = generateDirectoryExport(nodes, edges, workflowConfig.name, {
      claudeMdFormat: format,
    });
    const suffix = format === 'executable' ? '-run' : '-docs';
    const filename = workflowConfig.name.toLowerCase().replace(/\s+/g, '-') + suffix + '.zip';
    await downloadAsZip(files, filename);
    setShowExportMenu(false);
  };

  const handleExportZip = async () => {
    await handleExportZipWithFormat('executable');
  };

  const handlePreviewStructure = () => {
    setShowPreview(true);
    setShowExportMenu(false);
  };

  const handleRun = async () => {
    if (nodes.length === 0) {
      alert('Add some nodes to the canvas before running.');
      return;
    }
    const files = generateDirectoryExport(nodes, edges, workflowConfig.name, {
      claudeMdFormat: 'executable',
    });
    const filename = workflowConfig.name.toLowerCase().replace(/\s+/g, '-') + '-run.zip';
    await downloadAsZip(files, filename);
  };

  // Generate preview content
  const previewContent = showPreview ? generateDirectoryTree(generateDirectoryExport(nodes, edges)) : '';

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
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[200px] z-50 overflow-hidden">
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
                    <p className="text-xs text-slate-400">Workflow data</p>
                  </div>
                </button>
                <button
                  onClick={handleExportMd}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-green-50 rounded-lg">
                    <FileText size={14} className="text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Export CLAUDE.md</p>
                    <p className="text-xs text-slate-400">Markdown config</p>
                  </div>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Directory Export
                </div>
                <button
                  onClick={() => handleExportZipWithFormat('executable')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <Play size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Export Executable</p>
                    <p className="text-xs text-slate-400">Step-by-step protocol ZIP</p>
                  </div>
                </button>
                <button
                  onClick={() => handleExportZipWithFormat('documentary')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-purple-50 rounded-lg">
                    <BookOpen size={14} className="text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Export Documentary</p>
                    <p className="text-xs text-slate-400">Architecture overview ZIP</p>
                  </div>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handlePreviewStructure}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <div className="p-1.5 bg-slate-100 rounded-lg">
                    <Eye size={14} className="text-slate-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Preview Structure</p>
                    <p className="text-xs text-slate-400">View file tree</p>
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

      {/* Directory Structure Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <FolderArchive className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Export Preview</h3>
                    <p className="text-xs text-slate-400">Directory structure</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[400px] overflow-auto bg-slate-50">
              <pre className="text-sm font-mono text-slate-700 whitespace-pre bg-white p-4 rounded-lg border border-slate-200">
                {previewContent}
              </pre>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleExportZip();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm flex items-center gap-2"
              >
                <FolderArchive size={14} />
                Download ZIP
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
