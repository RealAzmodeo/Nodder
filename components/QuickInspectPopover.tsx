
import React, { useState, useEffect, useCallback } from 'react';
import { AnyNode, NodeConfig, QuickInspectData, QuickInspectField } from '../types'; // Added QuickInspectField
import { XMarkIcon } from './Icons';

interface QuickInspectPopoverProps {
  data: QuickInspectData | null;
  onClose: () => void;
  onConfigUpdate: (nodeId: string, newConfig: Partial<NodeConfig>) => void;
}

const QuickInspectPopover: React.FC<QuickInspectPopoverProps> = ({ data, onClose, onConfigUpdate }) => {
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const popoverRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data?.node.config) {
      const initialValues: Record<string, any> = {};
      data.fields.forEach(field => {
        initialValues[field.key as string] = data.node.config![field.key as keyof NodeConfig];
      });
      setLocalValues(initialValues);
    }
  }, [data]);

  const handleValueChange = (key: string, value: any, type: QuickInspectData['fields'][0]['type']) => {
    let processedValue = value;
    if (type === 'number') {
      processedValue = parseFloat(value);
      if (isNaN(processedValue)) processedValue = localValues[key]; 
    } else if (type === 'boolean') {
      processedValue = value === 'true';
    }
    setLocalValues(prev => ({ ...prev, [key]: processedValue }));
  };

  const handleBlur = (key: string) => {
    if (data?.node) {
      const newConfigPart = { [key]: localValues[key] };
      onConfigUpdate(data.node.id, newConfigPart);
    }
  };
  
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (data) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [data, handleClickOutside]);


  if (!data) return null;

  const { node, position, fields } = data;

  return (
    <div
      ref={popoverRef}
      className="quick-inspect-popover crystal-layer crystal-layer-4 fixed shadow-xl"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-sky-300 truncate" title={node.name}>
          Quick Edit: {node.name}
        </h3>
        <button
          onClick={onClose}
          className="popover-close-button text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
          aria-label="Close quick inspect"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {fields.map(currentField => ( // Changed 'field' to 'currentField' to avoid conflict if any
          <div key={currentField.key as string}>
            <label htmlFor={`qinspect-${node.id}-${currentField.key}`} className="block text-xs font-medium text-gray-300 mb-0.5">
              {currentField.label}
            </label>
            {currentField.type === 'textarea' ? (
              <textarea
                id={`qinspect-${node.id}-${currentField.key}`}
                rows={2}
                value={localValues[currentField.key as string] !== undefined ? String(localValues[currentField.key as string]) : ''}
                onChange={(e) => handleValueChange(currentField.key as string, e.target.value, currentField.type)}
                onBlur={() => handleBlur(currentField.key as string)}
                className="w-full text-xs" 
              />
            ) : currentField.type === 'select' && currentField.options ? (
                 <select
                    id={`qinspect-${node.id}-${currentField.key}`}
                    value={String(localValues[currentField.key as string] ?? (currentField.options[0]?.value ?? ''))}
                    onChange={(e) => {
                         handleValueChange(currentField.key as string, e.target.value, currentField.type);
                         const processedValue = e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value;
                         onConfigUpdate(node.id, { [currentField.key as string]: processedValue });
                    }}
                    className="w-full text-xs"
                 >
                    {currentField.options.map(opt => (
                        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                    ))}
                 </select>
            ) : (
              <input
                id={`qinspect-${node.id}-${currentField.key}`}
                type={currentField.type === 'boolean' ? 'checkbox' : currentField.type}
                checked={currentField.type === 'boolean' ? Boolean(localValues[currentField.key as string]) : undefined}
                value={currentField.type !== 'boolean' && localValues[currentField.key as string] !== undefined ? String(localValues[currentField.key as string]) : ''}
                onChange={(e) =>
                  handleValueChange(currentField.key as string, currentField.type === 'boolean' ? e.target.checked : e.target.value, currentField.type)
                }
                onBlur={() => handleBlur(currentField.key as string)}
                className="w-full text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickInspectPopover;
