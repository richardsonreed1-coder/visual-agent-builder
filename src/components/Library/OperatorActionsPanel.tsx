import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOperatorActions,
  fetchPendingActions,
  approveAction,
  rejectAction,
  OperatorType,
  OperatorAction,
} from '../../services/api';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  Shield,
  TrendingUp,
  Wrench,
  XCircle,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const OPERATOR_BADGES: Record<
  OperatorType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  system_monitor: {
    label: 'Monitor',
    color: 'bg-blue-100 text-blue-700',
    icon: <Shield size={12} />,
  },
  remediation: {
    label: 'QA Remediation',
    color: 'bg-amber-100 text-amber-700',
    icon: <Wrench size={12} />,
  },
  optimization: {
    label: 'Optimization',
    color: 'bg-purple-100 text-purple-700',
    icon: <TrendingUp size={12} />,
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getStatusBadge(action: OperatorAction) {
  if (action.autoApplied) {
    return { label: 'Auto-applied', color: 'bg-emerald-100 text-emerald-700' };
  }
  if (action.approved === null) {
    return { label: 'Pending', color: 'bg-amber-100 text-amber-700' };
  }
  if (action.approved) {
    return { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' };
  }
  return { label: 'Rejected', color: 'bg-red-100 text-red-700' };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function PendingActionCard({
  action,
  onApprove,
  onReject,
  isLoading,
}: {
  action: OperatorAction;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  const badge = OPERATOR_BADGES[action.operatorType];

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}
            >
              {badge.icon}
              {badge.label}
            </span>
            <span className="text-[10px] text-slate-400">
              {formatDate(action.createdAt)}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {action.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors disabled:opacity-50"
          >
            <CheckCircle size={12} />
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50"
          >
            <XCircle size={12} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ action }: { action: OperatorAction }) {
  const badge = OPERATOR_BADGES[action.operatorType];
  const status = getStatusBadge(action);

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${badge.color}`}
      >
        {badge.icon}
        {badge.label}
      </span>
      <p className="flex-1 text-xs text-slate-700 truncate">
        {action.description}
      </p>
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${status.color}`}
      >
        {status.label}
      </span>
      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
        <Clock size={10} />
        {formatDate(action.createdAt)}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

interface OperatorActionsPanelProps {
  systemSlug?: string;
}

export default function OperatorActionsPanel({
  systemSlug,
}: OperatorActionsPanelProps) {
  const [filter, setFilter] = useState<OperatorType | ''>('');
  const queryClient = useQueryClient();

  const { data: actionsData, isLoading } = useQuery({
    queryKey: ['operator-actions', systemSlug, filter],
    queryFn: () =>
      fetchOperatorActions({
        operatorType: filter || undefined,
        systemSlug,
        limit: 50,
      }),
    refetchInterval: 30000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['operator-actions-pending', systemSlug],
    queryFn: () => fetchPendingActions(systemSlug),
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: approveAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-actions'] });
      queryClient.invalidateQueries({ queryKey: ['operator-actions-pending'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-actions'] });
      queryClient.invalidateQueries({ queryKey: ['operator-actions-pending'] });
    },
  });

  const pendingActions = pendingData?.actions ?? [];
  const allActions = actionsData?.actions ?? [];
  const mutationPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Operator Actions
        </h3>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as OperatorType | '')}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600"
          >
            <option value="">All Types</option>
            <option value="system_monitor">Monitor</option>
            <option value="remediation">QA Remediation</option>
            <option value="optimization">Optimization</option>
          </select>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingActions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-700">
              {pendingActions.length} Pending Approval
              {pendingActions.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {pendingActions.map((action) => (
              <PendingActionCard
                key={action.id}
                action={action}
                onApprove={() => approveMutation.mutate(action.id)}
                onReject={() => rejectMutation.mutate(action.id)}
                isLoading={mutationPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Actions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : allActions.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          No operator actions recorded.
        </p>
      ) : (
        <div className="space-y-1.5">
          {allActions.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
