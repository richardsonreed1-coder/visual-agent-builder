import { useState, useCallback, KeyboardEvent, useRef, useEffect } from 'react';
import { UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { FieldSchema } from '../schemas';
import { X, Plus, Settings, FolderOpen } from 'lucide-react';
import useStore from '../../../store/useStore';
import { CapabilityUsageConfig } from '../../../types/core';

interface CapabilityFieldProps {
  field: FieldSchema;
  errors: FieldErrors;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

export const CapabilityField = ({ field, errors, watch, setValue }: CapabilityFieldProps) => {
  const [inputValue, setInputValue] = useState('');
  const [configPopoverOpen, setConfigPopoverOpen] = useState<string | null>(null);
  const [tempWhenToUse, setTempWhenToUse] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const { setLibraryCategory, selectedNode, updateNodeData } = useStore();

  const error = errors[field.key];
  // Phase 7.1: Defensive — coerce non-array values to arrays
  const rawCaps = watch(field.key);
  const capabilities: string[] = Array.isArray(rawCaps) ? rawCaps : (rawCaps ? [String(rawCaps)] : []);

  // Get capability config from node data
  const getCapabilityConfig = useCallback((name: string): CapabilityUsageConfig => {
    return selectedNode?.data?.config?.capabilityConfig?.[name] || {};
  }, [selectedNode]);

  // Update capability config
  const updateCapabilityConfig = useCallback((name: string, config: CapabilityUsageConfig) => {
    if (!selectedNode) return;

    const currentConfig = selectedNode.data.config?.capabilityConfig || {};
    const newCapabilityConfig = {
      ...currentConfig,
      [name]: config,
    };

    // Remove empty configs
    if (!config.whenToUse) {
      delete newCapabilityConfig[name];
    }

    updateNodeData(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        capabilityConfig: Object.keys(newCapabilityConfig).length > 0 ? newCapabilityConfig : undefined,
      },
    });
  }, [selectedNode, updateNodeData]);

  // Remove capability config when capability is removed
  const removeCapabilityConfig = useCallback((name: string) => {
    if (!selectedNode) return;

    const currentConfig = selectedNode.data.config?.capabilityConfig || {};
    if (currentConfig[name]) {
      const newCapabilityConfig = { ...currentConfig };
      delete newCapabilityConfig[name];

      updateNodeData(selectedNode.id, {
        config: {
          ...selectedNode.data.config,
          capabilityConfig: Object.keys(newCapabilityConfig).length > 0 ? newCapabilityConfig : undefined,
        },
      });
    }
  }, [selectedNode, updateNodeData]);

  const addCapability = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed && !capabilities.includes(trimmed)) {
      setValue(field.key, [...capabilities, trimmed], { shouldDirty: true });
    }
    setInputValue('');
  }, [capabilities, field.key, setValue]);

  const removeCapability = useCallback((capabilityToRemove: string) => {
    setValue(field.key, capabilities.filter(cap => cap !== capabilityToRemove), { shouldDirty: true });
    removeCapabilityConfig(capabilityToRemove);
    if (configPopoverOpen === capabilityToRemove) {
      setConfigPopoverOpen(null);
    }
  }, [capabilities, field.key, setValue, removeCapabilityConfig, configPopoverOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCapability(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && capabilities.length > 0) {
      removeCapability(capabilities[capabilities.length - 1]);
    }
  }, [inputValue, capabilities, addCapability, removeCapability]);

  // Open config popover
  const openConfigPopover = useCallback((name: string) => {
    const config = getCapabilityConfig(name);
    setTempWhenToUse(config.whenToUse || '');
    setConfigPopoverOpen(name);
  }, [getCapabilityConfig]);

  // Save and close config popover
  const saveConfigPopover = useCallback(() => {
    if (configPopoverOpen) {
      updateCapabilityConfig(configPopoverOpen, {
        whenToUse: tempWhenToUse.trim() || undefined,
      });
      setConfigPopoverOpen(null);
      setTempWhenToUse('');
    }
  }, [configPopoverOpen, tempWhenToUse, updateCapabilityConfig]);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        saveConfigPopover();
      }
    };

    if (configPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [configPopoverOpen, saveConfigPopover]);

  // Browse library to add capabilities
  const handleBrowseLibrary = useCallback(() => {
    // Map field key to library category
    const categoryMap: Record<string, string> = {
      skills: 'skills',
      mcps: 'mcps',
      commands: 'commands',
    };
    const category = categoryMap[field.key] || field.key;
    setLibraryCategory(category, true);
  }, [field.key, setLibraryCategory]);

  // Check if capability has config
  const hasConfig = useCallback((name: string): boolean => {
    const config = getCapabilityConfig(name);
    return !!config.whenToUse;
  }, [getCapabilityConfig]);

  return (
    <div className="space-y-1">
      {/* Header with label and Browse button */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-gray-600">
          {field.label}
          {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <button
          type="button"
          onClick={handleBrowseLibrary}
          className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
        >
          <FolderOpen size={12} />
          Browse
        </button>
      </div>

      <div className={`
        border rounded-lg p-2 min-h-[80px] relative
        focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500
        ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}
      `}>
        {/* Capabilities display */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {capabilities.map((capability) => (
            <div key={capability} className="relative">
              <span
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full
                  ${hasConfig(capability)
                    ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                    : 'bg-indigo-100 text-indigo-700'
                  }
                `}
              >
                {capability}
                <button
                  type="button"
                  onClick={() => openConfigPopover(capability)}
                  className={`p-0.5 rounded-full transition-colors ${
                    hasConfig(capability)
                      ? 'hover:bg-green-200 text-green-600'
                      : 'hover:bg-indigo-200 text-indigo-500'
                  }`}
                  title="Configure when to use"
                >
                  <Settings size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => removeCapability(capability)}
                  className="hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </span>

              {/* Config Popover */}
              {configPopoverOpen === capability && (
                <div
                  ref={popoverRef}
                  className="absolute z-50 top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">{capability}</span>
                    <button
                      type="button"
                      onClick={() => setConfigPopoverOpen(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500">
                      When to use this {field.label.toLowerCase().replace(/s$/, '')}:
                    </label>
                    <textarea
                      value={tempWhenToUse}
                      onChange={(e) => setTempWhenToUse(e.target.value)}
                      placeholder="Describe when this capability should be used..."
                      className="w-full h-20 text-xs border border-gray-200 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-between mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        removeCapability(capability);
                      }}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={saveConfigPopover}
                      className="px-3 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Manual input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={field.placeholder || 'Type to add manually...'}
            className="flex-1 text-sm bg-transparent outline-none"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => addCapability(inputValue)}
              className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {field.description && !error && (
        <p className="text-xs text-gray-400">{field.description}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error.message as string}</p>
      )}

      {/* Hint about configuration */}
      {capabilities.length > 0 && (
        <p className="text-xs text-gray-400 italic">
          Click the gear icon to describe when to use each {field.label.toLowerCase().replace(/s$/, '')}
        </p>
      )}
    </div>
  );
};
