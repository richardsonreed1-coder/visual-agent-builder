import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSystem,
  updateSystemStatus,
  archiveSystem,
  DeploymentStatus,
  TriggerPattern,
} from '../../services/api';
import useStore from '../../store/useStore';
import { Activity, AlertCircle, Archive, ArrowLeft, Calendar, CheckCircle, Clock,
  DollarSign, Loader2, MessageSquare, Play, RefreshCw, RotateCcw, Server, Square,
  Timer, Webhook, XCircle } from 'lucide-react';

const STATUS_CONFIG: Record<DeploymentStatus, { label: string; color: string; bg: string; dot: string }> = {
  deployed: { label: 'Online', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  stopped: { label: 'Stopped', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  errored: { label: 'Errored', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-50', dot: 'bg-slate-300' },
};

const TRIGGER_LABELS: Record<TriggerPattern, { label: string; icon: React.ReactNode }> = {
  cron: { label: 'Cron Schedule', icon: <Timer size={14} className="text-amber-500" /> },
  webhook: { label: 'Webhook', icon: <Webhook size={14} className="text-blue-500" /> },
  messaging: { label: 'Messaging', icon: <MessageSquare size={14} className="text-purple-500" /> },
  'always-on': { label: 'Always On', icon: <Activity size={14} className="text-emerald-500" /> },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

const VARIANT_STYLES = {
  default: 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  danger: 'text-red-700 bg-white border-red-200 hover:bg-red-50 hover:border-red-300',
  success: 'text-emerald-700 bg-white border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300',
};

function ActionButton({ icon, label, onClick, variant = 'default', loading }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  variant?: 'default' | 'danger' | 'success'; loading?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_STYLES[variant]}`}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="text-xs text-slate-500 flex items-center gap-2">{icon}{label}</span>
      <span className="text-sm text-slate-800 font-medium">{value}</span>
    </div>
  );
}

export function SystemDetail() {
  const selectedSystemSlug = useStore(state => state.selectedSystemSlug);
  const setSelectedSystemSlug = useStore(state => state.setSelectedSystemSlug);
  const queryClient = useQueryClient();

  const { data: system, isLoading, error } = useQuery({
    queryKey: ['system', selectedSystemSlug],
    queryFn: () => fetchSystem(selectedSystemSlug!),
    enabled: !!selectedSystemSlug,
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: DeploymentStatus) =>
      updateSystemStatus(selectedSystemSlug!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', selectedSystemSlug] });
      queryClient.invalidateQueries({ queryKey: ['systems'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveSystem(selectedSystemSlug!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systems'] });
      setSelectedSystemSlug(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading system details...</p>
        </div>
      </div>
    );
  }

  if (error || !system) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-700 font-medium">Failed to load system</p>
          <button
            onClick={() => setSelectedSystemSlug(null)}
            className="mt-3 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[system.status] || STATUS_CONFIG.stopped;
  const trigger = TRIGGER_LABELS[system.triggerType] || TRIGGER_LABELS.cron;
  const manifest = system.manifestJson;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedSystemSlug(null)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} className="text-slate-500" />
            </button>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              <Server size={20} className="text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-slate-800 text-lg">{system.systemName}</h2>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color} ${status.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${system.status === 'deployed' ? 'animate-pulse' : ''}`} />
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{system.systemSlug}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          {system.status === 'deployed' && (
            <ActionButton
              icon={<Square size={14} />}
              label="Stop"
              onClick={() => statusMutation.mutate('stopped')}
              loading={statusMutation.isPending}
            />
          )}
          {system.status === 'stopped' && (
            <ActionButton
              icon={<Play size={14} />}
              label="Start"
              variant="success"
              onClick={() => statusMutation.mutate('deployed')}
              loading={statusMutation.isPending}
            />
          )}
          {system.status === 'errored' && (
            <ActionButton
              icon={<RotateCcw size={14} />}
              label="Restart"
              variant="success"
              onClick={() => statusMutation.mutate('deployed')}
              loading={statusMutation.isPending}
            />
          )}
          <ActionButton
            icon={<RefreshCw size={14} />}
            label="Redeploy"
            onClick={() => statusMutation.mutate('deployed')}
            loading={statusMutation.isPending}
          />
          <ActionButton
            icon={<Archive size={14} />}
            label="Archive"
            variant="danger"
            onClick={() => archiveMutation.mutate()}
            loading={archiveMutation.isPending}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* System Overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">System Overview</h3>
            <InfoRow label="Name" value={system.systemName} icon={<Server size={12} />} />
            {manifest?.description && (
              <InfoRow label="Description" value={manifest.description} />
            )}
            <InfoRow label="Version" value={manifest?.version ?? '1.0.0'} />
            <InfoRow label="Category" value={manifest?.category ?? 'N/A'} />
            <InfoRow label="Output Type" value={manifest?.outputType ?? 'N/A'} />
            <InfoRow
              label="Estimated Cost"
              value={`$${manifest?.estimatedCostUsd?.toFixed(2) ?? '0.00'}/run`}
              icon={<DollarSign size={12} />}
            />
          </div>

          {/* Trigger & Deployment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Trigger & Deployment</h3>
            <div className="flex items-center gap-2 py-2.5 border-b border-slate-100">
              <span className="text-xs text-slate-500 flex-1">Trigger Type</span>
              <span className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                {trigger.icon}
                {trigger.label}
              </span>
            </div>
            <InfoRow label="PM2 Process" value={system.pm2ProcessName} />
            <InfoRow
              label="Deployed"
              value={formatDate(system.deployedAt)}
              icon={<Calendar size={12} />}
            />
            <InfoRow
              label="Created"
              value={formatDate(system.createdAt)}
              icon={<Clock size={12} />}
            />
            <InfoRow
              label="Last Updated"
              value={formatDate(system.updatedAt)}
              icon={<RefreshCw size={12} />}
            />
            <InfoRow
              label="Nodes / Edges"
              value={`${manifest?.nodeCount ?? 0} / ${manifest?.edgeCount ?? 0}`}
            />
          </div>

          {/* PM2 Process Status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">PM2 Process Status</h3>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.bg}`}>
                {system.status === 'deployed' && <CheckCircle size={20} className="text-emerald-500" />}
                {system.status === 'stopped' && <Square size={20} className="text-slate-400" />}
                {system.status === 'errored' && <XCircle size={20} className="text-red-500" />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${status.color}`}>{status.label}</p>
                <p className="text-xs text-slate-500">{system.pm2ProcessName}</p>
              </div>
            </div>
            {statusMutation.isError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                Failed to update status. Please try again.
              </div>
            )}
          </div>

          {/* Execution History */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Recent Executions</h3>
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Clock size={24} className="mb-2 opacity-50" />
              <p className="text-xs font-medium text-slate-500">No execution history yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Execution tracking will be available with WebSocket streaming.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}