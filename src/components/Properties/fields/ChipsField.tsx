import { useState, useCallback, KeyboardEvent } from 'react';
import { UseFormWatch, UseFormSetValue, FieldErrors, FieldValues } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { X, Plus } from 'lucide-react';

interface ChipsFieldProps {
  field: FieldSchema;
  errors: FieldErrors;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

export const ChipsField = ({ field, errors, watch, setValue }: ChipsFieldProps) => {
  const [inputValue, setInputValue] = useState('');
  const error = errors[field.key];
  // Phase 7.1: Defensive — coerce non-array values (e.g. strings from enriched config) to arrays
  const rawChips = watch(field.key);
  const chips: string[] = Array.isArray(rawChips) ? rawChips : (rawChips ? [String(rawChips)] : []);

  const addChip = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed && !chips.includes(trimmed)) {
      setValue(field.key, [...chips, trimmed], { shouldDirty: true });
    }
    setInputValue('');
  }, [chips, field.key, setValue]);

  const removeChip = useCallback((chipToRemove: string) => {
    setValue(field.key, chips.filter(chip => chip !== chipToRemove), { shouldDirty: true });
  }, [chips, field.key, setValue]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
      removeChip(chips[chips.length - 1]);
    }
  }, [inputValue, chips, addChip, removeChip]);

  // If field has predefined options, show them as suggestions
  const availableOptions = field.options?.filter(opt => !chips.includes(String(opt.value))) || [];

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {field.label}
        {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className={`
        border rounded-lg p-2 min-h-[80px]
        focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500
        ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}
      `}>
        {/* Chips display */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full"
            >
              {chip}
              <button
                type="button"
                onClick={() => removeChip(chip)}
                className="hover:bg-indigo-200 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={field.placeholder || 'Type and press Enter...'}
            className="flex-1 text-sm bg-transparent outline-none"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => addChip(inputValue)}
              className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions from options */}
      {availableOptions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {availableOptions.slice(0, 8).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => addChip(String(opt.value))}
              className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              + {opt.label}
            </button>
          ))}
        </div>
      )}

      {field.description && !error && (
        <p className="text-xs text-gray-400">{field.description}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error.message as string}</p>
      )}
    </div>
  );
};
