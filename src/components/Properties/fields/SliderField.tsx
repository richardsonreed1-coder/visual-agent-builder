import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { FieldSchema } from '../schemas';

interface SliderFieldProps {
  field: FieldSchema;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  disabled?: boolean;
}

export const SliderField = ({ field, register, errors, watch, disabled }: SliderFieldProps) => {
  const error = errors[field.key];
  const currentValue = watch(field.key) ?? field.defaultValue ?? field.validation?.min ?? 0;
  const min = field.validation?.min ?? 0;
  const max = field.validation?.max ?? 100;

  // Determine step based on the range
  const step = max <= 2 ? 0.1 : max <= 10 ? 0.5 : 1;

  return (
    <div className={`space-y-1 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-600">
          {field.label}
          {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {currentValue}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-8">{min}</span>
        <input
          type="range"
          {...register(field.key, { valueAsNumber: true })}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} accent-indigo-500`}
        />
        <span className="text-xs text-gray-400 w-8 text-right">{max}</span>
      </div>
      {field.description && !error && (
        <p className="text-xs text-gray-400">{field.description}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error.message as string}</p>
      )}
    </div>
  );
};
