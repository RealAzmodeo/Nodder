import React, { useState, useCallback, useMemo } from 'react';
import { OperationTypeEnum, NodeId, MolecularNode, ComponentBlueprint, OutputPort, AnyNode, Connection, RegisteredAtomicNodeDefinition } from '../types';
import { nodeRegistryService } from '../services/NodeRegistryService';
import { componentRegistryService } from '../services/ComponentRegistryService';
import * as Icons from './Icons';
import { canConnect } from '../services/validationService';

interface NodeButtonProps {
  label: string;
  icon: JSX.Element;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  isCompatible?: boolean;
  isFilteredOut?: boolean;
}

const NodeButton: React.FC<NodeButtonProps> = ({
    label, icon, onClick, disabled, title,
    isCompatible, isFilteredOut
}) => {
    const buttonClasses = [
        "crystal-button node-button-list-item flex items-center justify-start w-full text-left",
        isCompatible && !isFilteredOut ? 'compatible-highlight-pulse' : '',
        isFilteredOut ? 'filtered-out-button' : ''
    ].filter(Boolean).join(' ');

    return (
      <button
        onClick={onClick}
        disabled={disabled || isFilteredOut}
        className={buttonClasses}
        title={title || `Add ${label} node`}
        aria-label={title || `Add ${label} node`}
      >
        {React.cloneElement(icon, { className: "w-4 h-4 mr-2 flex-shrink-0"})}
        <span className="truncate">{label}</span>
      </button>
    );
};

interface NodePaletteComponentProps {
  onAddNode: (type: OperationTypeEnum) => void;
  onAddBlueprintNode: (blueprintCreator: () => MolecularNode) => void;
  currentGraphId: NodeId | 'root';
  parentNodeOperationType?: OperationTypeEnum;
  isFocusModeActive: boolean;
  selectedNodeOutputsForAffinity: OutputPort[];
  allNodes: AnyNode[];
  allConnections: Connection[];
}

type PanelTab = 'atomics' | 'components' | 'arcanum';

const categoryIconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    "D&D: Core Mechanics": Icons.DndCoreCategoryIcon,
    "D&D: Character Attributes": Icons.DndCharacterCategoryIcon,
    "D&D: Equipment & Items": Icons.DndEquipmentCategoryIcon,
    "D&D: Spells & Abilities": Icons.DndSpellsCategoryIcon,
};

