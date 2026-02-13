import { useState, useCallback } from 'react';
import { UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface ObjectFieldProps {
  field: FieldSchema;
  errors: FieldErrors;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

export const ObjectField = ({ field, errors, watch, setValue }: ObjectFieldProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const error = errors[field.key];
  const obj: Record<string, string> = watch(field.key) || {};
  const entries = Object.entries(obj);

  const addEntry = useCallback(() => {
    if (newKey.trim()) {
      setValue(field.key, { ...obj, [newKey.trim()]: newValue }, { shouldDirty: true });
      setNewKey('');
      setNewValue('');
    }
  }, [obj, newKey, newValue, field.key, setValue]);

  const removeEntry = useCallback((key: string) => {
    const { [key]: _, ...rest } = obj;
    setValue(field.key, rest, { shouldDirty: true });
  }, [obj, field.key, setValue]);

  const updateEntry = useCallback((oldKey: string, newKeyName: string, value: string) => {
    const newObj = { ...obj };
    if (oldKey !== newKeyName) {
      delete newObj[oldKey];
    }
    newObj[newKeyName] = value;
    setValue(field.key, newObj, { shouldDirty: true });
  }, [obj, field.key, setValue]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <label className="text-xs font-medium text-gray-600 cursor-pointer">
          {field.label}
          {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-xs text-gray-400">({entries.length} entries)</span>
      </button>

      {isExpanded && (
        <div className="pl-4 border-l-2 border-gray-100 space-y-2">
          {/* Existing entries */}
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 group">
              <input
                type="text"
                defaultValue={key}
                onBlur={(e) => {
                  if (e.target.value !== key) {
                    updateEntry(key, e.target.value, value);
                  }
                }}
                className="w-1/3 px-2 py-1 text-xs font-mono border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                placeholder="Key"
              />
              <span className="text-gray-400">=</span>
              <input
                type="text"
                value={value}
                onChange={(e) => updateEntry(key, key, e.target.value)}
                className="flex-1 px-2 py-1 text-xs font-mono border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                placeholder="Value"
              />
              <button
                type="button"
                onClick={() => removeEntry(key)}
                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add new entry */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEntry()}
              className="w-1/3 px-2 py-1 text-xs font-mono border border-dashed border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              placeholder="New key"
            />
            <span className="text-gray-400">=</span>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEntry()}
              className="flex-1 px-2 py-1 text-xs font-mono border border-dashed border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              placeholder="Value"
            />
            <button
              type="button"
              onClick={addEntry}
              disabled={!newKey.trim()}
              className="p-1 text-indigo-500 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
            </button>
          </div>
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
