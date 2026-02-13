import { useCallback } from 'react';
import { UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface ArrayFieldProps {
  field: FieldSchema;
  errors: FieldErrors;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

export const ArrayField = ({ field, errors, watch, setValue }: ArrayFieldProps) => {
  const error = errors[field.key];
  // Phase 7.1: Defensive — coerce non-array values to arrays
  const rawItems = watch(field.key);
  const items: string[] = Array.isArray(rawItems) ? rawItems : (rawItems ? [String(rawItems)] : []);

  const addItem = useCallback(() => {
    setValue(field.key, [...items, ''], { shouldDirty: true });
  }, [items, field.key, setValue]);

  const removeItem = useCallback((index: number) => {
    setValue(field.key, items.filter((_, i) => i !== index), { shouldDirty: true });
  }, [items, field.key, setValue]);

  const updateItem = useCallback((index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setValue(field.key, newItems, { shouldDirty: true });
  }, [items, field.key, setValue]);

  const moveItem = useCallback((from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const newItems = [...items];
    const [removed] = newItems.splice(from, 1);
    newItems.splice(to, 0, removed);
    setValue(field.key, newItems, { shouldDirty: true });
  }, [items, field.key, setValue]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-600">
          {field.label}
          {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <div className="space-y-1.5">
        {items.length === 0 ? (
          <div className="text-xs text-gray-400 italic py-2 text-center border border-dashed border-gray-200 rounded-lg">
            No items. Click "Add" to create one.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 group"
            >
              <button
                type="button"
                className="p-1 text-gray-300 hover:text-gray-500 cursor-grab"
                onMouseDown={(e) => {
                  e.preventDefault();
                  // Basic keyboard reordering
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') moveItem(index, index - 1);
                  if (e.key === 'ArrowDown') moveItem(index, index + 1);
                }}
                tabIndex={0}
              >
                <GripVertical size={14} />
              </button>
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={field.placeholder || `Item ${index + 1}`}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
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
