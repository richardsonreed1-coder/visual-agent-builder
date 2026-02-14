import { NodeType } from '@/types/core';

// ============================================================================
// Field Schema Types
// ============================================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'roleSelect'    // Two-step category -> role selector
  | 'number'
  | 'slider'
  | 'checkbox'
  | 'chips'         // Array of tags/chips
  | 'tags'          // Free-form text tags (similar to chips but no predefined options)
  | 'capabilities'  // Capabilities with browse + "when to use" config
  | 'array'         // Dynamic list of items
  | 'object'        // Nested object editor
  | 'keyvalue'      // Key-value pairs (for env vars)
  | 'color';        // Color picker

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  section: string;           // Which section this field belongs to
  options?: { label: string; value: string | number; description?: string }[];
  placeholder?: string;
  description?: string;      // Help text / tooltip
  defaultValue?: string | number | boolean | string[];
  validation?: FieldValidation;
  conditional?: {            // Show field only when condition is met
    field: string;
    value: string | number | boolean;
    operator?: 'eq' | 'neq' | 'in' | 'exists';
  };
  dependsOn?: string;        // Dynamic options based on another field
  width?: 'full' | 'half';   // Layout hint
  readonly?: boolean;
  lockedWhen?: {             // Lock field to specific value based on role
    roles: string[];         // Roles that trigger the lock
    value: string | number | boolean;  // Value to lock the field to
    reason?: string;         // Explanation shown in tooltip
  };
}

export interface SectionSchema {
  id: string;
  label: string;
  icon: string;              // Lucide icon name
  description?: string;
  defaultOpen: boolean;
  collapsible: boolean;
  // Role-based visibility (for AGENT node type)
  visibleWhen?: {
    field: string;           // Field to watch (e.g., 'role')
    values?: string[];       // Show when field value is in this array
    categories?: string[];   // Show when role category is in this array
  };
}

export interface NodeTypeSchema {
  type: NodeType;
  displayName: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isContainer: boolean;
  sections: SectionSchema[];
  fields: FieldSchema[];
}
