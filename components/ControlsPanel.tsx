import React, { useState, useCallback, useMemo } from 'react';
import { OperationTypeEnum, NodeId, MolecularNode, ComponentBlueprint, QuickShelfItem, OutputPort, AnyNode, Connection, RegisteredAtomicNodeDefinition } from '../types';
import { nodeRegistryService } from '../services/NodeRegistryService'; 
import { componentRegistryService } from '../services/ComponentRegistryService'; 
import * as Icons from './Icons';
import { XMarkIcon } from './Icons';
// Removed canConnect import as compatibility checks are now in NodePaletteComponent

interface ControlsPanelProps {
  onAddNode: (type: OperationTypeEnum) => void; // Still needed for QuickShelf clicks
  onAddBlueprintNode: (blueprintCreator: () => MolecularNode) => void; // Still needed for QuickShelf clicks
  currentGraphId: NodeId | 'root'; // Still needed for QuickShelf clicks (disabling if not root)
  parentNodeOperationType?: OperationTypeEnum; // For QuickShelf logic if any
  quickShelfItems: QuickShelfItem[];
  addQuickShelfItem: (item: Omit<QuickShelfItem, 'id'> & {id?: string}) => void;
  removeQuickShelfItem: (itemId: string) => void;
  onInfoLog: (message: string) => void;
  // Focus mode props are no longer needed here as node buttons moved
  // isFocusModeActive: boolean;
  // selectedNodeOutputsForAffinity: OutputPort[];
  // allNodes: AnyNode[]; 
  // allConnections: Connection[]; 
}


const ControlsPanel: React.FC<ControlsPanelProps> = ({
    onAddNode,
    onAddBlueprintNode,
    currentGraphId,
    // parentNodeOperationType, // Kept for QuickShelf logic if needed in future
    quickShelfItems,
    addQuickShelfItem,
    removeQuickShelfItem,
    onInfoLog,
    // isFocusModeActive, // Removed
    // selectedNodeOutputsForAffinity, // Removed
    // allNodes, // Removed
    // allConnections, // Removed
}) => {
  const [isDraggingOverShelf, setIsDraggingOverShelf] = useState(false);
  const isRootGraph = currentGraphId === 'root';

  // isNodeTypeDisabled is only relevant for QuickShelf items now
   const isNodeTypeDisabled = (opType: OperationTypeEnum): boolean => {
    if (opType === OperationTypeEnum.MOLECULAR || opType === OperationTypeEnum.ITERATE) return !isRootGraph;
    // Other type checks (INPUT_GRAPH, etc.) are not relevant for QuickShelf items
    // as those nodes are unlikely to be common QuickShelf candidates.
    return false;
  };

   const getNodeTypeTitle = (opType: OperationTypeEnum, defaultTitle?: string): string => {
    if (isNodeTypeDisabled(opType)) {
        if (opType === OperationTypeEnum.MOLECULAR || opType === OperationTypeEnum.ITERATE) return "Complex nodes (Molecule, Iterate) can only be added to the Root Graph.";
    }
    return defaultTitle || `Add ${opType.toString().replace(/_/g, ' ')} node`;
  };


  const handleDropOnShelf = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOverShelf(false);
    // Dragging from NodePaletteComponent to QuickShelf is not implemented in this iteration.
    // This handler remains for potential future use if drag-and-drop is re-enabled from another source
    // or if items could be dragged *within* the shelf.
    // For now, adding to shelf from NodePalette would likely be via a context menu or button on palette items.
    onInfoLog("Drag-and-drop to Quick Shelf from floating palette is not yet fully implemented for direct add.");
  };

  const handleDragOverShelf = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    // event.dataTransfer.dropEffect = 'copy'; // Kept for future
    setIsDraggingOverShelf(true);
  };

  const handleDragLeaveShelf = () => {
    setIsDraggingOverShelf(false);
  };

  const handleQuickShelfItemClick = (item: QuickShelfItem) => {
    if (item.type === 'atomic' && item.operationType) {
        if (!isNodeTypeDisabled(item.operationType)) {
            onAddNode(item.operationType);
        } else {
            alert(getNodeTypeTitle(item.operationType));
        }
    } else if (item.type === 'blueprint' && item.blueprintName) {
        if (!isRootGraph) {
            alert("Component blueprints can only be added to the Root Graph.");
            return;
        }
        const blueprint = componentRegistryService.getComponentBlueprint(item.blueprintName);
        if (blueprint) {
            onAddBlueprintNode(blueprint.creatorFunction);
        }
    }
  };

  return (
    <div className="h-full flex flex-col">
        <div
            className={`p-2 border-b border-[rgba(255,255,255,0.08)] ${isDraggingOverShelf ? 'bg-sky-700/20 ring-1 ring-sky-400' : 'bg-transparent'}`}
            style={{minHeight: '80px'}} // Quick Shelf Area
            onDrop={handleDropOnShelf}
            onDragOver={handleDragOverShelf}
            onDragLeave={handleDragLeaveShelf}
            aria-label="Quick Shelf Drop Zone"
        >
            <h3 className="text-xs font-semibold text-on-glass-dim mb-1.5 tracking-wider uppercase">Quick Shelf</h3>
            {quickShelfItems.length === 0 ? (
                <p className="text-xs text-gray-500 italic text-center py-2">Add favorite nodes here later.</p>
            ) : (
                <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-500/50 scrollbar-track-transparent">
                    {quickShelfItems.map(item => {
                        const Icon = item.icon;
                        // Compatibility and filtering logic removed as buttons are not directly here.
                        // The QuickShelf items themselves might need disabling based on context.
                        const isDisabledByContext = item.operationType ? isNodeTypeDisabled(item.operationType) : (item.type === 'blueprint' ? !isRootGraph : false);
                        return (
                            <div key={item.id} className="relative group" title={`Add ${item.label} to canvas`}>
                                <button
                                    onClick={() => handleQuickShelfItemClick(item)}
                                    className={`crystal-button flex flex-col items-center p-1.5 rounded-md w-16 h-16 text-xs
                                        ${isDisabledByContext ? 'filtered-out-button' : ''}
                                    `}
                                    disabled={isDisabledByContext}
                                >
                                    <Icon className="w-5 h-5 mb-1 text-gray-300 group-hover:text-sky-300" />
                                    <span className="truncate w-full text-center text-[10px] text-gray-400 group-hover:text-sky-300">{item.label}</span>
                                </button>
                                <button
                                    onClick={() => removeQuickShelfItem(item.id)}
                                    className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title={`Remove ${item.label} from shelf`}
                                    aria-label={`Remove ${item.label} from shelf`}
                                >
                                    <XMarkIcon className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

      {/* Node Creation Tabs and Content Removed */}
      {/* Kept a placeholder for the rest of the panel content if any */}
      <div className="flex-grow p-2 space-y-2">
        <p className="text-xs text-center text-gray-500 italic mt-4">
            Node Palette is now in a floating panel.
            <br />
            This panel contains other tools.
        </p>
      </div>
    </div>
  );
};

export default ControlsPanel;