import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Node } from 'reactflow';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { NodeTypeSchema, FieldSchema, SectionSchema, getFieldsForSection, getModelsForProvider } from './schemas';
import {
  TextField,
  TextAreaField,
  SelectField,
  SliderField,
  ChipsField,
  ArrayField,
  ObjectField,
  CapabilityField,
  CheckboxField,
  RoleSelectField,
} from './fields';
import useStore from '../../store/useStore';
import { AgentRole, AgentRoleCategory, ROLE_CATEGORY_MAP } from '../../types/core';
import { getLockedValue } from '../../utils/roleManager';

interface DynamicFormProps {
  node: Node;
  schema: NodeTypeSchema;
}

interface SectionState {
  [sectionId: string]: boolean;
}

// Get role category for visibility checks
const getRoleCategory = (role: AgentRole): AgentRoleCategory => {
  return ROLE_CATEGORY_MAP[role] || 'independent';
};

// Check if a section should be visible based on role
const isSectionVisibleForRole = (
  section: SectionSchema,
  currentRole: AgentRole | undefined
): boolean => {
  // No visibility rules = always visible
  if (!section.visibleWhen) return true;

  // If no role selected, show all sections (backwards compatibility)
  if (!currentRole) return true;

  const { field, values, categories } = section.visibleWhen;

  // Only supports 'role' field for now
  if (field !== 'role') return true;

  // Check if current role is in allowed values
  if (values && values.length > 0) {
    return values.includes(currentRole);
  }

  // Check if current role's category is in allowed categories
  if (categories && categories.length > 0) {
    const roleCategory = getRoleCategory(currentRole);
    return categories.includes(roleCategory);
  }

  return true;
};

