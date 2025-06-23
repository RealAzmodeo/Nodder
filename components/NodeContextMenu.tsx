
import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { NodeContextMenuState, OperationTypeEnum, LogicalCategoryEnum, PortTypeEnum, NodeId, OutputPort } from '../types';
import { createAtomicNode, createMolecularNode, createIterateNode } from '../services/nodeFactory'; 
import { NODE_TYPE_COLORS } from '../constants';
import * as Icons from './Icons'; 

interface NodeContextMenuProps {
  contextMenuState: NodeContextMenuState;
  onSelectNodeToAdd: (
    operationType: OperationTypeEnum,
    sourceNodeId: NodeId,
    sourcePortId: string,
    newNodeWorldPosition: { x: number; y: number } 
  ) => void;
  onClose: () => void;
  currentGraphId: NodeId | 'root';
  parentNodeOperationType?: OperationTypeEnum;
  panOffset: { x: number; y: number }; 
  zoomLevel: number; 
}

const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  contextMenuState,
  onSelectNodeToAdd,
  onClose,
  currentGraphId,
  parentNodeOperationType,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const compatibleNodes = useMemo(() => {
    if (!contextMenuState.sourceNode || !contextMenuState.sourcePort) {
      return [];
    }
    const { sourcePort } = contextMenuState;

    return Object.values(OperationTypeEnum)
      .map(opType => {
        let dummyNode;
        const dummyPosition = { x: 0, y: 0 }; 
        const dummyName = `Dummy ${opType}`;

        if (opType === OperationTypeEnum.MOLECULAR) {
          if (parentNodeOperationType === OperationTypeEnum.ITERATE || parentNodeOperationType === OperationTypeEnum.MOLECULAR || currentGraphId !== 'root') return null;
          dummyNode = createMolecularNode({ name: dummyName, operationType: opType, position: dummyPosition });
        } else if (opType === OperationTypeEnum.ITERATE) {
           if (currentGraphId !== 'root') return null;
          dummyNode = createIterateNode({ name: dummyName, operationType: opType, position: dummyPosition });
        } else if (opType === OperationTypeEnum.INPUT_GRAPH || opType === OperationTypeEnum.OUTPUT_GRAPH) {
          if (parentNodeOperationType !== OperationTypeEnum.MOLECULAR) return null;
           dummyNode = createAtomicNode({ name: dummyName, operationType: opType, position: dummyPosition });
        } else if (opType === OperationTypeEnum.LOOP_ITEM || opType === OperationTypeEnum.ITERATION_RESULT) {
          if (parentNodeOperationType !== OperationTypeEnum.ITERATE) return null;
          dummyNode = createAtomicNode({ name: dummyName, operationType: opType, position: dummyPosition });
        } else {
          dummyNode = createAtomicNode({ name: dummyName, operationType: opType, position: dummyPosition });
        }
        
        if (!dummyNode) return null;

        const compatibleInputPort = dummyNode.inputPorts.find(inputPort => {
          if (sourcePort.portType !== inputPort.portType) return false;
          if (sourcePort.portType === PortTypeEnum.DATA) {
            return sourcePort.category === LogicalCategoryEnum.ANY ||
                   inputPort.category === LogicalCategoryEnum.ANY ||
                   sourcePort.category === inputPort.category;
          }
          return true; 
        });

        return compatibleInputPort ? { opType, name: dummyNode.name.replace(' 1','').replace('Dummy ','') } : null;
      })
      .filter(Boolean) as { opType: OperationTypeEnum; name: string }[];
  }, [contextMenuState.sourceNode, contextMenuState.sourcePort, currentGraphId, parentNodeOperationType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  if (!contextMenuState.visible) return null;

  const getIconForOperationType = (opType: OperationTypeEnum): JSX.Element => {
    const iconName = opType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('') + 'Icon';
    const IconComponent = (Icons as any)[iconName] || Icons.CogIcon; 
    return <IconComponent className="w-4 h-4 mr-2 flex-shrink-0" />;
  };


  return (
    <div
      ref={menuRef}
      className="crystal-layer crystal-layer-4 absolute p-2 z-[100] max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/60 scrollbar-track-transparent"
      style={{ top: contextMenuState.screenY + 5, left: contextMenuState.screenX + 5, minWidth: '200px' }}
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="options-menu"
    >
      {compatibleNodes.length === 0 && (
        <div className="px-3 py-2 text-xs text-gray-400 italic">No compatible nodes found.</div>
      )}
      {compatibleNodes.map(({ opType, name }) => {
         const colorDetails = NODE_TYPE_COLORS[opType] || NODE_TYPE_COLORS[OperationTypeEnum.ASSIGN];
         const IconElement = getIconForOperationType(opType);
        return (
            <button
            key={opType}
            onClick={() => {
                onSelectNodeToAdd(
                    opType, 
                    contextMenuState.sourceNodeId, 
                    contextMenuState.sourcePortId, 
                    { x: contextMenuState.targetWorldX, y: contextMenuState.targetWorldY }
                );
            }}
            className={`crystal-button flex items-center w-full text-left px-3 py-2 text-sm rounded-md hover:${colorDetails.headerText} `}
            role="menuitem"
            title={`Add ${name} node and connect`}
            >
            {IconElement}
            <span className="truncate">{name}</span>
            </button>
        );
    })}
    </div>
  );
};

export default NodeContextMenu;
