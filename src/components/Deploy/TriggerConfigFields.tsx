// =============================================================================
// Trigger Config Fields
// Renders trigger-specific configuration inputs based on selected trigger type
// =============================================================================

import { Clock, Globe, MessageSquare, Activity } from 'lucide-react';

export type TriggerType = 'cron' | 'webhook' | 'messaging' | 'always-on';

export interface TriggerFormState {
  type: TriggerType;
  cronExpression: string;
  cronTimezone: string;
  webhookSlug: string;
  messagingChannels: Array<'whatsapp' | 'telegram' | 'slack' | 'discord'>;
}

interface TriggerConfigFieldsProps {
  trigger: TriggerFormState;
  onUpdate: (updates: Partial<TriggerFormState>) => void;
}

const TRIGGER_OPTIONS: Array<{
  value: TriggerType;
  label: string;
  description: string;
  icon: typeof Clock;
}> = [
  { value: 'cron', label: 'Cron Schedule', description: 'Run on a schedule', icon: Clock },
  { value: 'webhook', label: 'Webhook', description: 'Triggered via HTTP POST', icon: Globe },
  { value: 'messaging', label: 'Messaging Channel', description: 'WhatsApp, Slack, etc.', icon: MessageSquare },
  { value: 'always-on', label: 'Always-On', description: 'Daemon with health checks', icon: Activity },
];

const MESSAGING_PLATFORMS = ['whatsapp', 'telegram', 'slack', 'discord'] as const;

export default function TriggerConfigFields({ trigger, onUpdate }: TriggerConfigFieldsProps) {
  const toggleChannel = (channel: typeof MESSAGING_PLATFORMS[number]) => {
    const current = trigger.messagingChannels;
    const next = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    onUpdate({ messagingChannels: next });
  };

  return (
    <div className="space-y-4">
      {/* Trigger Type Selector */}
      <label className="block text-sm font-medium text-slate-700">Trigger Type</label>
      <div className="grid grid-cols-2 gap-2">
        {TRIGGER_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = trigger.type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ type: opt.value })}
              className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} className={selected ? 'text-blue-600' : 'text-slate-400'} />
              <div>
                <p className={`text-sm font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-slate-400">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trigger-specific fields */}
      <div className="pt-2">
        {trigger.type === 'cron' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cron Expression</label>
              <input
                type="text"
                value={trigger.cronExpression}
                onChange={(e) => onUpdate({ cronExpression: e.target.value })}
                placeholder="0 6 * * *"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">
                e.g. <code className="bg-slate-100 px-1 rounded">0 6 * * *</code> = daily at 6 AM,{' '}
                <code className="bg-slate-100 px-1 rounded">*/5 * * * *</code> = every 5 min
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
              <select
                value={trigger.cronTimezone}
                onChange={(e) => onUpdate({ cronTimezone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Denver">America/Denver</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
          </div>
        )}

        {trigger.type === 'webhook' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
            <div className="flex items-center gap-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
              <span className="px-3 py-2 text-sm text-slate-400 bg-slate-100 border-r border-slate-200 shrink-0">
                POST
              </span>
              <input
                type="text"
                value={`/api/webhooks/${trigger.webhookSlug}`}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-mono text-slate-600"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              This endpoint will be created automatically on deploy.
              Auth token will be generated and included in the deployment record.
            </p>
          </div>
        )}

        {trigger.type === 'messaging' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Channels</label>
            <div className="flex flex-wrap gap-2">
              {MESSAGING_PLATFORMS.map((platform) => {
                const active = trigger.messagingChannels.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => toggleChannel(platform)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all capitalize ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              The Router Agent will classify incoming messages and dispatch to this system.
            </p>
          </div>
        )}

        {trigger.type === 'always-on' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              This system will run as a persistent daemon with automatic restarts.
              A health check endpoint at <code className="bg-amber-100 px-1 rounded text-xs">/health/{trigger.webhookSlug}</code> will
              be polled every 30 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