export const DynamicForm = ({ node, schema }: DynamicFormProps) => {
  const { updateNodeData } = useStore();

  // Phase 7.1: Track whether a form-initiated update is in flight
  // This prevents the infinite loop: form change → updateNodeData → node.data.config changes → reset → form change → ...
  const isFormUpdateRef = useRef(false);
  const prevNodeIdRef = useRef<string>(node.id);

  // Initialize section expand state from schema defaults
  const [expandedSections, setExpandedSections] = useState<SectionState>(() => {
    const initial: SectionState = {};
    schema.sections.forEach((section) => {
      initial[section.id] = section.defaultOpen;
    });
    return initial;
  });

  const { register, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: node.data.config || {},
  });

  // Phase 7.1 Fix: Only reset form when the NODE ITSELF changes (different node selected),
  // NOT when node.data.config changes (which our own updateNodeData triggers).
  // This breaks the infinite loop: reset → watch → updateNodeData → config changes → reset → ...
  useEffect(() => {
    if (prevNodeIdRef.current !== node.id) {
      prevNodeIdRef.current = node.id;
      isFormUpdateRef.current = false;
      reset(node.data.config || {});
    }
  }, [node.id, reset, node.data.config]);

  // Watch all form values and sync to node
  const formValues = watch();

  // Watch specific fields for visibility calculations
  const currentRole = watch('role') as AgentRole | undefined;
  const currentProvider = watch('provider');

  // Memoize visible sections based on current role
  const visibleSectionIds = useMemo(() => {
    return new Set(
      schema.sections
        .filter(section => isSectionVisibleForRole(section, currentRole))
        .map(s => s.id)
    );
  }, [schema.sections, currentRole]);

  // Update roleCategory when role changes (for AGENT nodes)
  useEffect(() => {
    if (currentRole && schema.type === 'AGENT') {
      const category = getRoleCategory(currentRole);
      const currentCategory = watch('roleCategory');
      if (currentCategory !== category) {
        setValue('roleCategory', category);
      }

      // Apply locked field values when role changes
      const fieldsToCheck = ['temperature', 'thinkingMode'];
      fieldsToCheck.forEach(fieldKey => {
        const lockedInfo = getLockedValue(currentRole, fieldKey);
        if (lockedInfo.locked && lockedInfo.value !== undefined) {
          const currentValue = watch(fieldKey);
          if (currentValue !== lockedInfo.value) {
            setValue(fieldKey, lockedInfo.value);
          }
        }
      });
    }
  }, [currentRole, schema.type, setValue, watch]);

  // Phase 7.1 Fix: Use JSON.stringify comparison to prevent re-syncing unchanged values.
  // The formValues object from watch() is always a new reference, so we compare by content.
  const prevFormJsonRef = useRef<string>('');

  useEffect(() => {
    const json = JSON.stringify(formValues);
    if (json === prevFormJsonRef.current) return; // No actual change
    prevFormJsonRef.current = json;

    // Mark that this update is form-initiated (prevents reset loop)
    isFormUpdateRef.current = true;

    const timeout = setTimeout(() => {
      updateNodeData(node.id, { config: formValues });
    }, 300); // Increased debounce from 100ms to 300ms for stability
    return () => clearTimeout(timeout);
  }, [formValues, node.id, updateNodeData]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Check if a field should be visible (field-level conditional)
  const isFieldVisible = useCallback((field: FieldSchema): boolean => {
    if (!field.conditional) return true;

    const { field: condField, value, operator = 'eq' } = field.conditional;
    const currentValue = watch(condField);

    switch (operator) {
      case 'eq':
        return currentValue === value;
      case 'neq':
        return currentValue !== value;
      case 'in':
        return Array.isArray(value) && value.includes(currentValue);
      case 'exists':
        return currentValue !== undefined && currentValue !== null && currentValue !== '';
      default:
        return true;
    }
  }, [watch]);

  // Check if a field is locked based on current role
  const getFieldLockedInfo = useCallback((fieldKey: string) => {
    if (!currentRole) return { isLocked: false };
    const lockedInfo = getLockedValue(currentRole, fieldKey);
    return {
      isLocked: lockedInfo.locked,
      lockedValue: lockedInfo.value,
      lockedReason: lockedInfo.reason,
    };
  }, [currentRole]);

  // Render locked field indicator
  const renderLockedIndicator = (reason?: string) => (
    <div className="flex items-center gap-1 mt-1 text-amber-600">
      <Lock size={12} />
      <span className="text-xs">{reason || 'Locked by role'}</span>
    </div>
  );

  // Render a single field based on its type
  const renderField = (field: FieldSchema) => {
    // Check field-level visibility
    if (!isFieldVisible(field)) return null;

    // Check if field is locked by role
    const lockedInfo = getFieldLockedInfo(field.key);

    // Handle dynamic model options based on provider selection
    let fieldWithOptions = field;
    if (field.key === 'model' && field.type === 'select' && currentProvider) {
      const models = getModelsForProvider(currentProvider);
      fieldWithOptions = {
        ...field,
        options: models.map((m) => ({ label: m.label, value: m.value })),
      };
    }

    // Mark field as readonly if locked
    if (lockedInfo.isLocked) {
      fieldWithOptions = { ...fieldWithOptions, readonly: true };
    }

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div key={field.key} className="relative">
            <TextField
              field={fieldWithOptions}
              register={register}
              errors={errors}
            />
            {lockedInfo.isLocked && renderLockedIndicator(lockedInfo.lockedReason)}
          </div>
        );

      case 'textarea':
        return (
          <TextAreaField
            key={field.key}
            field={fieldWithOptions}
            register={register}
            errors={errors}
            value={watch(field.key)}
          />
        );

      case 'select':
        return (
          <div key={field.key} className="relative">
            <SelectField
              field={fieldWithOptions}
              register={register}
              errors={errors}
            />
            {lockedInfo.isLocked && renderLockedIndicator(lockedInfo.lockedReason)}
          </div>
        );

      case 'roleSelect':
        return (
          <RoleSelectField
            key={field.key}
            field={fieldWithOptions}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );

      case 'slider':
        return (
          <div key={field.key} className="relative">
            <SliderField
              field={fieldWithOptions}
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              disabled={lockedInfo.isLocked}
            />
            {lockedInfo.isLocked && renderLockedIndicator(lockedInfo.lockedReason)}
          </div>
        );

      case 'checkbox':
        return (
          <CheckboxField
            key={field.key}
            field={fieldWithOptions}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );

      case 'chips':
        return (
          <ChipsField
            key={field.key}
            field={fieldWithOptions}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );

      case 'capabilities':
        return (
          <CapabilityField
            key={field.key}
            field={fieldWithOptions}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );

      case 'array':
        return (
          <ArrayField
            key={field.key}
            field={fieldWithOptions}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );

      case 'object':
        return (
          <ObjectField
            key={field.key}
            field={fieldWithOptions}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        );

      default:
        return null;
    }
  };

  // Render role category badge
  const renderRoleCategoryBadge = (category: AgentRoleCategory) => {
    const colors: Record<AgentRoleCategory, string> = {
      independent: 'bg-blue-100 text-blue-700',
      team: 'bg-green-100 text-green-700',
      coordinator: 'bg-purple-100 text-purple-700',
      continuous: 'bg-orange-100 text-orange-700',
    };

    const labels: Record<AgentRoleCategory, string> = {
      independent: 'Independent',
      team: 'Team',
      coordinator: 'Coordinator',
      continuous: 'Continuous',
    };

    return (
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${colors[category]}`}>
        {labels[category]}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {schema.sections.map((section) => {
        // Check section-level visibility based on role
        if (!visibleSectionIds.has(section.id)) return null;

        const sectionFields = getFieldsForSection(schema.type, section.id);
        const visibleFields = sectionFields.filter(isFieldVisible);
        if (visibleFields.length === 0) return null;

        const isExpanded = expandedSections[section.id];

        return (
          <div key={section.id} className="border border-gray-100 rounded-lg overflow-hidden">
            {/* Section Header */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-gray-500" />
              ) : (
                <ChevronRight size={14} className="text-gray-500" />
              )}
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {section.label}
              </span>
              {/* Show role category badge in role section */}
              {section.id === 'role' && currentRole && (
                renderRoleCategoryBadge(getRoleCategory(currentRole))
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {visibleFields.length} field{visibleFields.length !== 1 ? 's' : ''}
              </span>
            </button>

            {/* Section Content */}
            {isExpanded && (
              <div className="p-3 space-y-4 bg-white">
                {section.description && (
                  <p className="text-xs text-gray-500 italic mb-2">{section.description}</p>
                )}
                {visibleFields.map(renderField)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
