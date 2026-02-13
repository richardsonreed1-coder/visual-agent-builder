import { UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { Check, Lock } from 'lucide-react';

interface CheckboxFieldProps {
  field: FieldSchema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
}

export const CheckboxField = ({ field, errors, watch, setValue }: CheckboxFieldProps) => {
  const error = errors[field.key];
  const isChecked = watch(field.key) ?? field.defaultValue ?? false;

  const handleToggle = () => {
    if (field.readonly) return;
    setValue(field.key, !isChecked, { shouldDirty: true });
  };

  return (
    <div className={`${field.width === 'half' ? 'w-1/2' : 'w-full'}`}>
      <label
        className={`flex items-center gap-3 cursor-pointer ${field.readonly ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={handleToggle}
      >
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${isChecked
              ? 'bg-indigo-600 border-indigo-600'
              : 'bg-white border-gray-300 hover:border-gray-400'
            }
            ${field.readonly ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isChecked && <Check size={14} className="text-white" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{field.label}</span>
            {field.readonly && (
              <span title="Locked by role">
                <Lock size={12} className="text-amber-500" />
              </span>
            )}
          </div>
          {field.description && (
            <p className="text-xs text-gray-400">{field.description}</p>
          )}
        </div>
      </label>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error.message as string}</p>
      )}
    </div>
  );
};
