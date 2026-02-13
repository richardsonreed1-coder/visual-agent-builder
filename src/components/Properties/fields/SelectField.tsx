import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { ChevronDown } from 'lucide-react';

interface SelectFieldProps {
  field: FieldSchema;
  register: UseFormRegister<any>;
  errors: FieldErrors;
}

export const SelectField = ({ field, register, errors }: SelectFieldProps) => {
  const error = errors[field.key];

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {field.label}
        {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          {...register(field.key, {
            required: field.validation?.required ? `${field.label} is required` : false,
          })}
          className={`
            w-full px-3 py-2 text-sm border rounded-lg appearance-none
            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}
          `}
        >
          {!field.validation?.required && (
            <option value="">{field.placeholder || 'Select...'}</option>
          )}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
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
