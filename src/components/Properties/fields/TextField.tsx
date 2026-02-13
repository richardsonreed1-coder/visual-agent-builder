import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FieldSchema } from '../schemas';

interface TextFieldProps {
  field: FieldSchema;
  register: UseFormRegister<any>;
  errors: FieldErrors;
}

export const TextField = ({ field, register, errors }: TextFieldProps) => {
  const error = errors[field.key];

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">
        {field.label}
        {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        {...register(field.key, {
          required: field.validation?.required ? `${field.label} is required` : false,
          min: field.validation?.min,
          max: field.validation?.max,
        })}
        placeholder={field.placeholder}
        className={`
          w-full px-3 py-2 text-sm border rounded-lg
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
