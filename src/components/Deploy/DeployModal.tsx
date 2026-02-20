// =============================================================================
// Deploy Modal
// Collects deployment config, generates bundle, registers, and deploys to OpenClaw
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Rocket, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import useStore from '../../store/useStore';
import { generateSystemBundle, BundleMetadata } from '../../export/bundle-generator';
import { slugify } from '../../utils/exportHelpers';
import TriggerConfigFields, { TriggerFormState, TriggerType } from './TriggerConfigFields';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeployPhase = 'idle' | 'bundling' | 'deploying' | 'success' | 'error';

const PHASE_LABELS: Record<DeployPhase, string> = {
  idle: '',
  bundling: 'Generating system bundle...',
  deploying: 'Deploying to OpenClaw...',
  success: 'Deployed successfully!',
  error: 'Deployment failed',
};

export default function DeployModal({ isOpen, onClose }: DeployModalProps) {
  const { nodes, edges, workflowConfig } = useStore();

  const [systemName, setSystemName] = useState(workflowConfig.name);
  const [systemSlug, setSystemSlug] = useState(slugify(workflowConfig.name));
  const [slugEdited, setSlugEdited] = useState(false);
  const [phase, setPhase] = useState<DeployPhase>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [deployedSlug, setDeployedSlug] = useState('');

  const [trigger, setTrigger] = useState<TriggerFormState>({
    type: 'cron',
    cronExpression: '0 6 * * *',
    cronTimezone: 'UTC',
    webhookSlug: slugify(workflowConfig.name),
    messagingChannels: ['slack'],
  });

  // Sync name → slug when name changes (unless user manually edited slug)
  useEffect(() => {
    if (!slugEdited) {
      const newSlug = slugify(systemName);
      setSystemSlug(newSlug);
      setTrigger((prev) => ({ ...prev, webhookSlug: newSlug }));
    }
  }, [systemName, slugEdited]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSystemName(workflowConfig.name);
      const slug = slugify(workflowConfig.name);
      setSystemSlug(slug);
      setSlugEdited(false);
      setPhase('idle');
      setErrorMessage('');
      setDeployedSlug('');
      setTrigger({
        type: 'cron',
        cronExpression: '0 6 * * *',
        cronTimezone: 'UTC',
        webhookSlug: slug,
        messagingChannels: ['slack'],
      });
    }
  }, [isOpen, workflowConfig.name]);

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSystemSlug(cleaned);
    setSlugEdited(true);
    setTrigger((prev) => ({ ...prev, webhookSlug: cleaned }));
  };

  const updateTrigger = useCallback((updates: Partial<TriggerFormState>) => {
    setTrigger((prev) => ({ ...prev, ...updates }));
  }, []);

  const canDeploy =
    phase === 'idle' &&
    systemName.trim().length > 0 &&
    systemSlug.length > 0 &&
    nodes.filter((n) => n.data.type === 'AGENT').length > 0;

  const handleDeploy = async () => {
    setPhase('bundling');
    setErrorMessage('');

    try {
      // Step 1: Generate bundle
      const metadata: BundleMetadata = {
        name: systemName,
        description: workflowConfig.description,
        version: workflowConfig.version,
        triggerPattern: trigger.type as TriggerType,
        environment: workflowConfig.environment,
      };

      const bundle = generateSystemBundle(nodes, edges, metadata);

      // Override manifest slug with user-edited value
      bundle.manifest.slug = systemSlug;
      bundle.manifest.triggerPattern = trigger.type;

      // Step 2: Deploy to OpenClaw (registers + writes configs + starts PM2)
      setPhase('deploying');
      await axios.post('http://localhost:3001/api/deploy', bundle);

      setDeployedSlug(systemSlug);
      setPhase('success');
    } catch (err) {
      setPhase('error');
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.error || err.message;
        setErrorMessage(msg);
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  if (!isOpen) return null;

  const isDeploying = phase === 'bundling' || phase === 'deploying';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isDeploying ? undefined : onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Rocket size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Deploy System</h2>
              <p className="text-xs text-slate-500">Push to OpenClaw runtime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeploying}
            className="p-1.5 rounded-lg hover:bg-white/80 transition-colors disabled:opacity-40"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
          {(phase === 'idle' || phase === 'error') && (
            <>
              {/* System Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System Name</label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* System Slug */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System Slug</label>
                <input
                  type="text"
                  value={systemSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Used in URLs, file paths, and PM2 process names
                </p>
              </div>

              {/* Trigger Config */}
              <TriggerConfigFields trigger={trigger} onUpdate={updateTrigger} />

              {/* Error display */}
              {phase === 'error' && errorMessage && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Deployment failed</p>
                    <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Progress indicator */}
          {isDeploying && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">{PHASE_LABELS[phase]}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Deploying <span className="font-mono">{systemSlug}</span>
                </p>
              </div>
              {/* Step indicators */}
              <div className="flex items-center gap-2 mt-2">
                {(['bundling', 'deploying'] as const).map((step, i) => {
                  const steps = ['bundling', 'deploying'] as const;
                  const stepIndex = steps.indexOf(phase as typeof steps[number]);
                  const isDone = i < stepIndex;
                  const isCurrent = i === stepIndex;
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full transition-all ${
                          isDone
                            ? 'bg-blue-500'
                            : isCurrent
                              ? 'bg-blue-500 animate-pulse'
                              : 'bg-slate-200'
                        }`}
                      />
                      {i < 1 && <div className={`w-8 h-px ${isDone ? 'bg-blue-500' : 'bg-slate-200'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success state */}
          {phase === 'success' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-slate-800">System deployed!</p>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{deployedSlug}</span>{' '}
                  is now running on OpenClaw
                </p>
              </div>
              <div className="text-xs text-slate-400 space-y-1 text-center mt-2">
                <p>PM2 process: <code className="bg-slate-100 px-1 rounded">autopilate-{deployedSlug}</code></p>
                <p>Trigger: <span className="capitalize">{trigger.type}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          {(phase === 'idle' || phase === 'error') && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                disabled={!canDeploy}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
              >
                <Rocket size={14} />
                Deploy
              </button>
            </>
          )}
          {phase === 'success' && (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
