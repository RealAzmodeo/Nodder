
import React, { useState, useEffect, useRef } from 'react';
import { InputPort, OutputPort, LogicalCategoryEnum, NodeId, PortTypeEnum, NodeConfig, Connection } from '../types';
import { 
    NODE_PORT_HEIGHT, 
    NODE_PORT_MARKER_SIZE, 
    PORT_CATEGORY_COLORS, 
    PORT_CATEGORY_HEX_COLORS, 
    EXECUTION_PORT_MARKER_SIZE,
    EXECUTION_PORT_COLOR_BG
} from '../constants';
import { XMarkIcon } from './Icons'; 

interface PortComponentProps {
  nodeId: NodeId;
  port: InputPort | OutputPort;
  type: 'input' | 'output';
  onMouseDown?: (event: React.MouseEvent, portId: string, portType: 'input' | 'output') => void;
  isHoveredForConnection?: boolean;
  resolvedValue?: any;
  isConnected: boolean; 
  literalOverrideValue?: any; 
  onLiteralOverrideChange?: (portId: string, value: any) => void;
  onRemoveConnectionToPort?: (portId: string) => void; 
  connectionId?: string | null; 
  connectedOutputPortCategory?: LogicalCategoryEnum;
}

const parseValueFromString = (rawValue: string, targetTypeHint?: 'number' | 'boolean' | 'string' | 'object' | 'array' ) => {
  const trimmedValue = rawValue.trim();
  if (trimmedValue === '') return undefined; 

  let processedValue: any = trimmedValue;
  if (trimmedValue.toLowerCase() === 'true') processedValue = true;
  else if (trimmedValue.toLowerCase() === 'false') processedValue = false;
  else if (targetTypeHint === 'number' || (!isNaN(parseFloat(trimmedValue)) && isFinite(Number(trimmedValue)) && String(parseFloat(trimmedValue)) === trimmedValue ) ) {
    processedValue = parseFloat(trimmedValue);
  } else {
      try {
          const parsed = JSON.parse(trimmedValue);
          if (typeof parsed === 'object' || Array.isArray(parsed)) {
              processedValue = parsed;
          }
      } catch (e) { /* Not JSON, keep as string */ }
  }
  return processedValue;
};


