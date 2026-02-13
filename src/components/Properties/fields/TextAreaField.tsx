import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';

interface TextAreaFieldProps {
  field: FieldSchema;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  value?: string;
}

export const TextAreaField = ({ field, register, errors, value }: TextAreaFieldProps) => {
  const [copied, setCopied] = useState(false);
  const error = errors[field.key];

  const handleCopy = useCallback(() => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-600">
          {field.label}
          {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
      <textarea
        {...register(field.key, {
          required: field.validation?.required ? `${field.label} is required` : false,
        })}
        placeholder={field.placeholder}
        rows={4}
        className={`
          w-full px-3 py-2 text-sm border rounded-lg font-mono resize-y
          focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}
        `}
      />
      {field.description && !error && (
        <p className="text-xs text-gray-400">{field.description}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error.message as string}</p>
      )}
    </div>
  );
};
