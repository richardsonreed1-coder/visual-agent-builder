import { UseFormWatch, UseFormSetValue, FieldErrors, FieldValues } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { ChevronDown } from 'lucide-react';
import { AgentRoleCategory } from '../../../types/core';

interface RoleSelectFieldProps {
  field: FieldSchema;
  errors: FieldErrors;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

// Category metadata
const CATEGORY_OPTIONS: Array<{
  value: AgentRoleCategory;
  label: string;
  description: string;
}> = [
  { value: 'independent', label: 'Independent', description: 'Work alone without coordination' },
  { value: 'team', label: 'Team', description: 'Part of a coordinated group' },
  { value: 'coordinator', label: 'Coordinator', description: 'Manage and orchestrate others' },
  { value: 'continuous', label: 'Continuous', description: 'Ongoing monitoring tasks' },
];

// Roles organized by category (updated mapping per user request)
const ROLES_BY_CATEGORY: Record<AgentRoleCategory, Array<{
  value: string;
  label: string;
  description: string;
}>> = {
  independent: [
    { value: 'solo', label: 'Solo', description: 'Works independently on complete tasks' },
    { value: 'specialist', label: 'Specialist', description: 'Deep expertise in a specific domain' },
    { value: 'planner', label: 'Planner', description: 'Creates detailed plans and breaks down tasks' },
    { value: 'auditor', label: 'Auditor', description: 'Independent 3rd-party review and compliance' },
    { value: 'critic', label: 'Critic', description: 'Reviews and validates work, provides feedback' },
  ],
  team: [
    { value: 'member', label: 'Member', description: 'Executes assigned tasks as part of a team' },
    { value: 'executor', label: 'Executor', description: 'Strictly follows plans with high precision' },
  ],
  coordinator: [
    { value: 'leader', label: 'Leader', description: 'Orchestrates team and ensures quality delivery' },
    { value: 'orchestrator', label: 'Orchestrator', description: 'Coordinates multiple team leaders' },
    { value: 'router', label: 'Router', description: 'Routes tasks to appropriate agents' },
  ],
  continuous: [
    { value: 'monitor', label: 'Monitor', description: 'Continuous health monitoring and alerting' },
  ],
};

// Get category for a role
const getCategoryForRole = (role: string): AgentRoleCategory | null => {
  for (const [category, roles] of Object.entries(ROLES_BY_CATEGORY)) {
    if (roles.some(r => r.value === role)) {
      return category as AgentRoleCategory;
    }
  }
  return null;
};

export const RoleSelectField = ({ field, errors, watch, setValue }: RoleSelectFieldProps) => {
  const error = errors[field.key];
  const currentRole = watch(field.key);
  const currentCategory = watch('roleCategory') as AgentRoleCategory | undefined;

  // Determine the selected category (from roleCategory or inferred from role)
  const selectedCategory = currentCategory || (currentRole ? getCategoryForRole(currentRole) : null);
  const availableRoles = selectedCategory ? ROLES_BY_CATEGORY[selectedCategory] : [];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as AgentRoleCategory;
    setValue('roleCategory', newCategory, { shouldDirty: true });

    // Auto-select first role in the new category
    const firstRole = ROLES_BY_CATEGORY[newCategory]?.[0];
    if (firstRole) {
      setValue(field.key, firstRole.value, { shouldDirty: true });
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setValue(field.key, newRole, { shouldDirty: true });

    // Update category to match
    const category = getCategoryForRole(newRole);
    if (category) {
      setValue('roleCategory', category, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-3">
      {/* Category Selector */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-600">
          Role Category
        </label>
        <div className="relative">
          <select
            value={selectedCategory || ''}
            onChange={handleCategoryChange}
            className="w-full px-3 py-2 text-sm border rounded-lg appearance-none
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              border-gray-200 bg-white"
          >
            <option value="">Select category...</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
        {selectedCategory && (
          <p className="text-xs text-gray-400">
            {CATEGORY_OPTIONS.find(c => c.value === selectedCategory)?.description}
          </p>
        )}
      </div>

      {/* Role Selector (only show if category is selected) */}
      {selectedCategory && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600">
            {field.label}
            {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <select
              value={currentRole || ''}
              onChange={handleRoleChange}
              className={`
                w-full px-3 py-2 text-sm border rounded-lg appearance-none
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}
              `}
            >
              <option value="">Select role...</option>
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
          {currentRole && (
            <p className="text-xs text-gray-400">
              {availableRoles.find(r => r.value === currentRole)?.description}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-500">{error.message as string}</p>
          )}
        </div>
      )}

      {/* Hidden field hint */}
      {!selectedCategory && field.description && (
        <p className="text-xs text-gray-400">{field.description}</p>
      )}
    </div>
  );
};
