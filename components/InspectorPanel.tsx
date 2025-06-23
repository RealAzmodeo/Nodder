
import React, { useState, useEffect, useCallback } from 'react';
import { AnyNode, Connection, InputPort, OperationTypeEnum, NodeConfig, LogicalCategoryEnum, NodeId, Port, SwitchCaseConfig } from '../types';
import { PlusCircleIcon, MinusCircleIcon, XMarkIcon, EyeIcon, EyeSlashIcon, ChatBubbleBottomCenterTextIcon } from './Icons'; 

interface InspectorPanelProps {
  selectedNode: AnyNode;
  connections: Connection[];
  allNodes: AnyNode[]; 
  onConfigChange: (nodeId: NodeId, newConfig: Partial<NodeConfig>) => void;
  onNodeNameChange: (nodeId: NodeId, newName: string) => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedNode, connections, allNodes, onConfigChange, onNodeNameChange }) => {
  const [nodeName, setNodeName] = useState<string>(selectedNode.name);
  
  // Local state for various config fields to enable onBlur updates
  const [localConfig, setLocalConfig] = useState<Partial<NodeConfig>>(selectedNode.config || {});
  const [localValueProviderValue, setLocalValueProviderValue] = useState<any>(selectedNode.config?.value);
  const [localStateId, setLocalStateId] = useState<string>(selectedNode.config?.stateId || '');
  const [localInitialValue, setLocalInitialValue] = useState<any>(selectedNode.config?.initialValue);
  const [localEventName, setLocalEventName] = useState<string>(selectedNode.config?.eventName || '');
  const [localMin, setLocalMin] = useState<number>(selectedNode.config?.defaultMin ?? 0);
  const [localMax, setLocalMax] = useState<number>(selectedNode.config?.defaultMax ?? 1);
  const [localBarColor, setLocalBarColor] = useState<string>(selectedNode.config?.barColor || '#33C1FF');
  const [localDataTableColumns, setLocalDataTableColumns] = useState<string>((selectedNode.config?.dataTableColumns || []).join(', '));
  const [localFooterNoteText, setLocalFooterNoteText] = useState<string>(selectedNode.config?.footerNoteText || '');
  
  const [isFooterNoteSectionOpen, setIsFooterNoteSectionOpen] = useState(true);


  useEffect(() => {
    setNodeName(selectedNode.name);
    const config = selectedNode.config || {};
    setLocalConfig(config);
    setLocalValueProviderValue(config.value);
    setLocalStateId(config.stateId || '');
    setLocalInitialValue(config.initialValue);
    setLocalEventName(config.eventName || '');
    setLocalMin(config.defaultMin ?? 0);
    setLocalMax(config.defaultMax ?? 1);
    setLocalBarColor(config.barColor || '#33C1FF');
    setLocalDataTableColumns((config.dataTableColumns || []).join(', '));
    setLocalFooterNoteText(config.footerNoteText || '');

    if (config.showFooterNote || (config.footerNoteText && config.footerNoteText.trim() !== '')) {
        setIsFooterNoteSectionOpen(true);
    }
  }, [selectedNode]);

  const parseValueFromString = (rawValue: string, targetTypeHint?: 'number' | 'boolean' | 'string' | 'object' | 'array' ) => {
    const trimmed = rawValue.trim();
    if (trimmed === '') return undefined; // Treat empty string as undefined for non-string types potentially
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    if (targetTypeHint === 'number' || (!isNaN(parseFloat(trimmed)) && isFinite(Number(trimmed)) && String(parseFloat(trimmed)) === trimmed)) {
      return parseFloat(trimmed);
    }
    try {
        const parsed = JSON.parse(trimmed);
        // Check if it's an object or array, otherwise it might be a string that happens to be valid JSON (e.g. "\"test\"")
        if (typeof parsed === 'object' || Array.isArray(parsed)) return parsed;
    } catch (e) { /* Not JSON, keep as string */ }
    return rawValue; // Return original string if not parsed as other types
  };

  // Generic handler for local state text input changes
  const handleLocalTextChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
  };
  
  // Generic handler for local state value (any type) changes
  const handleLocalValueChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
  };

  // Debounced or onBlur config change commit
  const commitConfigChange = (fieldName: keyof NodeConfig, value: any) => {
    onConfigChange(selectedNode.id, { [fieldName]: value });
  };
  
  const commitInputPortOverrides = () => {
    onConfigChange(selectedNode.id, { inputPortOverrides: localConfig.inputPortOverrides });
  };

  const handleInputOverrideChange = (portId: string, rawValue: string) => {
    const processedValue = parseValueFromString(rawValue);
    setLocalConfig(prev => {
        const currentOverrides = prev.inputPortOverrides || {};
        let updatedOverrides = { ...currentOverrides };
        if (rawValue.trim() === '' && processedValue === undefined) { // Check processedValue too for empty strings
            delete updatedOverrides[portId];
        } else {
            updatedOverrides[portId] = processedValue;
        }
        return { ...prev, inputPortOverrides: updatedOverrides };
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNodeName(e.target.value);
  };

  const handleNameBlur = () => {
    if (nodeName.trim() !== '' && nodeName !== selectedNode.name) {
      onNodeNameChange(selectedNode.id, nodeName.trim());
    } else {
      setNodeName(selectedNode.name); 
    }
  };

  const inputFieldClass = "w-full p-1.5 text-xs border border-[rgba(255,255,255,0.15)] rounded-md bg-[rgba(30,33,40,0.5)] text-[rgba(255,255,255,0.85)] focus:ring-1 focus:ring-sky-400 focus:border-sky-400 placeholder-gray-400";
  const labelClass = "block text-xs font-medium text-sky-400 mb-1";
  const sectionClass = "mb-3 p-2.5 bg-[rgba(255,255,255,0.03)] rounded-md border border-[rgba(255,255,255,0.08)]";


  const renderInputPortInspector = (port: InputPort) => {
    const isConnected = connections.some(conn => conn.toNodeId === selectedNode.id && conn.toPortId === port.id);
    const overrideValue = localConfig.inputPortOverrides?.[port.id];
    let displayValue = '';
    if (overrideValue !== undefined) {
        if (typeof overrideValue === 'object') displayValue = JSON.stringify(overrideValue);
        else displayValue = String(overrideValue);
    }

    return (
      <div key={port.id} className={sectionClass}>
        <label className={labelClass}>{port.name} ({port.category})</label>
        {isConnected ? (
          <p className="text-xs text-green-400 italic">Connected. Value from link.</p>
        ) : (
          <input
            type="text" 
            placeholder={`Literal for ${port.name}`}
            value={displayValue}
            onChange={(e) => handleInputOverrideChange(port.id, e.target.value)}
            onBlur={commitInputPortOverrides}
            className={inputFieldClass}
          />
        )}
      </div>
    );
  };
  
  const getValueInputType = (currentValue: any) => {
    if (typeof currentValue === 'boolean') return 'select';
    if (typeof currentValue === 'number') return 'number';
    if (typeof currentValue === 'object' || Array.isArray(currentValue)) return 'textarea';
    return 'text';
  };
  
  // For VALUE_PROVIDER, STATE.initialValue
  const renderGeneralValueInput = (
      currentValue: any,
      setter: (value: any) => void,
      onCommit: (value: any) => void,
      placeholder?: string
    ) => {
    const inputType = getValueInputType(currentValue);
    const displayVal = currentValue === undefined ? '' : 
                       typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : 
                       String(currentValue);

    const commonInputClass = "w-full p-2 border border-[rgba(255,255,255,0.15)] rounded-md bg-[rgba(30,33,40,0.5)] text-[rgba(255,255,255,0.85)] focus:ring-1 focus:ring-sky-400 focus:border-sky-400 text-sm placeholder-gray-400";

    if (inputType === 'select') {
        return (
          <select value={String(currentValue ?? false)} 
            onChange={(e) => {
                const val = e.target.value === 'true';
                setter(val);
                onCommit(val);
            }}
            className={commonInputClass}>
            <option value="true">True</option><option value="false">False</option>
          </select>
        );
    }
    if (inputType === 'textarea') { 
        return (
          <textarea rows={3} value={displayVal}
            onChange={(e) => setter(e.target.value)} // Store as string during typing
            onBlur={() => {
                const parsed = parseValueFromString(String(currentValue), typeof currentValue as any);
                setter(parsed); // Update local state with parsed value
                onCommit(parsed); // Commit parsed value
            }}
            placeholder={placeholder || "Enter JSON value"}
            className={`${commonInputClass} font-mono`} />
        );
    }
    return (
       <input 
         type={inputType === 'number' ? 'number' : 'text'} 
         value={displayVal} 
         onChange={(e) => setter(e.target.value)} // Store as string during typing
         onBlur={() => {
            const parsed = parseValueFromString(String(currentValue), inputType as any);
            setter(parsed); // Update local state with parsed value
            onCommit(parsed); // Commit parsed value
         }}
         className={commonInputClass}
         step={inputType === 'number' ? 'any' : undefined} 
         placeholder={placeholder || "Enter value"}
        />
    );
  };

  const handleAddSwitchCase = () => {
    const newCase: SwitchCaseConfig = { id: `case_${Date.now()}_${Math.random().toString(36).substring(2,5)}`, caseValue: '', outputValue: '' };
    const updatedCases = [...(localConfig.switchCases || []), newCase];
    setLocalConfig(prev => ({ ...prev, switchCases: updatedCases }));
    onConfigChange(selectedNode.id, { switchCases: updatedCases });
  };

  const handleRemoveSwitchCase = (idToRemove: string) => {
    const updatedCases = (localConfig.switchCases || []).filter(c => c.id !== idToRemove);
    setLocalConfig(prev => ({ ...prev, switchCases: updatedCases }));
    onConfigChange(selectedNode.id, { switchCases: updatedCases });
  };
  
  const handleSwitchCaseValueChange = (index: number, field: 'caseValue' | 'outputValue', rawValue: string) => {
    const updatedCases = [...(localConfig.switchCases || [])];
    if (updatedCases[index]) {
        updatedCases[index] = { ...updatedCases[index], [field]: rawValue }; // Store as string during typing
        setLocalConfig(prev => ({ ...prev, switchCases: updatedCases }));
    }
  };

  const handleSwitchCaseValueBlur = (index: number, field: 'caseValue' | 'outputValue') => {
    const cases = localConfig.switchCases || [];
    if (cases[index]) {
        const rawValue = String(cases[index][field]);
        const parsedValue = parseValueFromString(rawValue);
        const updatedCases = [...cases];
        updatedCases[index] = { ...updatedCases[index], [field]: parsedValue };
        setLocalConfig(prev => ({ ...prev, switchCases: updatedCases }));
        onConfigChange(selectedNode.id, { switchCases: updatedCases });
    }
  };
  
  const handleSwitchDefaultValueChange = (rawValue: string) => {
      setLocalConfig(prev => ({...prev, switchDefaultValue: rawValue})); // store as string
  };

  const handleSwitchDefaultValueBlur = () => {
      const parsedValue = parseValueFromString(String(localConfig.switchDefaultValue || ''));
      setLocalConfig(prev => ({...prev, switchDefaultValue: parsedValue}));
      onConfigChange(selectedNode.id, { switchDefaultValue: parsedValue });
  };


  const description = selectedNode.description || "No description available for this node type.";

  const showInputOverrides = selectedNode.inputPorts.length > 0 && 
                             ![
                                OperationTypeEnum.VALUE_PROVIDER, OperationTypeEnum.OUTPUT_GRAPH, OperationTypeEnum.INPUT_GRAPH,
                                OperationTypeEnum.LOOP_ITEM, OperationTypeEnum.ITERATION_RESULT, OperationTypeEnum.ON_EVENT, 
                                OperationTypeEnum.STATE, OperationTypeEnum.SWITCH, OperationTypeEnum.LOG_VALUE, 
                                OperationTypeEnum.CONSTRUCT_OBJECT, OperationTypeEnum.DISPLAY_VALUE,
                                OperationTypeEnum.DISPLAY_MARKDOWN_TEXT, OperationTypeEnum.PROGRESS_BAR, 
                                OperationTypeEnum.DATA_TABLE, OperationTypeEnum.VISUAL_DICE_ROLLER
                             ].includes(selectedNode.operationType);

  return (
    <div className="p-4 bg-transparent h-full flex flex-col space-y-3 overflow-y-auto"> 
      <div>
        <h2 className="text-lg font-semibold text-sky-300 border-b border-[rgba(255,255,255,0.1)] pb-2 mb-3">
          Inspector: <span className="text-teal-300">{selectedNode.name}</span>
        </h2>
        
        <div className={sectionClass}>
          <label htmlFor="nodeName" className="block text-sm font-medium text-on-glass-dim mb-1">Node Name</label>
          <input type="text" id="nodeName" name="nodeName" value={nodeName} onChange={handleNameChange} onBlur={handleNameBlur}
            className={inputFieldClass} />
        </div>

        {selectedNode.operationType === OperationTypeEnum.VALUE_PROVIDER && (
          <div className={`mt-3 ${sectionClass}`}>
            <label className="block text-sm font-medium text-on-glass-dim mb-1">Provided Value</label>
            {renderGeneralValueInput(localValueProviderValue, setLocalValueProviderValue, (val) => commitConfigChange('value', val), "Enter value (string, number, boolean, or JSON)")}
            {selectedNode.outputPorts[0] && <p className="text-xs text-gray-400 mt-1">Output Type: {selectedNode.outputPorts[0].category}</p>}
          </div>
        )}
        
        {selectedNode.operationType === OperationTypeEnum.STATE && (
            <div className={`mt-3 ${sectionClass} space-y-2`}>
                <div>
                    <label className="block text-sm font-medium text-on-glass-dim mb-1">State ID (Unique Identifier)</label>
                    <input type="text" value={localStateId}
                        onChange={(e) => handleLocalTextChange(setLocalStateId, e.target.value)}
                        onBlur={() => commitConfigChange('stateId', localStateId.trim())} 
                        placeholder="e.g., userScore, currentLoopIndex"
                        className={inputFieldClass} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-on-glass-dim mb-1">Initial Value</label>
                    {renderGeneralValueInput(localInitialValue, setLocalInitialValue, (val) => commitConfigChange('initialValue', val), "Enter initial value (string, number, boolean, or JSON)")}
                 </div>
            </div>
        )}
         {selectedNode.operationType === OperationTypeEnum.ON_EVENT && (
             <div className={`mt-3 ${sectionClass} space-y-2`}>
                <div>
                    <label className="block text-sm font-medium text-on-glass-dim mb-1">Event Name</label>
                    <input type="text" value={localEventName}
                        onChange={(e) => handleLocalTextChange(setLocalEventName, e.target.value)}
                        onBlur={() => commitConfigChange('eventName', localEventName.trim())}
                        placeholder="e.g., buttonClicked, dataReceived"
                        className={inputFieldClass} />
                </div>
             </div>
        )}

        {selectedNode.operationType === OperationTypeEnum.RANDOM_NUMBER && (
            <div className={`mt-3 ${sectionClass} space-y-2`}>
                 <div>
                    <label className="block text-sm font-medium text-on-glass-dim mb-1">Default Min (if Min port unconnected)</label>
                    <input type="number" step="any" value={localMin}
                        onChange={(e) => handleLocalValueChange(setLocalMin, parseFloat(e.target.value))}
                        onBlur={() => commitConfigChange('defaultMin', localMin)}
                        className={inputFieldClass} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-on-glass-dim mb-1">Default Max (if Max port unconnected)</label>
                    <input type="number" step="any" value={localMax}
                        onChange={(e) => handleLocalValueChange(setLocalMax, parseFloat(e.target.value))}
                        onBlur={() => commitConfigChange('defaultMax', localMax)}
                        className={inputFieldClass} />
                </div>
            </div>
        )}

        {selectedNode.operationType === OperationTypeEnum.SWITCH && (
            <div className={`mt-3 ${sectionClass} space-y-3`}>
                <h3 className="text-sm font-medium text-sky-400 mb-1.5">Switch Cases</h3>
                {(localConfig.switchCases || []).map((switchCase, index) => (
                    <div key={switchCase.id} className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md space-y-2 bg-[rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-between">
                             <span className="text-xs text-gray-300">Case {index + 1}</span>
                             <button onClick={() => handleRemoveSwitchCase(switchCase.id)} className="p-0.5 text-red-400 hover:text-red-300">
                                <MinusCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-0.5">If Input Value Is:</label>
                            <input type="text" 
                                   value={String(switchCase.caseValue ?? '')} 
                                   onChange={(e) => handleSwitchCaseValueChange(index, 'caseValue', e.target.value)}
                                   onBlur={() => handleSwitchCaseValueBlur(index, 'caseValue')}
                                   className={inputFieldClass} placeholder="Case value" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-0.5">Then Output Value Is:</label>
                             <input type="text" 
                                   value={String(switchCase.outputValue ?? '')} 
                                   onChange={(e) => handleSwitchCaseValueChange(index, 'outputValue', e.target.value)}
                                   onBlur={() => handleSwitchCaseValueBlur(index, 'outputValue')}
                                   className={inputFieldClass} placeholder="Output for this case" />
                        </div>
                    </div>
                ))}
                <button onClick={handleAddSwitchCase}
                    className="crystal-button flex items-center text-sm px-3 py-1.5">
                    <PlusCircleIcon className="w-4 h-4 mr-1.5"/> Add Case
                </button>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Default Output Value (if no case matches)</label>
                    <input type="text"
                           value={String(localConfig.switchDefaultValue ?? '')}
                           onChange={(e) => handleSwitchDefaultValueChange(e.target.value)}
                           onBlur={handleSwitchDefaultValueBlur}
                           className={inputFieldClass} placeholder="Default output value" />
                 </div>
            </div>
        )}

        {selectedNode.operationType === OperationTypeEnum.PROGRESS_BAR && (
            <div className={`mt-3 ${sectionClass} space-y-2`}>
                <div>
                    <label className="block text-sm font-medium text-on-glass-dim mb-1">Bar Color (Hex)</label>
                    <input type="text" value={localBarColor}
                        onChange={(e) => handleLocalTextChange(setLocalBarColor, e.target.value)}
                        onBlur={() => commitConfigChange('barColor', localBarColor.trim())}
                        placeholder="#33C1FF"
                        className={inputFieldClass} />
                </div>
                 <div className="flex items-center">
                    <input type="checkbox" id="showPercentage" name="showPercentage"
                           checked={localConfig.showPercentage !== undefined ? localConfig.showPercentage : true}
                           onChange={(e) => {
                                const checked = e.target.checked;
                                setLocalConfig(prev => ({...prev, showPercentage: checked}));
                                onConfigChange(selectedNode.id, { showPercentage: checked });
                           }}
                           className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-sky-500 focus:ring-sky-400 focus:ring-offset-gray-800" />
                    <label htmlFor="showPercentage" className="ml-2 block text-sm text-on-glass-dim">Show Percentage</label>
                </div>
            </div>
        )}
        {selectedNode.operationType === OperationTypeEnum.DATA_TABLE && (
            <div className={`mt-3 ${sectionClass} space-y-2`}>
                <div>
                    <label className="block text-sm font-medium text-on-glass-dim mb-1">Columns (comma-separated, optional)</label>
                    <input type="text" value={localDataTableColumns}
                        onChange={(e) => handleLocalTextChange(setLocalDataTableColumns, e.target.value)}
                        onBlur={() => {
                            const colsArray = localDataTableColumns.split(',').map(s => s.trim()).filter(s => s);
                            commitConfigChange('dataTableColumns', colsArray);
                        }}
                        placeholder="e.g., id, name, value (or leave blank)"
                        className={inputFieldClass} />
                     <p className="text-xs text-gray-400 mt-1">If blank, columns are inferred from the first data object.</p>
                </div>
            </div>
        )}
        
        {selectedNode.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER && (
            <div className={`mt-3 ${sectionClass}`}>
                <label className="block text-sm font-medium text-on-glass-dim mb-1">Dice Faces</label>
                 <select name="diceFaces" value={localConfig.diceFaces || 20} 
                    onChange={(e) => {
                        const faces = parseInt(e.target.value, 10);
                        setLocalConfig(prev => ({...prev, diceFaces: faces}));
                        onConfigChange(selectedNode.id, { diceFaces: faces });
                    }} 
                    className={inputFieldClass}
                 >
                    {[4, 6, 8, 10, 12, 20, 100].map(faces => (
                        <option key={faces} value={faces}>d{faces}</option>
                    ))}
                </select>
                {localConfig.lastRoll !== undefined && <p className="text-xs text-gray-400 mt-1">Last Roll: {localConfig.lastRoll}</p>}
            </div>
        )}


        {showInputOverrides && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-on-glass-dim mb-1.5">Input Port Overrides (Literals)</h3>
            {selectedNode.inputPorts.map(renderInputPortInspector)}
          </div>
        )}
        
        {selectedNode.type === 'Molecular' && (selectedNode.operationType === OperationTypeEnum.MOLECULAR || selectedNode.operationType === OperationTypeEnum.ITERATE) && (
          <div className={`mt-3 ${sectionClass} p-3 text-sm text-gray-300`}>
              <p className="text-teal-400">
                {selectedNode.operationType === OperationTypeEnum.ITERATE ? "Iterate Node Sub-Graph Interface:" : "Molecular Node Interface:"}
              </p>
              <p className="text-xs mt-1">Inputs: {selectedNode.inputPorts.map(p => `${p.name} (${p.category}, ${p.portType})`).join(', ') || 'None'}</p>
              <p className="text-xs mt-1">Outputs: {selectedNode.outputPorts.map(p => `${p.name} (${p.category}, ${p.portType})`).join(', ') || 'None'}</p>
              {selectedNode.operationType === OperationTypeEnum.ITERATE && (
                  <p className="text-xs mt-1 text-yellow-400">Inside sub-graph, use LOOP_ITEM for item/index and ITERATION_RESULT for output per item.</p>
              )}
          </div>
        )}
      </div>
      
      <div className="mt-3">
        <button 
          onClick={() => setIsFooterNoteSectionOpen(prev => !prev)}
          className="crystal-button flex items-center justify-between w-full p-2 text-sm text-left"
        >
          <div className="flex items-center">
            <ChatBubbleBottomCenterTextIcon className="w-4 h-4 mr-2"/>
            Footer Note
          </div>
          {isFooterNoteSectionOpen ? <MinusCircleIcon className="w-4 h-4" /> : <PlusCircleIcon className="w-4 h-4" />}
        </button>
        {isFooterNoteSectionOpen && (
          <div className={`mt-0 ${sectionClass} rounded-t-none space-y-2`}>
            <div>
              <label htmlFor="footerNoteText" className="block text-xs font-medium text-on-glass-dim mb-1">Note Text</label>
              <textarea
                id="footerNoteText"
                name="footerNoteText"
                rows={3}
                value={localFooterNoteText}
                onChange={(e) => handleLocalTextChange(setLocalFooterNoteText, e.target.value)}
                onBlur={() => commitConfigChange('footerNoteText', localFooterNoteText)}
                placeholder="Enter annotations or comments for this node..."
                className={`${inputFieldClass} font-mono`}
              />
            </div>
            <div className="flex items-center">
              <input
                id="showFooterNote"
                name="showFooterNote"
                type="checkbox"
                checked={localConfig.showFooterNote || false}
                onChange={(e) => {
                    const checked = e.target.checked;
                    setLocalConfig(prev => ({...prev, showFooterNote: checked }));
                    onConfigChange(selectedNode.id, { showFooterNote: checked });
                }}
                className="h-3.5 w-3.5 rounded border-gray-500 bg-gray-700 text-sky-500 focus:ring-sky-400 focus:ring-offset-gray-800"
              />
              <label htmlFor="showFooterNote" className="ml-2 block text-sm text-on-glass-dim">
                Show note on node
              </label>
            </div>
          </div>
        )}
      </div>


      <div className="mt-auto pt-3 border-t border-[rgba(255,255,255,0.1)]">
        <h3 className="text-sm font-semibold text-sky-300 mb-1.5">Node Description</h3>
        <p className={`text-xs text-on-glass-dim leading-relaxed ${sectionClass} p-2.5`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default InspectorPanel;
