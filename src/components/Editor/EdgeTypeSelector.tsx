import { useState, useCallback, useRef, useEffect } from 'react';
import { EdgeType, EDGE_TYPE_INFO } from '../../types/core';
import { Database, GitBranch, Zap, Users, AlertTriangle, Link } from 'lucide-react';

interface EdgeTypeSelectorProps {
  position: { x: number; y: number };
  onSelect: (type: EdgeType) => void;
  onCancel: () => void;
}

const edgeTypeIcons: Record<EdgeType, React.ElementType> = {
  data: Database,
  control: GitBranch,
  event: Zap,
  delegation: Users,
  failover: AlertTriangle,
  default: Link,
};

export const EdgeTypeSelector = ({ position, onSelect, onCancel }: EdgeTypeSelectorProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<EdgeType>('data');

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      } else if (event.key === 'Enter') {
        onSelect(selectedType);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onSelect, selectedType]);

  const handleSelect = useCallback((type: EdgeType) => {
    onSelect(type);
  }, [onSelect]);

  const edgeTypes = Object.keys(EDGE_TYPE_INFO) as EdgeType[];

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 min-w-[200px]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mb-1">
        Connection Type
      </div>
      <div className="space-y-0.5">
        {edgeTypes.map((type) => {
          const info = EDGE_TYPE_INFO[type];
          const Icon = edgeTypeIcons[type];

          return (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              onMouseEnter={() => setSelectedType(type)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all
                ${selectedType === type ? 'bg-gray-100' : 'hover:bg-gray-50'}
              `}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: info.color + '20' }}
              >
                <Icon size={16} style={{ color: info.color }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{info.displayName}</div>
                <div className="text-xs text-gray-500">
                  {type === 'data' && 'Pass data between nodes'}
                  {type === 'control' && 'Control flow and sequencing'}
                  {type === 'event' && 'Event-triggered connections'}
                  {type === 'delegation' && 'Delegate tasks to other agents'}
                  {type === 'failover' && 'Fallback on failure'}
                </div>
              </div>
              <div
                className="w-8 h-0.5 rounded"
                style={{
                  backgroundColor: info.color,
                  ...(info.strokeStyle === 'dashed' && { backgroundImage: `linear-gradient(90deg, ${info.color} 50%, transparent 50%)`, backgroundSize: '8px 100%' }),
                  ...(info.strokeStyle === 'dotted' && { backgroundImage: `linear-gradient(90deg, ${info.color} 25%, transparent 25%)`, backgroundSize: '4px 100%' }),
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="border-t border-gray-100 mt-2 pt-2 px-2">
        <p className="text-[10px] text-gray-400 text-center">
          Press Enter to confirm, Esc to cancel
        </p>
      </div>
    </div>
  );
};