const PortComponent: React.FC<PortComponentProps> = ({ 
    nodeId, 
    port, 
    type, 
    onMouseDown, 
    isHoveredForConnection,
    resolvedValue,
    isConnected,
    literalOverrideValue,
    onLiteralOverrideChange,
    onRemoveConnectionToPort,
    connectedOutputPortCategory,
}) => {
  const isExecutionPort = port.portType === PortTypeEnum.EXECUTION;
  const isDataPort = port.portType === PortTypeEnum.DATA;
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [editText, setEditText] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [showRemoveIcon, setShowRemoveIcon] = useState(false);

  useEffect(() => {
    if (literalOverrideValue !== undefined) {
      if (typeof literalOverrideValue === 'object') {
        setEditText(JSON.stringify(literalOverrideValue));
      } else {
        setEditText(String(literalOverrideValue));
      }
    } else {
      setEditText('');
    }
  }, [literalOverrideValue]);

  useEffect(() => {
    if (isEditingOverride && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingOverride]);

  const handleLabelOrChipClick = () => {
    if (type === 'input' && isDataPort && !isConnected && onLiteralOverrideChange) {
      // Prepare editText for editing, regardless of current override state
      const currentOverride = literalOverrideValue;
      if (typeof currentOverride === 'object' && currentOverride !== null) {
        setEditText(JSON.stringify(currentOverride, null, 2));
      } else if (currentOverride !== undefined) {
        setEditText(String(currentOverride));
      } else {
        setEditText(''); // For new literal input
      }
      setIsEditingOverride(true);
    }
  };

  const handleEditConfirm = () => {
    if (onLiteralOverrideChange) {
      const parsedValue = parseValueFromString(editText, port.category as any); 
      onLiteralOverrideChange(port.id, parsedValue);
    }
    setIsEditingOverride(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditConfirm();
    } else if (e.key === 'Escape') {
      setIsEditingOverride(false);
      // Revert editText to reflect the last saved literalOverrideValue
      if (literalOverrideValue !== undefined) {
        setEditText(typeof literalOverrideValue === 'object' ? JSON.stringify(literalOverrideValue) : String(literalOverrideValue));
      } else {
        setEditText('');
      }
    }
  };
  
  let effectiveCategory = port.category;
  if (type === 'input' && isConnected && isDataPort && connectedOutputPortCategory) {
    effectiveCategory = connectedOutputPortCategory;
  }
  
  const portColorClass = isExecutionPort 
    ? EXECUTION_PORT_COLOR_BG
    : (PORT_CATEGORY_COLORS[effectiveCategory] || 'bg-gray-400');
  
  const markerSize = isExecutionPort ? EXECUTION_PORT_MARKER_SIZE : NODE_PORT_MARKER_SIZE;
  const markerBaseOffset = markerSize / 2 + 1;
  const markerOffsetClass = type === 'input' 
    ? `left-[-${markerBaseOffset}px]` 
    : `right-[-${markerBaseOffset}px]`;

  const portIdForDom = `${nodeId}-${type}-${port.id}`;

  const handleMouseDownInternal = (e: React.MouseEvent) => {
    if (type === 'output' && onMouseDown) {
      onMouseDown(e, port.id, type);
    }
  };

  const getSummaryForTooltip = (val: any): string => {
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return `[Array(${val.length})]`;
    if (typeof val === 'object' && val !== null) return JSON.stringify(val, null, 2);
    return String(val);
  };
  
  let tooltipTitle = `Name: ${port.name}\nType: ${port.portType} (${isDataPort ? port.category : 'Trigger'})\n${port.description ? `Description: ${port.description}\n` : ''}`;
  if (isDataPort) {
    if (isConnected) {
        if (resolvedValue !== undefined) {
             tooltipTitle += `Resolved Value: ${getSummaryForTooltip(resolvedValue)}\n`;
        }
        if (type === 'input' && connectedOutputPortCategory) {
            tooltipTitle += `Receiving Type: ${connectedOutputPortCategory}\n`;
        }
    }
    if (literalOverrideValue !== undefined) {
      tooltipTitle += `Literal Override: ${getSummaryForTooltip(literalOverrideValue)} ${isConnected ? '(Suppressed by connection)' : '(Active)'}`;
    }
  }
  
  const canSetLiteral = type === 'input' && isDataPort && !isConnected && !!onLiteralOverrideChange;
  
  const handleRemoveClick = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (type === 'input' && isConnected && onRemoveConnectionToPort && port.id) {
          onRemoveConnectionToPort(port.id);
      }
  };

  const finalXButtonTopClass = `top-[${(NODE_PORT_HEIGHT - markerSize) / 2 - 14 - 2}px]`;
  const xButtonLeftOffset = -8; 

  const portMarkerContainerClasses = `absolute top-1/2 -translate-y-1/2 ${markerOffsetClass} w-[${markerSize}px] h-[${markerSize}px] flex items-center justify-center border-2 border-gray-900/70 cursor-pointer port-hoverable ${isExecutionPort ? `bg-transparent rounded-sm` : `${portColorClass} rounded-full`} ${isHoveredForConnection ? 'ring-2 ring-offset-1 ring-offset-gray-800/50 ring-sky-400 scale-110' : ''} transition-all duration-100 z-10`;

  const showLightBeam = isConnected && isDataPort;
  const lightBeamWrapperStyle: React.CSSProperties = showLightBeam 
    ? { '--port-light-beam-color': PORT_CATEGORY_HEX_COLORS[effectiveCategory] || '#9E9E9E' } as React.CSSProperties
    : {};

  const renderInputPortContent = () => {
    if (type !== 'input' || !isDataPort) { // For non-data-input ports, or output ports
      return <span className={`truncate relative z-[5] ${type === 'output' ? 'mr-1' : 'ml-1'}`}>{port.name}{isExecutionPort && <span className="ml-1 text-red-400 text-[9px]">(EXEC)</span>}</span>;
    }

    // Data Input Port Logic
    if (isConnected) { // Connected: show port name only
      return <span className="truncate relative z-[5] ml-1">{port.name}</span>;
    }

    // Not connected: handle literal display/editing
    if (isEditingOverride) { // Actively editing literal
      return (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleEditConfirm}
          onKeyDown={handleEditKeyDown}
          className="w-full text-xs bg-gray-700 text-gray-100 border border-sky-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-400 z-10 relative"
          onClick={(e) => e.stopPropagation()}
          placeholder="Enter literal value"
        />
      );
    }
    
    // Not connected, not editing: Show chip or invitation
    if (literalOverrideValue !== undefined) { // Literal exists, show chip
      let displayLiteral = String(literalOverrideValue);
      if (typeof literalOverrideValue === 'object') displayLiteral = JSON.stringify(literalOverrideValue);
      else if (typeof literalOverrideValue === 'boolean') displayLiteral = literalOverrideValue ? 'true' : 'false';
      else if (typeof literalOverrideValue === 'string' && literalOverrideValue === '') displayLiteral = '""'; // Explicitly show empty string

      return (
        <span 
          onClick={handleLabelOrChipClick}
          className="truncate relative z-[5] ml-1 cursor-pointer hover:underline decoration-dotted decoration-sky-400/70 text-xs px-1 py-0.5 bg-gray-600/70 rounded-sm border border-gray-500/50"
          title={`Edit literal for ${port.name}: ${displayLiteral}`}
        >
          <span className="text-sky-300 mr-0.5">[L]</span> {port.name}: {displayLiteral.length > 15 ? displayLiteral.substring(0,12) + '...' : displayLiteral}
        </span>
      );
    }
    
    // Not connected, no literal: Show port name as invitation to add literal
    return (
      <span 
        onClick={handleLabelOrChipClick}
        className={`truncate relative z-[5] ml-1 ${canSetLiteral ? 'cursor-pointer hover:underline decoration-dotted decoration-sky-400/70 text-gray-400 italic' : ''}`}
        title={canSetLiteral ? `Set literal for ${port.name}` : port.name}
      >
        {port.name}
      </span>
    );
  };


  return (
    <div
      id={portIdForDom}
      className={`relative flex items-center justify-between px-3 h-[${NODE_PORT_HEIGHT}px] text-xs border-t border-white/5 group`}
      title={tooltipTitle.trim()}
      onMouseEnter={() => type === 'input' && isConnected && setShowRemoveIcon(true)}
      onMouseLeave={() => type === 'input' && isConnected && setShowRemoveIcon(false)}
    >
      {type === 'input' && (
        <div className={portMarkerContainerClasses}>
          {isExecutionPort ? (
            <svg width={markerSize} height={markerSize} viewBox="0 0 10 10" className="fill-current text-white">
              <polygon points="2,5 8,2 8,8" />
            </svg>
          ) : (
            <div className={`w-full h-full rounded-full ${portColorClass}`}></div>
          )}
        </div>
      )}
      
       {type === 'input' && isConnected && showRemoveIcon && onRemoveConnectionToPort && (
         <button
            onClick={handleRemoveClick}
            className={`absolute ${finalXButtonTopClass} left-[${xButtonLeftOffset}px] p-0.5 bg-red-600 hover:bg-red-500 rounded-full z-20 transition-opacity duration-150`}
            title="Remove connection"
            aria-label="Remove connection"
          >
            <XMarkIcon className="w-2.5 h-2.5 text-white" />
          </button>
        )}
        
      <div 
        className={`port-content-wrapper ${showLightBeam ? `port-light-beam ${type === 'input' ? 'input-beam' : 'output-beam'}` : ''}`}
        style={lightBeamWrapperStyle}
      >
        <div className={`flex-1 text-on-glass truncate ${type === 'input' ? 'text-left pl-1' : 'text-right pr-1'}`}>
          {renderInputPortContent()}
          {type === 'output' && (
            <span className="truncate relative z-[5]"> 
              {port.name}
              {isExecutionPort && <span className="mr-1 text-red-400 text-[9px]">(EXEC)</span>}
            </span>
          )}
        </div>
      </div>
      
      {isDataPort && type === 'output' && !showLightBeam && <div className={`w-2 h-2 rounded-full ${portColorClass} mx-1 flex-shrink-0`}></div>}
      
      {type === 'output' && (
        <div 
          className={portMarkerContainerClasses}
          onMouseDown={handleMouseDownInternal}
        >
           {isExecutionPort ? (
            <svg width={markerSize} height={markerSize} viewBox="0 0 10 10" className="fill-current text-white">
              <polygon points="8,5 2,2 2,8" />
            </svg>
          ) : (
            <div className={`w-full h-full rounded-full ${portColorClass}`}></div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortComponent;