const NodePaletteComponent: React.FC<NodePaletteComponentProps> = ({
    onAddNode,
    onAddBlueprintNode,
    currentGraphId,
    parentNodeOperationType,
    isFocusModeActive,
    selectedNodeOutputsForAffinity,
    allNodes,
    allConnections,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('atomics');

  const isRootGraph = currentGraphId === 'root';
  const isInMolecularSubGraph = !isRootGraph && parentNodeOperationType === OperationTypeEnum.MOLECULAR;
  const isInIterateSubGraph = !isRootGraph && parentNodeOperationType === OperationTypeEnum.ITERATE;

  const allAtomicNodeDefinitions = useMemo(() => nodeRegistryService.getAllNodeDefinitions(), []);

  const atomicNodeDefinitionsByCategory = useMemo(() => {
    const grouped: Record<string, RegisteredAtomicNodeDefinition[]> = {};
    allAtomicNodeDefinitions
      .filter(def => !def.category.startsWith("D&D:"))
      .forEach(def => {
        if (!grouped[def.category]) {
          grouped[def.category] = [];
        }
        grouped[def.category].push(def);
      });
    Object.keys(grouped).forEach(category => grouped[category].sort((a,b) => a.name.localeCompare(b.name)));
    return grouped;
  }, [allAtomicNodeDefinitions]);

  const arcanumNodeDefinitionsByCategory = useMemo(() => {
    const grouped: Record<string, RegisteredAtomicNodeDefinition[]> = {};
    allAtomicNodeDefinitions
      .filter(def => def.category.startsWith("D&D:"))
      .forEach(def => {
        if (!grouped[def.category]) {
          grouped[def.category] = [];
        }
        grouped[def.category].push(def);
      });
    Object.keys(grouped).forEach(category => grouped[category].sort((a,b) => a.name.localeCompare(b.name)));
    return grouped;
  }, [allAtomicNodeDefinitions]);

  const componentBlueprints = useMemo(() => componentRegistryService.getAllComponentBlueprints(), []);

  const isNodeTypeDisabled = (opType: OperationTypeEnum): boolean => {
    if (opType === OperationTypeEnum.MOLECULAR || opType === OperationTypeEnum.ITERATE) return !isRootGraph;
    if (opType === OperationTypeEnum.INPUT_GRAPH || opType === OperationTypeEnum.OUTPUT_GRAPH) return !isInMolecularSubGraph;
    if (opType === OperationTypeEnum.LOOP_ITEM || opType === OperationTypeEnum.ITERATION_RESULT) return !isInIterateSubGraph;
    return false;
  };

  const getNodeTypeTitle = (opType: OperationTypeEnum, defaultTitle?: string): string => {
    if (isNodeTypeDisabled(opType)) {
        if (opType === OperationTypeEnum.MOLECULAR || opType === OperationTypeEnum.ITERATE) return "Complex nodes (Molecule, Iterate) can only be added to the Root Graph.";
        if (opType === OperationTypeEnum.INPUT_GRAPH || opType === OperationTypeEnum.OUTPUT_GRAPH) return "Graph I/O ports are for Molecular sub-graphs only.";
        if (opType === OperationTypeEnum.LOOP_ITEM || opType === OperationTypeEnum.ITERATION_RESULT) return "Loop/Iteration nodes are for Iterate sub-graphs only.";
    }
    return defaultTitle || `Add ${opType.toString().replace(/_/g, ' ')} node`;
  };

  const checkCompatibility = useCallback((potentialNodeOpType: OperationTypeEnum): boolean => {
    if (selectedNodeOutputsForAffinity.length === 0) return false;

    const nodeDef = nodeRegistryService.getNodeDefinition(potentialNodeOpType);
    if (!nodeDef) return false;

    const { inputPorts: potentialInputPorts } = nodeDef.portGenerator('temp-check-id');

    for (const selectedOutput of selectedNodeOutputsForAffinity) {
        for (const potentialInput of potentialInputPorts) {
            const { Succeeded } = canConnect(selectedOutput, potentialInput, potentialNodeOpType, allConnections || [], 'selected-node-on-canvas', 'potential-node-from-panel');
            if (Succeeded) return true;
        }
    }
    return false;
  }, [selectedNodeOutputsForAffinity, allConnections, allNodes]);

  const renderNodeCategory = (categoryName: string, nodesInCategory: RegisteredAtomicNodeDefinition[], isArcanumTab: boolean = false) => {
    const CategoryIcon = categoryIconMap[categoryName] || null;
    const headerTextColor = isArcanumTab ? 'text-amber-300' : 'text-on-glass-dim';
    return (
      <div key={categoryName} className="mb-3">
        <h3 className={`text-xs font-semibold ${headerTextColor} mb-2 sticky top-0 bg-[rgba(var(--accent-rgb),0.08)] py-1 z-10 tracking-wider uppercase backdrop-blur-sm rounded flex items-center`}>
            {CategoryIcon && <CategoryIcon className={`w-3.5 h-3.5 mr-1.5 ${isArcanumTab ? 'text-amber-400' : 'text-gray-400'}`} />}
            {categoryName}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {nodesInCategory.map(nodeDef => {
            const isCompatible = checkCompatibility(nodeDef.operationType);
            const isFilteredOut = isFocusModeActive && !isCompatible && selectedNodeOutputsForAffinity.length > 0;
            const NodeIcon = nodeDef.icon;
            return (
                <NodeButton
                    key={nodeDef.operationType}
                    label={nodeDef.name}
                    icon={<NodeIcon />}
                    onClick={() => { if (!isNodeTypeDisabled(nodeDef.operationType)) onAddNode(nodeDef.operationType); }}
                    disabled={isNodeTypeDisabled(nodeDef.operationType)}
                    title={getNodeTypeTitle(nodeDef.operationType, nodeDef.description)}
                    isCompatible={isCompatible}
                    isFilteredOut={isFilteredOut}
                />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700/50 scrollbar-track-transparent">
        <div className="flex-shrink-0 border-b border-[rgba(255,255,255,0.08)] mb-2 draggable-header-for-palette cursor-grab">
            <div className="flex space-x-1 p-1 bg-transparent rounded-t-md">
            <button
                onClick={() => setActiveTab('atomics')}
                className={`crystal-button flex-1 py-2 px-4 text-sm ${
                activeTab === 'atomics' ? 'active-tab-style' : ''
                }`}
            >
                Atomic Nodes
            </button>
            <button
                onClick={() => setActiveTab('arcanum')}
                className={`crystal-button flex-1 py-2 px-4 text-sm ${
                activeTab === 'arcanum' ? 'active-tab-style' : ''
                }`}
                style={activeTab === 'arcanum' ? { '--accent-rgb': 'var(--arcanum-accent-rgb)' } as React.CSSProperties : {}}
            >
                Arcanum Toolkit
            </button>
            <button
                onClick={() => setActiveTab('components')}
                className={`crystal-button flex-1 py-2 px-4 text-sm ${
                activeTab === 'components' ? 'active-tab-style' : ''
                }`}
            >
                Components
            </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-4 pr-1 p-1">
            {activeTab === 'atomics' && (
            Object.entries(atomicNodeDefinitionsByCategory)
            .sort(([catA], [catB]) => catA.localeCompare(catB))
            .map(([categoryName, nodesInCategory]) => renderNodeCategory(categoryName, nodesInCategory))
            )}

            {activeTab === 'arcanum' && (
            Object.entries(arcanumNodeDefinitionsByCategory)
            .sort(([catA], [catB]) => catA.localeCompare(catB))
            .map(([categoryName, nodesInCategory]) => renderNodeCategory(categoryName, nodesInCategory, true))
            )}

            {activeTab === 'components' && (
            <div>
                <h3 className="text-xs font-semibold text-on-glass-dim mb-2 sticky top-0 bg-[rgba(var(--accent-rgb),0.08)] py-1 z-10 tracking-wider uppercase backdrop-blur-sm rounded">Reusable Components</h3>
                <div className="grid grid-cols-1 gap-2">
                {componentBlueprints.map((bpEntry) => {
                    const isFilteredOut = isFocusModeActive && selectedNodeOutputsForAffinity.length > 0; // Simplified: components don't have direct port compatibility checks here.
                    const IconComp = bpEntry.icon || Icons.CubeTransparentIcon;
                    return (
                        <NodeButton
                        key={bpEntry.id || bpEntry.name}
                        label={bpEntry.name}
                        icon={<IconComp />}
                        onClick={() => { if (isRootGraph) onAddBlueprintNode(bpEntry.creatorFunction);}}
                        disabled={!isRootGraph}
                        title={isRootGraph ? (bpEntry.description || `Add ${bpEntry.name} component`) : "Components can only be added to the Root Graph."}
                        isFilteredOut={isFilteredOut}
                        />
                    );
                })}
                </div>
                {!isRootGraph && (
                    <p className="text-xs text-amber-400/80 italic mt-3 p-2 bg-amber-700/10 rounded-md border border-amber-600/20">
                        Component blueprints can only be added to the Root Graph. Navigate to the Root Graph to use them.
                    </p>
                )}
            </div>
            )}
        </div>
    </div>
  );
};

export default NodePaletteComponent;
