import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Canvas } from './components/Editor/Canvas';
import { LibraryPanel } from './components/Library/LibraryPanel';
import { PropertiesPanel } from './components/Properties/PropertiesPanel';
import { ConfigModal } from './components/ConfigModal';
import { StatusPanel } from './components/StatusPanel';
import { ChatPanel } from './components/Chat';
import { TerminalPanel } from './components/Terminal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImportDropzone } from './features/export-import/components/ImportDropzone';
import { SystemsDashboard } from './components/Library/SystemsDashboard';
import { SystemDetail } from './components/Library/SystemDetail';
import { fetchInventory } from './services/api';
import { Zap, Settings, LayoutDashboard } from 'lucide-react';
import useStore from './store/useStore';

const queryClient = new QueryClient();

function AppContent() {
  const { libraryCategory, setLibraryCategory, workflowConfig, setConfigModalOpen, activeView, setActiveView, selectedSystemSlug } = useStore();
  const [showImportDropzone, setShowImportDropzone] = useState(false);

  const handleImportClick = useCallback(() => {
    setShowImportDropzone(true);
  }, []);

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  // Extract top-level category names from inventory
  const categories = inventory?.map(item => item.name) || [];

  // Handle category tab click - exit addToAgentMode when clicking tabs directly
  const handleCategoryTabClick = (cat: string) => {
    setLibraryCategory(cat, false);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between z-20 shrink-0 shadow-sm">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Zap size={20} fill="currentColor" className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg tracking-tight">Visual Agent Builder</h1>
            <p className="text-xs text-slate-500">Design AI workflows visually</p>
          </div>
        </div>

        {/* Center: Workflow Name & Settings */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfigModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
          >
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
              {workflowConfig.name}
            </span>
            <Settings size={14} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Right: Category Tabs + Systems Dashboard */}
        <div className="flex items-center gap-2">
          {activeView === 'builder' && (
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryTabClick(cat)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    libraryCategory === cat
                      ? 'bg-white text-indigo-700 font-medium shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setActiveView(activeView === 'systems' ? 'builder' : 'systems')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-all ${
              activeView === 'systems'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <LayoutDashboard size={14} />
            Systems
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === 'builder' ? (
          <>
            {/* Library Panel */}
            <LibraryPanel />

            {/* Canvas Area */}
            <main className="flex-1 relative">
              <ErrorBoundary fallbackTitle="Canvas error">
                <Canvas onImportClick={handleImportClick} />
              </ErrorBoundary>
            </main>

            {/* Properties Panel */}
            <ErrorBoundary fallbackTitle="Properties panel error">
              <PropertiesPanel />
            </ErrorBoundary>
          </>
        ) : (
          selectedSystemSlug ? <SystemDetail /> : <SystemsDashboard />
        )}
      </div>

      {/* Footer Status Bar */}
      <footer className="h-10 bg-white border-t border-slate-200 flex items-center justify-center px-4 shrink-0">
        <StatusPanel />
      </footer>

      {/* Config Modal */}
      <ConfigModal />

      {/* AI Chat Panel (floating bottom-right) */}
      <ChatPanel />

      {/* Phase 6: Runtime Terminal Panel (floating bottom center) */}
      <TerminalPanel />

      {/* Phase 8: Import Dropzone Overlay */}
      <ImportDropzone
        isActive={showImportDropzone}
        onDeactivate={() => setShowImportDropzone(false)}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
