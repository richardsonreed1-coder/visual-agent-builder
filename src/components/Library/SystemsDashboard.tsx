import { useQuery } from '@tanstack/react-query';
import {
  fetchSystems,
  DeploymentRecord,
  DeploymentStatus,
  TriggerPattern,
} from '../../services/api';
import useStore from '../../store/useStore';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Square,
  Timer,
  Webhook,
  Zap,
  MessageSquare,
} from 'lucide-react';

const STATUS_CONFIG: Record<DeploymentStatus, { label: string; color: string; bg: string; border: string }> = {
  deployed: { label: 'Deployed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  stopped: { label: 'Stopped', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  errored: { label: 'Errored', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' },
};

const TRIGGER_CONFIG: Record<TriggerPattern, { label: string; icon: React.ReactNode }> = {
  cron: { label: 'Cron', icon: <Timer size={12} /> },
  webhook: { label: 'Webhook', icon: <Webhook size={12} /> },
  messaging: { label: 'Messaging', icon: <MessageSquare size={12} /> },
  'always-on': { label: 'Always On', icon: <Activity size={12} /> },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface SystemCardProps {
  system: DeploymentRecord;
  onClick: () => void;
}

function SystemCard({ system, onClick }: SystemCardProps) {
  const status = STATUS_CONFIG[system.status] || STATUS_CONFIG.stopped;
  const trigger = TRIGGER_CONFIG[system.triggerType] || TRIGGER_CONFIG.cron;
  const manifest = system.manifestJson;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shrink-0 group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors">
            <Server size={18} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors">
              {system.systemName}
            </h3>
            {manifest?.description && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{manifest.description}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 ml-2 px-2.5 py-1 rounded-full text-[11px] font-medium border ${status.color} ${status.bg} ${status.border}`}>
          {status.label}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1 text-slate-400">
            {trigger.icon}
          </div>
          <span>{trigger.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock size={12} className="text-slate-400" />
          <span>{formatRelativeTime(system.deployedAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Zap size={12} className="text-slate-400" />
          <span>0 executions</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <DollarSign size={12} className="text-slate-400" />
          <span>${manifest?.estimatedCostUsd?.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>v{manifest?.version ?? '1.0.0'}</span>
        <span className="flex items-center gap-1">
          <Calendar size={10} />
          {new Date(system.createdAt).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}

export function SystemsDashboard() {
  const setActiveView = useStore(state => state.setActiveView);
  const setSelectedSystemSlug = useStore(state => state.setSelectedSystemSlug);

  const { data: systems, isLoading, error, refetch } = useQuery({
    queryKey: ['systems'],
    queryFn: fetchSystems,
    refetchInterval: 10000,
  });

  const handleCardClick = (slug: string) => {
    setSelectedSystemSlug(slug);
  };

  const deployedCount = systems?.filter(s => s.status === 'deployed').length ?? 0;
  const stoppedCount = systems?.filter(s => s.status === 'stopped').length ?? 0;
  const erroredCount = systems?.filter(s => s.status === 'errored').length ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Dashboard Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('builder')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} className="text-slate-500" />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Deployed Systems</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {systems?.length ?? 0} systems registered
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Play size={12} className="text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">{deployedCount} deployed</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Square size={12} className="text-slate-500" />
            <span className="text-xs font-medium text-slate-600">{stoppedCount} stopped</span>
          </div>
          {erroredCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={12} className="text-red-600" />
              <span className="text-xs font-medium text-red-700">{erroredCount} errored</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && !systems && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Loading systems...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-700 font-medium">Failed to load systems</p>
            <p className="text-xs text-red-500 mt-1">Is the server running? Check the database connection.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {systems && systems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Server size={32} className="mb-3 opacity-50" />
            <p className="text-sm font-medium text-slate-500">No systems deployed yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Design a workflow in the builder and deploy it to see it here.
            </p>
            <button
              onClick={() => setActiveView('builder')}
              className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium transition-colors border border-indigo-200"
            >
              Go to Builder
            </button>
          </div>
        )}

        {systems && systems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systems.map(system => (
              <SystemCard
                key={system.id}
                system={system}
                onClick={() => handleCardClick(system.systemSlug)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}