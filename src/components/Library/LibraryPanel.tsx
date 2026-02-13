import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchInventory,
  InventoryItem,
  BundleComponent,
  searchInventory as searchInventoryAPI,
  SearchResult,
} from '../../services/api';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Bot,
  Hammer,
  Plug,
  Loader2,
  Terminal,
  Anchor,
  Sparkles,
  Plus,
  Check,
  ArrowLeft,
  Building2,
  Users,
  Server,
  Cloud,
  Package,
  GripVertical,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { NodeType } from '../../types/core';
import { BundleCard } from './BundleCard';
import useStore from '../../store/useStore';
import { SearchFilters } from './SearchFilters';
import { BucketView } from './BucketView';

// Map bundle component category to NodeType
const categoryToNodeType: Record<string, NodeType> = {
  agents: 'AGENT',
  commands: 'COMMAND',
  skills: 'SKILL',
  hooks: 'HOOK',
  departments: 'DEPARTMENT',
  'agent-pools': 'AGENT_POOL',
  'mcp-servers': 'MCP_SERVER',
  mcps: 'MCP_SERVER',
};

// Draggable node templates for creating new nodes
interface NodeTemplate {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const containerNodeTemplates: NodeTemplate[] = [
  {
    type: 'DEPARTMENT',
    label: 'Department',
    icon: <Building2 size={18} />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200 hover:border-orange-400',
    description: 'Container for agent pools',
  },
  {
    type: 'AGENT_POOL',
    label: 'Agent Pool',
    icon: <Users size={18} />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200 hover:border-teal-400',
    description: 'Scalable agent group',
  },
  {
    type: 'MCP_SERVER',
    label: 'MCP Server',
    icon: <Server size={18} />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200 hover:border-violet-400',
    description: 'Protocol server config',
  },
];

const componentNodeTemplates: NodeTemplate[] = [
  {
    type: 'AGENT',
    label: 'Agent',
    icon: <Bot size={18} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200 hover:border-blue-400',
    description: 'AI agent with capabilities',
  },
  {
    type: 'SKILL',
    label: 'Skill',
    icon: <Sparkles size={18} />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200 hover:border-green-400',
    description: 'Reusable capability',
  },
  {
    type: 'HOOK',
    label: 'Hook',
    icon: <Anchor size={18} />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200 hover:border-pink-400',
    description: 'Event automation',
  },
  {
    type: 'COMMAND',
    label: 'Command',
    icon: <Terminal size={18} />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200 hover:border-slate-400',
    description: 'Slash command',
  },
];

// Helper to get icon based on category or type
const getIcon = (item: InventoryItem) => {
  if (item.type === 'folder') return <Folder size={14} className="text-blue-400" />;
  if (item.type === 'bundle') return <Package size={14} className="text-indigo-500" />;

  switch (item.category) {
    case 'AGENT': return <Bot size={14} className="text-blue-500" />;
    case 'SKILL': return <Sparkles size={14} className="text-green-500" />;
    case 'TOOL': return <Hammer size={14} className="text-amber-500" />;
    case 'PLUGIN': return <Plug size={14} className="text-purple-500" />;
    case 'COMMAND': return <Terminal size={14} className="text-slate-500" />;
    case 'HOOK': return <Anchor size={14} className="text-pink-500" />;
    case 'DEPARTMENT': return <Building2 size={14} className="text-orange-500" />;
    case 'AGENT_POOL': return <Users size={14} className="text-teal-500" />;
    case 'MCP_SERVER': return <Server size={14} className="text-violet-500" />;
    case 'PROVIDER': return <Cloud size={14} className="text-cyan-500" />;
    default: return <File size={14} className="text-slate-400" />;
  }
};

interface FileTreeItemProps {
  item: InventoryItem;
  level?: number;
  onDragStart: (e: React.DragEvent, item: InventoryItem) => void;
  addMode?: boolean;
  isAdded?: boolean;
  onAddClick?: (item: InventoryItem) => void;
}

const FileTreeItem = ({ item, level = 0, onDragStart, addMode, isAdded, onAddClick }: FileTreeItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.type === 'folder' && item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddClick && item.type === 'file') {
      onAddClick(item);
    }
  };

  return (
    <div>
      <div
        className={`
          group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer select-none
          transition-all duration-150
          ${level > 0 ? 'ml-3' : ''}
          ${isAdded ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent'}
          ${!addMode && item.type === 'file' ? 'active:scale-[0.98]' : ''}
        `}
        onClick={handleClick}
        draggable={item.type === 'file' && !addMode}
        onDragStart={(e) => item.type === 'file' && !addMode && onDragStart(e, item)}
      >
        {/* Drag Handle */}
        {!addMode && item.type === 'file' && (
          <GripVertical size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}

        {/* Add/Check button in add mode */}
        {addMode && item.type === 'file' && (
          <button
            onClick={handleAddClick}
            className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-md transition-all ${
              isAdded
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-200 hover:bg-indigo-500 hover:text-white text-slate-500'
            }`}
          >
            {isAdded ? <Check size={12} /> : <Plus size={12} />}
          </button>
        )}

        {/* Chevron for folders */}
        {(!addMode || item.type === 'folder') && (
          <div className="text-slate-400 shrink-0 w-4 h-4 flex items-center justify-center">
            {hasChildren && (
              isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            )}
          </div>
        )}

        <div className="shrink-0">
          {getIcon(item)}
        </div>

        <span
          className={`text-sm truncate flex-1 ${isAdded ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}
          title={item.description}
        >
          {item.name}
        </span>
      </div>

      {hasChildren && isOpen && (
        <div className="ml-2 border-l border-slate-100 pl-1">
          {item.children?.map(child => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              onDragStart={onDragStart}
              addMode={addMode}
              isAdded={isAdded}
              onAddClick={onAddClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Map library category names to node types for search filtering
const CATEGORY_TO_TYPE_MAP: Record<string, string[]> = {
  agents: ['AGENT'],
  skills: ['SKILL'],
  commands: ['COMMAND'],
  hooks: ['HOOK'],
  mcps: ['TOOL', 'MCP_SERVER'],
  settings: ['PROVIDER'],
  bundles: ['BUNDLE'],
};

export const LibraryPanel = () => {
  const {
    libraryCategory,
    addToAgentMode,
    setLibraryCategory,
    selectedNode,
    updateNodeData,
    libraryFilters,
    setLibraryFilters,
    resetLibraryFilters,
    libraryViewMode,
    setLibraryViewMode,
    isLibraryPanelCollapsed,
    toggleLibraryPanel,
  } = useStore();

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: true,
  });

  // Determine if we should use search mode
  const useSearchMode = libraryFilters.search ||
    libraryFilters.types.length > 0 ||
    libraryFilters.repos.length > 0 ||
    libraryFilters.categories.length > 0 ||
    libraryFilters.buckets.length > 0 ||
    libraryFilters.subcategories.length > 0;

  // Perform search when filters change
  useEffect(() => {
    if (!useSearchMode) {
      setSearchResults(null);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        // Build type filter based on category if not global search
        let typesFilter = libraryFilters.types;
        if (!libraryFilters.globalSearch && libraryCategory !== 'bundles') {
          const categoryTypes = CATEGORY_TO_TYPE_MAP[libraryCategory];
          if (categoryTypes) {
            // If user selected types, intersect with category types
            if (typesFilter.length > 0) {
              typesFilter = typesFilter.filter(t => categoryTypes.includes(t));
            } else {
              typesFilter = categoryTypes;
            }
          }
        }

        const result = await searchInventoryAPI({
          q: libraryFilters.search || undefined,
          types: typesFilter.length > 0 ? typesFilter : undefined,
          repos: libraryFilters.repos.length > 0 ? libraryFilters.repos : undefined,
          categories: libraryFilters.categories.length > 0 ? libraryFilters.categories : undefined,
          buckets: libraryFilters.buckets.length > 0 ? libraryFilters.buckets : undefined,
          subcategories: libraryFilters.subcategories.length > 0 ? libraryFilters.subcategories : undefined,
          limit: 100,
        });
        setSearchResults(result);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(performSearch, 200);
    return () => clearTimeout(debounce);
  }, [libraryFilters, libraryCategory, useSearchMode]);

  // Filter inventory to selected category's children
  const filteredInventory = inventory?.find(item => item.name === libraryCategory)?.children || [];

  // Map category to config key
  const categoryToConfigKey: Record<string, 'skills' | 'mcps' | 'commands'> = {
    skills: 'skills',
    mcps: 'mcps',
    commands: 'commands',
  };

  // Get currently added items for the selected node
  const configKey = categoryToConfigKey[libraryCategory];
  const addedItems: string[] = selectedNode?.data?.config?.[configKey] || [];

  // Check if an item is added to the current agent
  const isItemAdded = (itemName: string): boolean => {
    return addedItems.includes(itemName);
  };

  // Toggle an item on/off the agent's config
  const toggleItemOnAgent = (item: InventoryItem) => {
    if (!selectedNode || !configKey) return;

    const current = selectedNode.data.config?.[configKey] || [];
    const itemValue = item.name;
    const updated = current.includes(itemValue)
      ? current.filter((v: string) => v !== itemValue)
      : [...current, itemValue];

    updateNodeData(selectedNode.id, {
      config: { ...selectedNode.data.config, [configKey]: updated }
    });
  };

  // Exit add mode
  const handleExitAddMode = () => {
    setLibraryCategory(libraryCategory, false);
  };

  // Handle bucket selection from BucketView
  const handleBucketSelect = (bucketId: string) => {
    // Set bucket filter and clear any subcategory filter
    setLibraryFilters({ buckets: [bucketId], subcategories: [] });
  };

  // Handle subcategory selection from BucketView
  const handleSubcategorySelect = (bucketId: string, subcategoryId: string) => {
    // Set both bucket and subcategory filters
    setLibraryFilters({ buckets: [bucketId], subcategories: [subcategoryId] });
  };

  // Handle drag for node templates
  const onTemplateDragStart = (event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', template.type);
    event.dataTransfer.setData('application/label', template.label);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag for regular items
  const onDragStart = (event: React.DragEvent, item: InventoryItem) => {
    const nodeType = (item.category || 'AGENT') as NodeType;

    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', item.name);
    event.dataTransfer.setData('application/filepath', item.path);
    event.dataTransfer.setData('application/repo', item.repo || '');
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag for bundles and bundle components
  const onBundleDragStart = (
    event: React.DragEvent,
    item: InventoryItem | BundleComponent,
    isBundle?: boolean,
    parentRepo?: string
  ) => {
    if (isBundle && 'bundleData' in item && item.bundleData) {
      event.dataTransfer.setData('application/reactflow', 'BUNDLE');
      event.dataTransfer.setData('application/label', item.name);
      event.dataTransfer.setData('application/bundledata', JSON.stringify(item.bundleData));
      event.dataTransfer.setData('application/repo', item.repo || '');
    } else {
      const comp = item as BundleComponent;
      const nodeType = categoryToNodeType[comp.category] || 'AGENT';
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.setData('application/label', comp.name);
      event.dataTransfer.setData('application/filepath', comp.path);
      event.dataTransfer.setData('application/repo', parentRepo || '');
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  // Bundles view
  const renderBundlesContent = () => {
    if (!filteredInventory.length) {
      return <div className="p-4 text-xs text-slate-400 text-center">No bundles available</div>;
    }

    let bundles = filteredInventory.filter((item) => item.type === 'bundle');

    // Use search results if available
    if (useSearchMode && searchResults) {
      const bundleIds = new Set(
        searchResults.items.filter(i => i.isBundle).map(i => i.id)
      );
      bundles = bundles.filter(b => bundleIds.has(b.id));
    }

    if (bundles.length === 0) {
      return <div className="p-4 text-xs text-slate-400 text-center">No matching bundles</div>;
    }

    return (
      <div className="p-3 space-y-3">
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} bundle={bundle} onDragStart={onBundleDragStart} />
        ))}
      </div>
    );
  };

  // Render search results from API
  const renderSearchResults = () => {
    const showAddMode = addToAgentMode && selectedNode && configKey;

    if (isSearching) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <p className="text-sm">Searching...</p>
        </div>
      );
    }

    if (!searchResults || searchResults.items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Search className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No matching components</p>
        </div>
      );
    }

    return (
      <div className="p-2 space-y-1">
        {searchResults.items.map((item) => {
          const itemIsAdded = isItemAdded(item.name);
          const inventoryItem: InventoryItem = {
            id: item.id,
            name: item.name,
            path: item.path,
            type: item.isBundle ? 'bundle' : 'file',
            category: item.nodeType,
            description: item.description,
            repo: item.repo,
          };

          return (
            <div
              key={item.id}
              className={`group flex items-center gap-2 p-2 rounded-lg transition-all ${
                showAddMode
                  ? 'cursor-pointer hover:bg-slate-50'
                  : 'cursor-grab active:cursor-grabbing hover:bg-slate-50'
              } ${itemIsAdded ? 'bg-emerald-50 border border-emerald-200' : 'border border-transparent'}`}
              draggable={!showAddMode}
              onDragStart={(e) => !showAddMode && onDragStart(e, inventoryItem)}
              onClick={() => showAddMode && toggleItemOnAgent(inventoryItem)}
            >
              {!showAddMode && (
                <GripVertical
                  size={12}
                  className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
              {showAddMode && (
                <div
                  className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-md transition-all ${
                    itemIsAdded ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {itemIsAdded ? <Check size={12} /> : <Plus size={12} />}
                </div>
              )}
              {getIcon(inventoryItem)}
              <div className="flex flex-col overflow-hidden flex-1">
                <span
                  className={`text-sm truncate ${
                    itemIsAdded ? 'text-emerald-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  {item.name}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                    {item.nodeType}
                  </span>
                  {item.repo && (
                    <span className="truncate">{item.repo.replace(/-main$/, '')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (libraryCategory === 'bundles') {
      return renderBundlesContent();
    }

    // Use search results if filters are active
    if (useSearchMode) {
      return renderSearchResults();
    }

    if (!filteredInventory.length) return null;

    const showAddMode = addToAgentMode && selectedNode && configKey;

    return (
      <div className="p-2 space-y-0.5">
        {filteredInventory.map(item => (
          <FileTreeItem
            key={item.id}
            item={item}
            onDragStart={onDragStart}
            addMode={!!showAddMode}
            isAdded={isItemAdded(item.name)}
            onAddClick={toggleItemOnAgent}
          />
        ))}
      </div>
    );
  };

  // Collapsed state - show minimal sidebar with expand button
  if (isLibraryPanelCollapsed) {
    return (
      <aside className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-4 h-full z-10 shrink-0 transition-all duration-200">
        <button
          onClick={toggleLibraryPanel}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors group"
          title="Expand Library Panel"
        >
          <PanelLeftOpen size={18} />
        </button>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center" title="Agents">
            <Bot size={14} className="text-blue-500" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center" title="Skills">
            <Sparkles size={14} className="text-green-500" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center" title="Departments">
            <Building2 size={14} className="text-orange-500" />
          </div>
        </div>
      </aside>
    );
  }

  if (isLoading) return (
    <aside className="w-72 bg-white border-r border-slate-200 flex items-center justify-center h-full shrink-0 transition-all duration-200">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="animate-spin w-6 h-6" />
        <span className="text-sm">Loading Library...</span>
      </div>
    </aside>
  );

  if (error) return (
    <aside className="w-72 bg-white border-r border-slate-200 p-4 shrink-0 transition-all duration-200">
      <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
        Failed to load inventory. Is the server running?
        <button
          onClick={() => refetch()}
          className="mt-2 w-full px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    </aside>
  );

  const showAddModeHeader = addToAgentMode && selectedNode && configKey;

  // Render draggable node template card
  const renderNodeTemplateCard = (template: NodeTemplate) => (
    <div
      key={template.type}
      draggable
      onDragStart={(e) => onTemplateDragStart(e, template)}
      className={`group p-3 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all active:scale-[0.98] ${template.bgColor} ${template.borderColor}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-white/80 shadow-sm ${template.color}`}>
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{template.label}</p>
          <p className="text-xs text-slate-500 truncate">{template.description}</p>
        </div>
        <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );

  // Render the Create Nodes section
  const renderNodeTemplates = () => (
    <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Plus size={12} />
        Create Nodes
      </h3>

      {/* Container Nodes */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-medium">Containers</p>
        <div className="space-y-2">
          {containerNodeTemplates.map(renderNodeTemplateCard)}
        </div>
      </div>

      {/* Component Nodes */}
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-medium">Components</p>
        <div className="space-y-2">
          {componentNodeTemplates.map(renderNodeTemplateCard)}
        </div>
      </div>
    </div>
  );

  return (
    <aside className="relative w-72 bg-white border-r border-slate-200 flex flex-col h-full z-10 shrink-0 transition-all duration-200">
      {/* Collapse Toggle */}
      <button
        onClick={toggleLibraryPanel}
        className="absolute top-1/2 -translate-y-1/2 -right-3 z-20 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all"
        title="Collapse Library Panel"
      >
        <PanelLeftClose size={14} />
      </button>

      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        {showAddModeHeader ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleExitAddMode}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={16} className="text-slate-500" />
              </button>
              <div className="flex-1">
                <h2 className="font-bold text-slate-800 text-sm">
                  {libraryCategory.charAt(0).toUpperCase() + libraryCategory.slice(1)}
                </h2>
                <p className="text-xs text-indigo-600">
                  Adding to: <span className="font-medium">{selectedNode.data.label || selectedNode.id}</span>
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
              Click items to add them to this agent
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800 text-sm">
                {libraryCategory.charAt(0).toUpperCase() + libraryCategory.slice(1)}
              </h2>
              {/* View Mode Toggle */}
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setLibraryViewMode('type')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    libraryViewMode === 'type'
                      ? 'bg-white shadow-sm text-slate-800 font-medium'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  By Type
                </button>
                <button
                  onClick={() => setLibraryViewMode('bucket')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    libraryViewMode === 'bucket'
                      ? 'bg-white shadow-sm text-slate-800 font-medium'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  By Goal
                </button>
              </div>
            </div>
          </>
        )}

        {/* Search Filters */}
        <div className="mt-3">
          <SearchFilters
            facets={searchResults?.facets || null}
            filters={libraryFilters}
            onChange={setLibraryFilters}
            onReset={resetLibraryFilters}
            addToAgentMode={!!showAddModeHeader}
            totalResults={searchResults?.total}
            isLoading={isSearching}
            showBucketFilters={libraryViewMode === 'bucket' && !!useSearchMode}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {!showAddModeHeader && renderNodeTemplates()}
        {/* Show bucket view when in bucket mode and no active search/filters */}
        {libraryViewMode === 'bucket' && !useSearchMode && !showAddModeHeader ? (
          <BucketView
            onSelectBucket={handleBucketSelect}
            onSelectSubcategory={handleSubcategorySelect}
            selectedBuckets={libraryFilters.buckets}
            selectedSubcategories={libraryFilters.subcategories}
          />
        ) : (
          renderContent()
        )}
      </div>
    </aside>
  );
};
