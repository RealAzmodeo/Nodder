
import React, { useState, useEffect } from 'react';
import { AnyNode, OperationTypeEnum, LogicalCategoryEnum, NodeConfig } from '../types';
import { XMarkIcon, CheckCircleIcon } from './Icons';
import { DEFAULT_COMMENT_WIDTH, DEFAULT_COMMENT_HEIGHT, DEFAULT_FRAME_WIDTH, DEFAULT_FRAME_HEIGHT } from '../constants';


interface NodeConfigModalProps {
  node: AnyNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newConfig: Partial<NodeConfig>) => void;
}

const NodeConfigModal: React.FC<NodeConfigModalProps> = ({ node, isOpen, onClose, onSave }) => {
  const [currentConfig, setCurrentConfig] = useState<Partial<NodeConfig>>({});

  useEffect(() => {
    if (node) {
      const initialConf: Partial<NodeConfig> = { ...node.config };
      if (node.operationType === OperationTypeEnum.VALUE_PROVIDER && !initialConf.hasOwnProperty('value')) {
        initialConf.value = '';
      }
      if ((node.operationType === OperationTypeEnum.INPUT_GRAPH || node.operationType === OperationTypeEnum.OUTPUT_GRAPH)) {
        if (!initialConf.hasOwnProperty('externalPortName')) initialConf.externalPortName = 'PortName';
        if (!initialConf.hasOwnProperty('externalPortCategory')) initialConf.externalPortCategory = LogicalCategoryEnum.ANY;
      }
      if (node.operationType === OperationTypeEnum.STATE) {
        if (!initialConf.hasOwnProperty('stateId')) initialConf.stateId = `state_\${node.id.substring(0,5)}`;
        else initialConf.stateId = String(initialConf.stateId).trim(); 
        if (!initialConf.hasOwnProperty('initialValue')) initialConf.initialValue = null;
      }
      if (node.operationType === OperationTypeEnum.ON_EVENT && !initialConf.hasOwnProperty('eventName')) {
        initialConf.eventName = 'myEvent';
      }
      if (node.operationType === OperationTypeEnum.RANDOM_NUMBER) {
        if (!initialConf.hasOwnProperty('defaultMin')) initialConf.defaultMin = 0;
        if (!initialConf.hasOwnProperty('defaultMax')) initialConf.defaultMax = 1;
      }
      if (node.operationType === OperationTypeEnum.COMMENT && !initialConf.hasOwnProperty('commentText')) {
        initialConf.commentText = 'My Comment';
      }
      if (node.operationType === OperationTypeEnum.FRAME) {
        if (!initialConf.hasOwnProperty('frameTitle')) initialConf.frameTitle = 'Group';
        if (!initialConf.hasOwnProperty('frameWidth')) initialConf.frameWidth = DEFAULT_FRAME_WIDTH;
        if (!initialConf.hasOwnProperty('frameHeight')) initialConf.frameHeight = DEFAULT_FRAME_HEIGHT;
      }
      if ((node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA) && !initialConf.hasOwnProperty('channelName')) {
        initialConf.channelName = 'defaultChannel';
      }
      if (node.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER) {
        if (!initialConf.hasOwnProperty('diceFaces')) initialConf.diceFaces = 20;
        if (!initialConf.hasOwnProperty('lastRoll')) initialConf.lastRoll = 1; // Or some default indication
      }
      setCurrentConfig(initialConf);
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const elementType = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).type; 
    let processedValue: any = value;

    if (name === "value" && node.operationType === OperationTypeEnum.VALUE_PROVIDER) {
        if (value === "true") processedValue = true;
        else if (value === "false") processedValue = false;
        else if (elementType === 'number' && !isNaN(parseFloat(value))) processedValue = parseFloat(value);
        else if (elementType === 'textarea') { 
             try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' || Array.isArray(parsed)) processedValue = parsed;
             } catch (error) { /* Not JSON, keep as string */ }
        }
    } else if (name === "initialValue" && node.operationType === OperationTypeEnum.STATE) {
        if (value === "true") processedValue = true;
        else if (value === "false") processedValue = false;
        else if (elementType === 'number' && !isNaN(parseFloat(value))) processedValue = parseFloat(value);
        else if (elementType === 'textarea') { 
            try {
                const parsed = JSON.parse(value);
                if (typeof parsed === 'object' || Array.isArray(parsed)) processedValue = parsed;
             } catch (error) { /* Not JSON, keep as string */ }
        }
    } else if (name === 'externalPortCategory') {
        processedValue = value as LogicalCategoryEnum;
    } else if ((name === 'stateId' && node.operationType === OperationTypeEnum.STATE) ||
               (name === 'eventName' && node.operationType === OperationTypeEnum.ON_EVENT) ||
               (name === 'channelName' && (node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA))
              ) {
        processedValue = value.trim();
    } else if (name === 'maxIterations' && node.operationType === OperationTypeEnum.ITERATE) {
        processedValue = parseInt(value, 10);
        if (isNaN(processedValue) || processedValue < 0) processedValue = 0;
    } else if ((name === 'defaultMin' || name === 'defaultMax') && node.operationType === OperationTypeEnum.RANDOM_NUMBER) {
        processedValue = parseFloat(value);
        if (isNaN(processedValue)) processedValue = (name === 'defaultMin' ? 0 : 1);
    } else if (name === 'frameWidth' || name === 'frameHeight') {
        processedValue = parseInt(value, 10);
        if (isNaN(processedValue) || processedValue < 50) processedValue = 50; 
    } else if (name === 'commentText' && node.operationType === OperationTypeEnum.COMMENT) {
        processedValue = value; 
    } else if (name === 'frameTitle' && node.operationType === OperationTypeEnum.FRAME) {
        processedValue = value; 
    } else if (name === 'diceFaces' && node.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER) {
        processedValue = parseInt(value, 10);
    }


    setCurrentConfig(prev => ({ ...prev, [name]: processedValue }));
  };
  
  const inputBaseClass = "w-full p-2 border border-[rgba(255,255,255,0.15)] rounded-md bg-[rgba(30,33,40,0.5)] text-[rgba(255,255,255,0.85)] focus:ring-1 focus:ring-sky-400 focus:border-sky-400 placeholder-gray-400";

  const renderValueProviderField = (fieldName: 'value' | 'initialValue' = 'value') => {
    const currentValue = currentConfig[fieldName];
    let fieldType: 'select' | 'number' | 'textarea' | 'text' = 'text';

    if (typeof currentValue === 'boolean') fieldType = 'select';
    else if (typeof currentValue === 'number') fieldType = 'number';
    else if (typeof currentValue === 'object' || Array.isArray(currentValue)) fieldType = 'textarea';

    if (fieldType === 'select') {
        return (
             <select name={fieldName} value={String(currentValue ?? false)} onChange={handleInputChange}
                className={inputBaseClass}>
                <option value="true">True</option><option value="false">False</option>
            </select>
        );
    }
    if (fieldType === 'number') {
         return (
            <input type="number" name={fieldName} value={currentValue ?? ''} onChange={handleInputChange}
                step="any" className={inputBaseClass} />
        );
    }
     return (
         <textarea name={fieldName} rows={3}
            value={typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue ?? '')}
            onChange={handleInputChange} placeholder="Enter value (string, number, boolean, or JSON for object/array)"
            className={`\${inputBaseClass} font-mono text-sm`} />
     );
  };

  const renderGraphPortFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">External Port Name</label>
            <input type="text" name="externalPortName" value={currentConfig.externalPortName || ''}
                onChange={handleInputChange} className={inputBaseClass} />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">External Port Category</label>
            <select name="externalPortCategory" value={currentConfig.externalPortCategory || LogicalCategoryEnum.ANY}
                onChange={handleInputChange} className={inputBaseClass}>
                {Object.values(LogicalCategoryEnum).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
        </div>
    </>
  );

  const renderStateNodeFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">State ID (Unique Identifier)</label>
            <input type="text" name="stateId" value={currentConfig.stateId || ''} onChange={handleInputChange}
                placeholder="e.g., userScore, currentItemName" className={inputBaseClass} />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Initial Value</label>
            {renderValueProviderField('initialValue')}
        </div>
    </>
  );

  const renderOnEventNodeFields = () => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Event Name</label>
        <input type="text" name="eventName" value={currentConfig.eventName || ''} onChange={handleInputChange}
            placeholder="e.g., buttonClicked, dataReceived" className={inputBaseClass} />
    </div>
  );

  const renderRandomNumberNodeFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Default Min (if Min port unconnected)</label>
            <input type="number" name="defaultMin" step="any" value={currentConfig.defaultMin ?? 0}
                onChange={handleInputChange} className={inputBaseClass} />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Default Max (if Max port unconnected)</label>
            <input type="number" name="defaultMax" step="any" value={currentConfig.defaultMax ?? 1}
                onChange={handleInputChange} className={inputBaseClass} />
        </div>
    </>
  );

  const renderCommentNodeFields = () => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Comment Text</label>
        <textarea name="commentText" rows={5} value={currentConfig.commentText || ''} onChange={handleInputChange}
            placeholder="Enter your comment..." className={`\${inputBaseClass} font-mono text-sm`} />
    </div>
  );

  const renderFrameNodeFields = () => (
    <>
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Frame Title</label>
            <input type="text" name="frameTitle" value={currentConfig.frameTitle || ''}
                onChange={handleInputChange} className={inputBaseClass} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Width</label>
                <input type="number" name="frameWidth" value={currentConfig.frameWidth || DEFAULT_FRAME_WIDTH} onChange={handleInputChange}
                    className={inputBaseClass} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Height</label>
                <input type="number" name="frameHeight" value={currentConfig.frameHeight || DEFAULT_FRAME_HEIGHT} onChange={handleInputChange}
                    className={inputBaseClass} />
            </div>
        </div>
    </>
  );

  const renderChannelNodeFields = () => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Channel Name</label>
        <input type="text" name="channelName" value={currentConfig.channelName || ''} onChange={handleInputChange}
            placeholder="e.g., myDataChannel, userClicks" className={inputBaseClass} />
    </div>
  );
  
  const renderVisualDiceRollerFields = () => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Dice Faces (e.g., 6, 20, 100)</label>
        <select name="diceFaces" value={currentConfig.diceFaces || 20} onChange={handleInputChange} className={inputBaseClass}>
            {[4, 6, 8, 10, 12, 20, 100].map(faces => (
                <option key={faces} value={faces}>d{faces}</option>
            ))}
        </select>
    </div>
  );


  const handleSave = () => {
    if (node.operationType === OperationTypeEnum.STATE && (!currentConfig.stateId || currentConfig.stateId.trim() === '')) {
        alert("State ID cannot be empty for a STATE node."); return;
    }
    if (node.operationType === OperationTypeEnum.ON_EVENT && (!currentConfig.eventName || currentConfig.eventName.trim() === '')) {
        alert("Event Name cannot be empty for an ON_EVENT node."); return;
    }
    if ((node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA) && (!currentConfig.channelName || currentConfig.channelName.trim() === '')) {
        alert("Channel Name cannot be empty for SEND/RECEIVE_DATA nodes."); return;
    }
    if (node.operationType === OperationTypeEnum.RANDOM_NUMBER) {
        const min = parseFloat(String(currentConfig.defaultMin));
        const max = parseFloat(String(currentConfig.defaultMax));
        if (!isNaN(min) && !isNaN(max) && min >= max) {
            alert("Default Min must be less than Default Max for RANDOM_NUMBER node."); return;
        }
    }

    let configToSave = {...currentConfig};
    if (configToSave.stateId) configToSave.stateId = String(configToSave.stateId).trim();
    if (configToSave.eventName) configToSave.eventName = String(configToSave.eventName).trim();
    if (configToSave.channelName) configToSave.channelName = String(configToSave.channelName).trim();
    if (configToSave.frameWidth !== undefined) configToSave.frameWidth = Math.max(50, configToSave.frameWidth);
    if (configToSave.frameHeight !== undefined) configToSave.frameHeight = Math.max(50, configToSave.frameHeight);

    onSave(node.id, configToSave);
    onClose();
  };

  const hasSpecificConfigFields =
    node.operationType === OperationTypeEnum.VALUE_PROVIDER ||
    node.operationType === OperationTypeEnum.INPUT_GRAPH ||
    node.operationType === OperationTypeEnum.OUTPUT_GRAPH ||
    node.operationType === OperationTypeEnum.STATE ||
    node.operationType === OperationTypeEnum.ON_EVENT ||
    node.operationType === OperationTypeEnum.ITERATE ||
    node.operationType === OperationTypeEnum.RANDOM_NUMBER ||
    node.operationType === OperationTypeEnum.COMMENT ||
    node.operationType === OperationTypeEnum.FRAME ||
    node.operationType === OperationTypeEnum.SEND_DATA ||
    node.operationType === OperationTypeEnum.RECEIVE_DATA ||
    node.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER;


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="crystal-layer crystal-layer-4 p-6 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-sky-300">Configure: {node.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-white/10">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-500/60 scrollbar-track-transparent">
          {node.operationType === OperationTypeEnum.VALUE_PROVIDER && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Value</label>
              {renderValueProviderField('value')}
            </div>
          )}
          {(node.operationType === OperationTypeEnum.INPUT_GRAPH || node.operationType === OperationTypeEnum.OUTPUT_GRAPH) && renderGraphPortFields()}
          {node.operationType === OperationTypeEnum.STATE && renderStateNodeFields()}
          {node.operationType === OperationTypeEnum.ON_EVENT && renderOnEventNodeFields()}
          {node.operationType === OperationTypeEnum.RANDOM_NUMBER && renderRandomNumberNodeFields()}
          {node.operationType === OperationTypeEnum.COMMENT && renderCommentNodeFields()}
          {node.operationType === OperationTypeEnum.FRAME && renderFrameNodeFields()}
          {(node.operationType === OperationTypeEnum.SEND_DATA || node.operationType === OperationTypeEnum.RECEIVE_DATA) && renderChannelNodeFields()}
          {node.operationType === OperationTypeEnum.VISUAL_DICE_ROLLER && renderVisualDiceRollerFields()}
        
          {node.type === 'Molecular' && node.operationType !== OperationTypeEnum.ITERATE && !hasSpecificConfigFields && (
              <div className="mt-4 p-3 bg-[rgba(0,0,0,0.1)] rounded-md text-sm text-gray-300 border border-white/10">
                  <p>Molecular node configuration typically involves defining its sub-graph by adding INPUT_GRAPH and OUTPUT_GRAPH nodes within it and connecting them. The external ports of this Molecular Node will be derived from those special sub-graph nodes.</p>
              </div>
          )}
           {node.operationType === OperationTypeEnum.ITERATE && (
              <div className="mt-4 p-3 bg-[rgba(0,0,0,0.1)] rounded-md text-sm text-gray-300 border border-white/10">
                  <p>Iterate node's external ports (Collection, Max Iterations, Results, etc.) are fixed for data. Execution flow is managed by 'Start Iteration' (Exec In) and 'Iteration Completed' (Exec Out).</p>
                   <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1 mt-2">Default Max Iterations (if input port not connected)</label>
                      <input type="number" name="maxIterations" min="0"
                          value={currentConfig.maxIterations ?? 100} onChange={handleInputChange}
                          className={inputBaseClass} />
                  </div>
              </div>
          )}
          {!hasSpecificConfigFields && node.type === 'Atomic' && (
               <div className="mt-4 p-3 bg-[rgba(0,0,0,0.1)] rounded-md text-sm text-gray-300 border border-white/10">
                  <p>This node type does not have specific configuration options beyond its name and input port overrides (editable in the Inspector Panel if applicable).</p>
              </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="crystal-button px-4 py-2 text-sm">
            Cancel
          </button>
          {hasSpecificConfigFields && (
            <button onClick={handleSave}
                className="crystal-button primary-action px-4 py-2 text-sm flex items-center">
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeConfigModal;
