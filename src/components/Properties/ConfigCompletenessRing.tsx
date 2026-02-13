import { useMemo } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { FieldSchema } from './schemas';

interface ConfigCompletenessRingProps {
  fields: FieldSchema[];
  config: Record<string, unknown>;
  visibleSectionIds: Set<string>;
}

interface CompletenessData {
  total: number;
  filled: number;
  percentage: number;
  requiredMissing: string[];
}

export const ConfigCompletenessRing = ({
  fields,
  config,
  visibleSectionIds,
}: ConfigCompletenessRingProps) => {
  const completeness = useMemo((): CompletenessData => {
    // Only count fields in visible sections
    const visibleFields = fields.filter(field => visibleSectionIds.has(field.section));

    const requiredMissing: string[] = [];

    let filledCount = 0;
    const totalCount = visibleFields.length;

    visibleFields.forEach(field => {
      const value = getNestedValue(config, field.key);
      const isFilled = isFieldFilled(value, field);

      if (isFilled) {
        filledCount++;
      } else if (field.validation?.required) {
        requiredMissing.push(field.label);
      }
    });

    return {
      total: totalCount,
      filled: filledCount,
      percentage: totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0,
      requiredMissing,
    };
  }, [fields, config, visibleSectionIds]);

  // Calculate SVG ring values
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (completeness.percentage / 100) * circumference;

  // Determine ring color based on completeness
  const getColor = (percentage: number) => {
    if (percentage >= 80) return '#22c55e'; // green-500
    if (percentage >= 50) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  const ringColor = getColor(completeness.percentage);
  const hasErrors = completeness.requiredMissing.length > 0;

  return (
    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
      {/* Ring */}
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke="#e2e8f0"
            strokeWidth="4"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke={ringColor}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* Center percentage */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-700">
            {completeness.percentage}%
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {hasErrors ? (
            <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          ) : completeness.percentage === 100 ? (
            <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
          ) : null}
          <span className="text-xs font-medium text-slate-600">
            {completeness.filled}/{completeness.total} fields
          </span>
        </div>
        {hasErrors && (
          <p className="text-xs text-amber-600 mt-0.5 truncate" title={completeness.requiredMissing.join(', ')}>
            Missing: {completeness.requiredMissing.slice(0, 2).join(', ')}
            {completeness.requiredMissing.length > 2 && ` +${completeness.requiredMissing.length - 2} more`}
          </p>
        )}
      </div>
    </div>
  );
};

// Helper to get nested value from config using dot notation
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

// Helper to check if a field is considered "filled"
const isFieldFilled = (value: unknown, field: FieldSchema): boolean => {
  if (value === undefined || value === null) return false;

  // Empty string is not filled
  if (typeof value === 'string' && value.trim() === '') return false;

  // Empty array is not filled
  if (Array.isArray(value) && value.length === 0) return false;

  // Empty object is not filled (unless it's a nested config)
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
    return false;
  }

  // For checkboxes, false is a valid "filled" value
  if (field.type === 'checkbox') return true;

  // Numbers of 0 are valid
  if (typeof value === 'number') return true;

  return true;
};
